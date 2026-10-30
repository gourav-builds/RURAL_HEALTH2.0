/**
 * Structured Clinical AI Extraction Engine with Field-Level Confidence.
 * Extracts chief complaint, history, vitals, medications, and diagnosis plan
 * from unstructured clinical voice notes or OCR paper text.
 *
 * SAFETY INVARIANT: Every field defaults to unverified until explicitly
 * approved or modified by a licensed clinician.
 */

export interface FieldExtraction<T> {
  value: T;
  confidence: number; // 0.0 - 1.0
  verified: boolean;
  edited?: boolean;
}

export interface ExtractedMedication {
  drug: string;
  dosage?: string;
  frequency?: string;
  confidence: number;
  verified: boolean;
}

export interface StructuredClinicalData {
  chiefComplaint: FieldExtraction<string>;
  symptoms: FieldExtraction<string[]>;
  vitals: {
    bloodPressure?: FieldExtraction<string>;
    heartRate?: FieldExtraction<number>;
    temperature?: FieldExtraction<number>;
    spO2?: FieldExtraction<number>;
    respiratoryRate?: FieldExtraction<number>;
  };
  history: FieldExtraction<string>;
  medications: ExtractedMedication[];
  assessment: FieldExtraction<string>;
  plan: FieldExtraction<string>;
  overallConfidence: number;
  isAllVerified: boolean;
}

/**
 * Extracts structured clinical JSON from raw text with confidence scores
 */
