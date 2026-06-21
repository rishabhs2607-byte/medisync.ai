// MediSync AI — Clinical AI Health Intelligence Engine

export interface AIAnalysisResult {
  healthScore: number; // 0 - 100
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
  vitalsStatus: {
    heartRate: string;
    spo2: string;
    temperature: string;
    bloodPressure: string;
    glucose: string;
  };
  recommendations: string[];
  clinicalInsights: string;
}

export interface SymptomAssessment {
  possibleCauses: { disease: string; probability: number; details: string }[];
  severity: "Mild" | "Moderate" | "Severe" | "Emergency";
  clinicalAdvice: string;
  recommendedDepartment: string;
}

export interface ConsultationSummary {
  clinicalSummary: string;
  prescriptionsDraft: { name: string; dosage: string; frequency: string; duration: string }[];
  followUpActions: string[];
  referrals: string;
}

export const analyzeVitals = (
  heartRate: number,
  spo2: number,
  temp: number,
  systolic: number,
  diastolic: number,
  glucose: number
): AIAnalysisResult => {
  const recommendations: string[] = [];
  let scorePoints = 100;
  
  // SpO2 Analysis
  let spo2Status = "Normal";
  if (spo2 < 90) {
    spo2Status = "Critical Hypoxia";
    scorePoints -= 35;
    recommendations.push("Administer emergency oxygen immediately. Monitor lung sounds.");
  } else if (spo2 < 95) {
    spo2Status = "Mild Hypoxemia";
    scorePoints -= 10;
    recommendations.push("Ensure comfortable posture, practice deep breathing exercises.");
  }

  // Heart Rate Analysis
  let hrStatus = "Normal";
  if (heartRate > 130) {
    hrStatus = "Tachycardia (Critical)";
    scorePoints -= 25;
    recommendations.push("Rest immediately. Avoid stimulants. Apply cool compress.");
  } else if (heartRate > 100) {
    hrStatus = "Elevated (Tachycardia)";
    scorePoints -= 8;
    recommendations.push("Hydrate well, check for signs of fever or physical overexertion.");
  } else if (heartRate < 45 && heartRate > 0) {
    hrStatus = "Bradycardia (Critical)";
    scorePoints -= 25;
    recommendations.push("Assess responsiveness. Check pulse points. Prepare emergency cardiac support.");
  } else if (heartRate < 60 && heartRate > 0) {
    hrStatus = "Bradycardia (Mild)";
    scorePoints -= 5;
    recommendations.push("Review medications for beta-blockers. Monitor for dizziness.");
  }

  // Temperature Analysis
  let tempStatus = "Normal";
  if (temp > 39.0) {
    tempStatus = "Hyperpyrexia (High Fever)";
    scorePoints -= 15;
    recommendations.push("Administer antipyretics (acetaminophen/ibuprofen) as prescribed. Hydrate.");
  } else if (temp > 37.5) {
    tempStatus = "Low Grade Fever";
    scorePoints -= 5;
    recommendations.push("Monitor temperature hourly. Dress in light layers.");
  } else if (temp < 35.0) {
    tempStatus = "Hypothermia";
    scorePoints -= 15;
    recommendations.push("Apply external warming blankets. Warm oral fluids if patient is conscious.");
  }

  // Blood Pressure Analysis
  let bpStatus = "Normal";
  if (systolic >= 160 || diastolic >= 100) {
    bpStatus = "Stage 2 Hypertension (Severe)";
    scorePoints -= 20;
    recommendations.push("Requires urgent medical evaluation. Limit sodium. Review BP meds.");
  } else if (systolic >= 140 || diastolic >= 90) {
    bpStatus = "Stage 1 Hypertension";
    scorePoints -= 10;
    recommendations.push("Adopt DASH diet. Schedule lifestyle evaluation. Reduce stress.");
  } else if (systolic < 90 || diastolic < 60) {
    bpStatus = "Hypotension";
    scorePoints -= 10;
    recommendations.push("Increase fluid intake, rise slowly from lying down position.");
  }

  // Glucose Analysis
  let glucStatus = "Normal";
  if (glucose > 180) {
    glucStatus = "Hyperglycemia (Severe)";
    scorePoints -= 15;
    recommendations.push("Check urine for ketones. Insure insulin adherence. Drink plenty of water.");
  } else if (glucose > 125) {
    glucStatus = "Pre-Diabetes / Elevated";
    scorePoints -= 5;
    recommendations.push("Limit carbohydrate and sugar intakes. Monitor active physical minutes.");
  } else if (glucose < 70) {
    glucStatus = "Hypoglycemia (Critical)";
    scorePoints -= 20;
    recommendations.push("Consume 15g of fast-acting sugar (fruit juice, candy) and retest in 15 mins.");
  }

  // Deduce Risk Level
  let riskLevel: AIAnalysisResult["riskLevel"] = "Low";
  if (scorePoints < 50) riskLevel = "Critical";
  else if (scorePoints < 75) riskLevel = "High";
  else if (scorePoints < 90) riskLevel = "Moderate";

  // Build Clinical Insights Summary
  let clinicalInsights = "All tracked vitals are within normal clinical thresholds. Continue routine daily monitoring.";
  if (riskLevel === "Critical") {
    clinicalInsights = "Multiple vital anomalies detected. High likelihood of acute clinical distress. Immediate physician notification recommended.";
  } else if (riskLevel === "High") {
    clinicalInsights = "Vitals reflect moderate to high abnormalities. Needs scheduled consultation check and potential medicine adjustment.";
  } else if (riskLevel === "Moderate") {
    clinicalInsights = "Mild vital elevations. Recommend checking device pairing, resting for 10 minutes, and taking secondary readings.";
  }

  return {
    healthScore: Math.max(10, scorePoints),
    riskLevel,
    vitalsStatus: {
      heartRate: hrStatus,
      spo2: spo2Status,
      temperature: `${temp.toFixed(1)}°C (${tempStatus})`,
      bloodPressure: `${systolic}/${diastolic} mmHg (${bpStatus})`,
      glucose: `${glucose} mg/dL (${glucStatus})`
    },
    recommendations: recommendations.length > 0 ? recommendations : ["Maintain current medication schedule", "Log physical exercise metrics"],
    clinicalInsights
  };
};

