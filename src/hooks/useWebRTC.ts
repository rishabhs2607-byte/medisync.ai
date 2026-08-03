// useWebRTC.ts — Production WebRTC Hook for MediSync AI Telemedicine
// Handles: getUserMedia, RTCPeerConnection, ICE exchange via Firestore, offer/answer SDP

import { useRef, useState, useCallback, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db as firestoreDb, rtdb } from "@/services/firebase";
import {
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  push as rtdbPush,
  onValue as rtdbOnValue,
  update as rtdbUpdate,
} from "firebase/database";

// ─── STUN / TURN CONFIG ──────────────────────────────────────────────────────
// Uses Google free STUN (works on same network / simple NAT)
// Add TURN credentials below for cross-network (different ISP) support
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
  // OpenRelay Public TURN server to guarantee cross-network connectivity
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export type CallStatus =
  | "idle"
  | "requesting-media"
  | "creating-offer"
  | "waiting-for-doctor"
  | "joining"
  | "connecting"
  | "connected"
  | "ended"
  | "error";

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  hasRemote: boolean;
  callStatus: CallStatus;
  error: string | null;
  roomId: string | null;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  startCall: (patientId: string, patientName: string, existingRoomId?: string) => Promise<string>;
  joinCall: (roomId: string, doctorId: string, doctorName: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => Promise<void>;
  retryCall: () => void;
}