export function extractStructuredClinicalEntities(rawText: string): StructuredClinicalData {
  const text = rawText.trim();
  if (!text) {
    return createEmptyStructuredData();
  }

  // 1. Extract Vitals
  const bpMatch = text.match(/\b(?:bp|blood pressure)[:\s]*([0-9]{2,3}\s*\/\s*[0-9]{2,3})\s*(?:mmhg)?\b/i)
    || text.match(/\b([1-2]?[0-9]{2}\s*\/\s*[6-9][0-9])\s*(?:mmhg)?\b/i);

  const hrMatch = text.match(/\b(?:hr|pulse|heart rate)[:\s]*([0-9]{2,3})\s*(?:bpm)?\b/i);
  const tempMatch = text.match(/\b(?:temp|temperature)[:\s]*([0-9]{2,3}(?:\.[0-9])?)\s*(?:°?[cf])?\b/i);
  const spo2Match = text.match(/\b(?:spo2|oxygen|o2\s*sat)[:\s]*([0-9]{2,3})\s*%?\b/i);
  const rrMatch = text.match(/\b(?:rr|resp rate|respiratory rate)[:\s]*([0-9]{1,2})\s*(?:\/min|bpm)?\b/i);

  // 2. Extract Chief Complaint
  let chiefComplaint = '';
  let ccConfidence = 0.6;
  const ccMatch = text.match(/(?:chief complaint|c\/o|complaint|presents with|complaining of)[:\s]*([^.\n]+)/i);
  if (ccMatch && ccMatch[1].trim()) {
    chiefComplaint = ccMatch[1].trim();
    ccConfidence = 0.95;
  } else {
    // Fallback: first sentence or line
    const firstLine = text.split('\n')[0].replace(/^\[[^\]]+\]\s*/, '').trim();
    chiefComplaint = firstLine.slice(0, 120);
    ccConfidence = 0.72;
  }

  // 3. Extract Symptoms
  const symptomKeywords = [
    'fever', 'cough', 'chills', 'fatigue', 'headache', 'chest pain',
    'shortness of breath', 'dyspnea', 'nausea', 'vomiting', 'diarrhea',
    'abdominal pain', 'dizziness', 'rash', 'joint pain', 'sore throat',
    'body ache', 'weakness', 'loss of appetite', 'palpitations', 'back pain'
  ];
  const detectedSymptoms: string[] = [];
  const lowerText = text.toLowerCase();
  symptomKeywords.forEach(s => {
    if (lowerText.includes(s) && !detectedSymptoms.includes(s)) {
      detectedSymptoms.push(s);
    }
  });

  // 4. Extract Medications
  const commonMeds = [
    'paracetamol', 'amoxicillin', 'azithromycin', 'metformin', 'amlodipine',
    'losartan', 'omeprazole', 'pantoprazole', 'ibuprofen', 'cetirizine',
    'ciprofloxacin', 'doxycycline', 'metronidazole', 'salbutamol', 'atorvastatin',
    'ors', 'zinc', 'iron', 'folic acid', 'paracetamol'
  ];
  const detectedMeds: ExtractedMedication[] = [];
  commonMeds.forEach(med => {
    const regex = new RegExp(`\\b${med}\\b(?:\\s+([0-9]+(?:\\s*mg|\\s*g|\\s*ml)?))?(?:\\s+([0-9]+x[0-9]+|tid|bid|od|sos|once daily|twice daily))?`, 'i');
    const match = text.match(regex);
    if (match) {
      detectedMeds.push({
        drug: capitalize(med),
        dosage: match[1]?.trim() || undefined,
        frequency: match[2]?.trim() || undefined,
        confidence: match[1] ? 0.92 : 0.82,
        verified: false,
      });
    }
  });

  // Also check for prescription formatted lines (e.g. "Rx: Tab ...")
  const rxLines = text.match(/(?:rx|tabs?|cap|syrup)[:\s]*([^\n]+)/gi);
  if (rxLines) {
    rxLines.forEach(rx => {
      const clean = rx.replace(/^(?:rx|tabs?|cap|syrup)[:\s]*/i, '').trim();
      if (clean && !detectedMeds.some(m => clean.toLowerCase().includes(m.drug.toLowerCase()))) {
        detectedMeds.push({
          drug: clean,
          confidence: 0.85,
          verified: false,
        });
      }
    });
  }

  // 5. Extract Assessment / Diagnosis
  let assessment = '';
  let assessmentConf = 0.65;
  const assessMatch = text.match(/(?:assessment|diagnosis|impression|dx)[:\s]*([^.\n]+)/i);
  if (assessMatch && assessMatch[1].trim()) {
    assessment = assessMatch[1].trim();
    assessmentConf = 0.94;
  } else if (detectedSymptoms.length > 0) {
    assessment = `Suspected ${detectedSymptoms.slice(0, 2).join(' with ')} - pending differential evaluation`;
    assessmentConf = 0.68;
  }

  // 6. Extract Plan / Recommendations
  let plan = '';
  let planConf = 0.65;
  const planMatch = text.match(/(?:plan|treatment plan|recommendations|advice|rx plan)[:\s]*([^]+?)(?=\n\n|$)/i);
  if (planMatch && planMatch[1].trim()) {
    plan = planMatch[1].trim();
    planConf = 0.93;
  } else if (detectedMeds.length > 0) {
    plan = `Initiate medications: ${detectedMeds.map(m => m.drug).join(', ')}. Review in 3-5 days.`;
    planConf = 0.74;
  }

  // Calculate overall confidence average
  const confScores = [ccConfidence, assessmentConf, planConf];
  if (bpMatch) confScores.push(0.95);
  if (detectedSymptoms.length > 0) confScores.push(0.9);
  if (detectedMeds.length > 0) confScores.push(0.88);
  const overallConfidence = Math.round((confScores.reduce((a, b) => a + b, 0) / confScores.length) * 100);

  return {
    chiefComplaint: { value: chiefComplaint, confidence: ccConfidence, verified: false },
    symptoms: { value: detectedSymptoms, confidence: detectedSymptoms.length > 0 ? 0.91 : 0.5, verified: false },
    vitals: {
      bloodPressure: bpMatch ? { value: bpMatch[1].replace(/\s+/g, ''), confidence: 0.95, verified: false } : undefined,
      heartRate: hrMatch ? { value: parseInt(hrMatch[1], 10), confidence: 0.92, verified: false } : undefined,
      temperature: tempMatch ? { value: parseFloat(tempMatch[1]), confidence: 0.91, verified: false } : undefined,
      spO2: spo2Match ? { value: parseInt(spo2Match[1], 10), confidence: 0.94, verified: false } : undefined,
      respiratoryRate: rrMatch ? { value: parseInt(rrMatch[1], 10), confidence: 0.88, verified: false } : undefined,
    },
    history: {
      value: text.slice(0, 300),
      confidence: 0.8,
      verified: false,
    },
    medications: detectedMeds,
    assessment: { value: assessment, confidence: assessmentConf, verified: false },
    plan: { value: plan, confidence: planConf, verified: false },
    overallConfidence,
    isAllVerified: false,
  };
}

export function createEmptyStructuredData(): StructuredClinicalData {
  return {
    chiefComplaint: { value: '', confidence: 0, verified: false },
    symptoms: { value: [], confidence: 0, verified: false },
    vitals: {},
    history: { value: '', confidence: 0, verified: false },
    medications: [],
    assessment: { value: '', confidence: 0, verified: false },
    plan: { value: '', confidence: 0, verified: false },
    overallConfidence: 0,
    isAllVerified: false,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