export const assessSymptoms = (symptoms: string): SymptomAssessment => {
  const normalized = symptoms.toLowerCase();
  
  if (normalized.includes("chest pain") || normalized.includes("heart squeezing") || normalized.includes("left arm pain")) {
    return {
      possibleCauses: [
        { disease: "Acute Coronary Syndrome (Myocardial Infarction)", probability: 85, details: "Blockage of blood flow to the cardiac muscle demanding rapid critical opening." },
        { disease: "Angina Pectoris", probability: 60, details: "Temporary cardiac ischemia secondary to physical stress or occlusion." }
      ],
      severity: "Emergency",
      clinicalAdvice: "Call emergency medical services immediately. Take chewable Aspirin if advised by dispatcher. Sit upright and avoid exertion.",
      recommendedDepartment: "Cardiology / Emergency Medicine"
    };
  }

  if (normalized.includes("headache") && (normalized.includes("blurry vision") || normalized.includes("dizziness"))) {
    return {
      possibleCauses: [
        { disease: "Hypertensive Crisis", probability: 75, details: "Severe spike in blood pressure that can lead to stroke or organ failure." },
        { disease: "Migraine with Aura", probability: 45, details: "Neurological headache event accompanied by visual flashes and sensory shifts." }
      ],
      severity: "Severe",
      clinicalAdvice: "Check your blood pressure immediately using your paired cuffs. Rest in a dark, quiet room. Seek clinical review if BP exceeds 160 systolic.",
      recommendedDepartment: "Internal Medicine / Neurology"
    };
  }

  if (normalized.includes("cough") || normalized.includes("fever") || normalized.includes("shortness of breath")) {
    return {
      possibleCauses: [
        { disease: "Pneumonia / Bronchitis", probability: 70, details: "Infection inflaming air sacs in one or both lungs, filling them with fluid." },
        { disease: "Upper Respiratory Tract Infection (URTI)", probability: 65, details: "Viral infection affecting the nose, throat, sinuses, or larynx." }
      ],
      severity: "Moderate",
      clinicalAdvice: "Monitor SpO2 readings every 4 hours. Keep hydrated, rest, and utilize a steam humidifier. If oxygen drops below 92%, schedule immediate consult.",
      recommendedDepartment: "Pulmonology / Family Medicine"
    };
  }

  // Default Symptom Response
  return {
    possibleCauses: [
      { disease: "Generalized Viral / Inflammation Response", probability: 55, details: "Nonspecific systemic response to minor viral/bacterial infections or stress." },
      { disease: "Physical Fatigue / Dehydration", probability: 40, details: "Decline in physical efficiency due to fluid deficits or poor sleep architecture." }
    ],
    severity: "Mild",
    clinicalAdvice: "Ensure 8-10 glasses of water intake. Track your symptoms for the next 24 hours. Log vitals in the MediSync Portal.",
    recommendedDepartment: "General Medicine"
  };
};

export const summarizeConsultation = (transcript: string): ConsultationSummary => {
  const normalized = transcript.toLowerCase();
  const medicinesDraft: ConsultationSummary["prescriptionsDraft"] = [];

  // Parse potential medicines mentioned
  if (normalized.includes("lisinopril") || normalized.includes("blood pressure")) {
    medicinesDraft.push({ name: "Lisinopril", dosage: "10mg", frequency: "Once daily (Morning)", duration: "30 Days" });
  }
  if (normalized.includes("metformin") || normalized.includes("diabetes") || normalized.includes("sugar")) {
    medicinesDraft.push({ name: "Metformin", dosage: "500mg", frequency: "Twice daily (with meals)", duration: "60 Days" });
  }
  if (normalized.includes("aspirin")) {
    medicinesDraft.push({ name: "Aspirin (Low Dose)", dosage: "81mg", frequency: "Once daily", duration: "30 Days" });
  }
  if (normalized.includes("amoxicillin") || normalized.includes("antibiotic")) {
    medicinesDraft.push({ name: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", duration: "7 Days" });
  }

  if (medicinesDraft.length === 0) {
    medicinesDraft.push({ name: "Paracetamol", dosage: "500mg", frequency: "As needed for fever/pain", duration: "5 Days" });
  }

  return {
    clinicalSummary: `Patient presented for consultation regarding vitals logs. Reviewed recent trends. Discussed dietary habits, exercise, and importance of logging daily sensor readouts via the ESP32 transmitter. Heart rhythm appears stable with intermittent elevations.`,
    prescriptionsDraft: medicinesDraft,
    followUpActions: [
      "Check vitals every morning at 8:00 AM.",
      "Limit sodium intake to under 2,000 mg per day.",
      "Follow up in 2 weeks via telemedicine portal for blood sugar verification."
    ],
    referrals: "None requested. Patient to continue primary care alignment."
  };
};