export const useWebRTC = (): UseWebRTCReturn => {
  // ─── STATE & REFS ────────────────────────────────────────────────────────
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);

  // ─── CLEANUP ─────────────────────────────────────────────────────────────
  const cleanup = useCallback(async () => {
    unsubscribersRef.current.forEach((u) => u());
    unsubscribersRef.current = [];

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setRemoteStream(null);
  }, []);



  // ─── USER MEDIA ────────────────────────────────────────────────────────
  const getUserMedia = async (): Promise<MediaStream> => {
  setCallStatus("requesting-media");
  try {
    // Preferred constraints (ideal resolution)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCamOn(true);
      setIsMicOn(true);
      return stream;
  } catch (err: any) {
    // Fallback to minimal constraints if preferred fail
    try {
      const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = fallback;
      setLocalStream(fallback);
      setIsCamOn(true);
      setIsMicOn(true);
      return fallback;
    } catch (fallbackErr: any) {
      const msg =
        fallbackErr.name === "NotAllowedError"
          ? "Camera/microphone permission denied. Please allow access in browser settings."
          : fallbackErr.name === "NotFoundError"
          ? "No camera or microphone found on this device."
          : `Media access failed: ${fallbackErr.message}`;
      setError(msg);
      setCallStatus("error");
      throw new Error(msg);
    }
  }
};

  // Helper to clear subcollection
  const clearCollection = async (collRef: any) => {
    try {
      const snap = await getDocs(collRef);
      const promises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(promises);
    } catch (e) {}
  };

  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const addOrQueueIceCandidate = async (candidateData: RTCIceCandidateInit) => {
    if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidateData));
      } catch (e) {}
    } else {
      pendingCandidatesRef.current.push(candidateData);
    }
  };

  const processPendingIceCandidates = async () => {
    if (!pcRef.current || !pcRef.current.remoteDescription) return;
    const candidates = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const cand of candidates) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {}
    }
  };

  // ─── PEER CONNECTION ─────────────────────────────────────────────────────
  const createPeerConnection = (
    stream: MediaStream,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) onIceCandidate(event.candidate);
    };

    pc.ontrack = (event) => {
      console.log("WebRTC ontrack received:", event.track.kind, event.track.id);
      const incomingStream = event.streams && event.streams[0] ? event.streams[0] : null;

      setRemoteStream((prev) => {
        if (incomingStream) {
          return new MediaStream(incomingStream.getTracks());
        }
        const currentTracks = prev ? prev.getTracks() : [];
        const existingIds = currentTracks.map((t) => t.id);
        if (!existingIds.includes(event.track.id)) {
          return new MediaStream([...currentTracks, event.track]);
        }
        return new MediaStream(currentTracks);
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setCallStatus("connected");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        console.warn("WebRTC connection state changed:", pc.connectionState);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCallStatus("connected");
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // ─── START CALL (PATIENT) ────────────────────────────────────────────────
  const startCall = useCallback(
    async (patientId: string, patientName: string, existingRoomId?: string): Promise<string> => {
      setError(null);
      pendingCandidatesRef.current = [];
      const stream = await getUserMedia();

      const roomRef = existingRoomId ? doc(firestoreDb, "rooms", existingRoomId) : doc(collection(firestoreDb, "rooms"));
      const newRoomId = roomRef.id;

      const callerCandidates = collection(roomRef, "callerCandidates");
      const calleeCandidates = collection(roomRef, "calleeCandidates");
      await clearCollection(callerCandidates);
      await clearCollection(calleeCandidates);

      const pc = createPeerConnection(stream, async (candidate) => {
        const candObj = candidate.toJSON();
        try {
          await addDoc(callerCandidates, candObj);
        } catch (e) {}
        if (rtdb) {
          try {
            await rtdbPush(rtdbRef(rtdb, `signaling_rooms/${newRoomId}/callerCandidates`), candObj);
          } catch (e) {}
        }
      });

      setCallStatus("creating-offer");

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const offerData = { type: offer.type, sdp: offer.sdp };
      try {
        await setDoc(
          roomRef,
          {
            roomId: newRoomId,
            patientId,
            patientName,
            status: "waiting",
            offer: offerData,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {}

      if (rtdb) {
        try {
          await rtdbSet(rtdbRef(rtdb, `signaling_rooms/${newRoomId}`), {
            roomId: newRoomId,
            patientId,
            patientName,
            status: "waiting",
            offer: offerData,
          });
        } catch (e) {}
      }

      setRoomId(newRoomId);
      setCallStatus("waiting-for-doctor");

      let isSettingRemote = false;

      const handleAnswerSdp = async (answerObj: any) => {
        if (answerObj && pc.signalingState === "have-local-offer" && !isSettingRemote) {
          isSettingRemote = true;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answerObj));
            await processPendingIceCandidates();
            setCallStatus("connecting");
          } catch (e) {
            console.warn("setRemoteDescription error:", e);
          } finally {
            isSettingRemote = false;
          }
        }
      };

      const unsub1 = onSnapshot(
        roomRef,
        (snap) => {
          const data = snap.data();
          if (data?.answer) handleAnswerSdp(data.answer);
        },
        () => {}
      );

      let unsubRtdb1 = () => {};
      if (rtdb) {
        const answerRef = rtdbRef(rtdb, `signaling_rooms/${newRoomId}/answer`);
        unsubRtdb1 = rtdbOnValue(answerRef, (snap) => {
          if (snap.exists()) handleAnswerSdp(snap.val());
        });
      }

      const unsub2 = onSnapshot(
        calleeCandidates,
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              addOrQueueIceCandidate(change.doc.data() as RTCIceCandidateInit);
            }
          });
        },
        () => {}
      );

      let unsubRtdb2 = () => {};
      if (rtdb) {
        const calleeCandRef = rtdbRef(rtdb, `signaling_rooms/${newRoomId}/calleeCandidates`);
        unsubRtdb2 = rtdbOnValue(calleeCandRef, (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            Object.values(val).forEach((cand: any) => {
              if (cand && cand.candidate) addOrQueueIceCandidate(cand as RTCIceCandidateInit);
            });
          }
        });
      }

      unsubscribersRef.current.push(unsub1, unsub2, unsubRtdb1, unsubRtdb2);
      return newRoomId;
    },
    []
  );

  // ─── JOIN CALL (DOCTOR) ──────────────────────────────────────────────────
  const joinCall = useCallback(
    async (targetRoomId: string, doctorId: string, doctorName: string): Promise<void> => {
      setError(null);
      setCallStatus("joining");
      pendingCandidatesRef.current = [];

      const stream = await getUserMedia();
      const roomRef = doc(firestoreDb, "rooms", targetRoomId);

      let roomData: any = null;
      try {
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) roomData = roomSnap.data();
      } catch (e) {}

      if (!roomData && rtdb) {
        try {
          const rtdbSnap = await rtdbGet(rtdbRef(rtdb, `signaling_rooms/${targetRoomId}`));
          if (rtdbSnap.exists()) roomData = rtdbSnap.val();
        } catch (e) {}
      }

      if (!roomData || !roomData.offer) {
        setError("Consultation room offer not found.");
        setCallStatus("error");
        return;
      }

      if (roomData.status === "ended") {
        setError("This consultation has already ended.");
        setCallStatus("error");
        return;
      }

      const calleeCandidates = collection(roomRef, "calleeCandidates");
      await clearCollection(calleeCandidates);

      const pc = createPeerConnection(stream, async (candidate) => {
        const candObj = candidate.toJSON();
        try {
          await addDoc(calleeCandidates, candObj);
        } catch (e) {}
        if (rtdb) {
          try {
            await rtdbPush(rtdbRef(rtdb, `signaling_rooms/${targetRoomId}/calleeCandidates`), candObj);
          } catch (e) {}
        }
      });

      await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));
      await processPendingIceCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const answerObj = { type: answer.type, sdp: answer.sdp };
      try {
        await updateDoc(roomRef, {
          answer: answerObj,
          doctorId,
          doctorName,
          status: "active",
        });
      } catch (e) {}

      if (rtdb) {
        try {
          await rtdbUpdate(rtdbRef(rtdb, `signaling_rooms/${targetRoomId}`), {
            answer: answerObj,
            doctorId,
            doctorName,
            status: "active",
          });
        } catch (e) {}
      }

      setRoomId(targetRoomId);
      setCallStatus("connecting");

      const callerCandidates = collection(roomRef, "callerCandidates");
      const unsub = onSnapshot(callerCandidates, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            addOrQueueIceCandidate(change.doc.data() as RTCIceCandidateInit);
          }
        });
      });

      unsubscribersRef.current.push(unsub);
    },
    []
  );

  // ─── END CALL ─────────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    if (roomId) {
      try {
        await updateDoc(doc(firestoreDb, "rooms", roomId), { status: "ended" });
      } catch (e) {}
    }
    await cleanup();
    setCallStatus("ended");
    setRoomId(null);
  }, [roomId, cleanup]);

  // ─── TOGGLE MIC ───────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, []);

  // ─── TOGGLE CAMERA ────────────────────────────────────────────────────────
  const toggleCam = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
      }
    }
  }, []);

  // ─── TOGGLE SCREEN SHARE ──────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (!pcRef.current) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);

        screenTrack.onended = async () => {
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (sender && camTrack) await sender.replaceTrack(camTrack);
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (e) {
        console.warn("Screen share failed:", e);
      }
    } else {
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender && camTrack) await sender.replaceTrack(camTrack);
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }
  }, [isScreenSharing]);

  // ─── TIMEOUT & REMOTE FLAG ────────────────────────────────────────────────
  const hasRemote = !!remoteStream;

  useEffect(() => {
    if (callStatus === "connecting") {
      const timeout = setTimeout(() => {
        if (!remoteStream) {
          setCallStatus("error");
          setError("Connection timeout – no remote stream");
        }
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [callStatus, remoteStream]);

  // ─── RETRY CALL ───────────────────────────────────────────────────────────
  const retryCall = useCallback(() => {
    cleanup();
    setCallStatus("idle");
    setError(null);
    // Caller component should invoke startCall/joinCall again based on role
  }, [cleanup]);

  // ─── RETURN ───────────────────────────────────────────────────────────────
  return {
    localStream,
    remoteStream,
    hasRemote,
    callStatus,
    error,
    roomId,
    isMicOn,
    isCamOn,
    isScreenSharing,
    startCall,
    joinCall,
    endCall,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    retryCall,
  };
};
