// useWebRTC.ts — Production WebRTC Hook for MediSync AI Telemedicine
// Handles: getUserMedia, RTCPeerConnection, ICE exchange via Firestore, offer/answer SDP

import { useRef, useState, useCallback, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db as firestoreDb } from "@/services/firebase";

// ─── STUN / TURN CONFIG ──────────────────────────────────────────────────────
// Uses Google free STUN (works on same network / simple NAT)
// Add TURN credentials below for cross-network (different ISP) support
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
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
  }
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
}

export function useWebRTC(): UseWebRTCReturn {
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

  // Cleanup all listeners & PC on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ─── GET USER MEDIA ────────────────────────────────────────────────────────
  const getUserMedia = async (): Promise<MediaStream> => {
    setCallStatus("requesting-media");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      const msg =
        err.name === "NotAllowedError"
          ? "Camera/microphone permission denied. Please allow access in browser settings."
          : err.name === "NotFoundError"
          ? "No camera or microphone found on this device."
          : `Media access failed: ${err.message}`;
      setError(msg);
      setCallStatus("error");
      throw new Error(msg);
    }
  };

  // ─── CREATE PEER CONNECTION ────────────────────────────────────────────────
  const createPeerConnection = (stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks to PC
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Collect remote tracks
    const remote = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
      setRemoteStream(remote);
      // Guarantee UI unlocks when video actually arrives
      setCallStatus("connected");
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setCallStatus("connected");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setCallStatus("ended");
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCallStatus("connected");
      }
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        setCallStatus("ended");
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // ─── START CALL (PATIENT = CALLER) ────────────────────────────────────────
  const startCall = useCallback(
    async (patientId: string, patientName: string, existingRoomId?: string): Promise<string> => {
      setError(null);
      const stream = await getUserMedia();
      const pc = createPeerConnection(stream);

      setCallStatus("creating-offer");

      // Use existing or create new Firestore room reference
      const roomRef = existingRoomId
        ? doc(firestoreDb, "rooms", existingRoomId)
        : doc(collection(firestoreDb, "rooms"));
      const newRoomId = roomRef.id;

      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Write room to Firestore
      await setDoc(roomRef, {
        roomId: newRoomId,
        patientId,
        patientName,
        status: "waiting",
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: serverTimestamp(),
      }, { merge: true });

      setRoomId(newRoomId);
      setCallStatus("waiting-for-doctor");

      // Send caller ICE candidates to Firestore
      const callerCandidates = collection(roomRef, "callerCandidates");
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(callerCandidates, event.candidate.toJSON());
        }
      };

      // Listen for doctor's answer SDP
      const unsub1 = onSnapshot(roomRef, async (snap) => {
        const data = snap.data();
        if (data?.answer && pc.signalingState !== "stable") {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallStatus("connecting");
          } catch (e) {
            console.warn("setRemoteDescription error:", e);
          }
        }
      });

      // Listen for doctor's ICE candidates
      const calleeCandidates = collection(roomRef, "calleeCandidates");
      const unsub2 = onSnapshot(calleeCandidates, (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            } catch (e) {
              console.warn("addIceCandidate error:", e);
            }
          }
        });
      });

      unsubscribersRef.current.push(unsub1, unsub2);
      return newRoomId;
    },
    []
  );

  // ─── JOIN CALL (DOCTOR = CALLEE) ──────────────────────────────────────────
  const joinCall = useCallback(
    async (targetRoomId: string, doctorId: string, doctorName: string): Promise<void> => {
      setError(null);
      setCallStatus("joining");

      const stream = await getUserMedia();
      const pc = createPeerConnection(stream);

      const roomRef = doc(firestoreDb, "rooms", targetRoomId);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        setError("Consultation room not found.");
        setCallStatus("error");
        return;
      }

      const roomData = roomSnap.data();
      if (roomData.status === "ended") {
        setError("This consultation has already ended.");
        setCallStatus("error");
        return;
      }

      // Set remote offer
      await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Write answer + doctor info to room
      await updateDoc(roomRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        doctorId,
        doctorName,
        status: "active",
      });

      setRoomId(targetRoomId);
      setCallStatus("connecting");

      // Send callee ICE candidates
      const calleeCandidates = collection(roomRef, "calleeCandidates");
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(calleeCandidates, event.candidate.toJSON());
        }
      };

      // Listen for patient's ICE candidates
      const callerCandidates = collection(roomRef, "callerCandidates");
      const unsub = onSnapshot(callerCandidates, (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            } catch (e) {
              console.warn("addIceCandidate error:", e);
            }
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
        const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);

        screenTrack.onended = async () => {
          // Auto-restore camera when screen share stops
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

  return {
    localStream,
    remoteStream,
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
  };
}
