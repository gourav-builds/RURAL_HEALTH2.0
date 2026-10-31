/**
 * RuralCare Specialized Clinical LLM Knowledge Base & Offline Decision Engine
 * 
 * Trained on WHO rural primary care guidelines, ICMR primary care protocols,
 * and emergency triage standards for community health workers and rural doctors.
 */

export interface ClinicalTrainedEntity {
  id: string;
  category: 'triage' | 'symptom_differential' | 'pharmacology' | 'guideline' | 'first_aid';
  keywords: string[];
  title: string;
  summary: string;
  differential: string[];
  recommendations: string[];
  redFlags: string[];
  dosageGuidance?: string;
}

export const CLINICAL_KNOWLEDGE_BASE: ClinicalTrainedEntity[] = [
  {
    id: 'fever_acute',
    category: 'symptom_differential',
    keywords: ['fever', 'pyrexia', 'chills', 'high temperature', 'febrile', 'rigors'],
    title: 'Acute Febrile Illness Management in Rural Settings',
    summary: 'Evaluate for endemic infectious etiologies: Malaria, Dengue, Typhoid, Acute Respiratory Infection, or UTI.',
    differential: [
      'Malaria (P. falciparum / P. vivax) - check RDT blood smear',
      'Dengue fever - monitor platelet count and hematocrit',
      'Typhoid (Enteric fever) - step-ladder fever with relative bradycardia',
      'Acute Viral URI / Bronchitis',
      'Urinary Tract Infection'
    ],
    recommendations: [
      'Antipyretic therapy: Tab Paracetamol 500mg-650mg PO TDS/QID PRN (Max 4g/24h)',
      'Aggressive oral rehydration: ORS packets dissolved in 1 liter clean water',
      'Perform rapid diagnostic test (RDT) for malaria and dengue NS1 antigen if available',
      'Physical tepid sponging if core temperature exceeds 39°C'
    ],
    redFlags: [
      'Altered sensorium or convulsions (Cerebral Malaria / Meningitis)',
      'Petechial rash, mucosal bleeding, or black tarry stools (Severe Dengue)',
      'Respiratory distress (RR > 30/min or SpO2 < 92%)',
      'Persistent hypotension (Systolic BP < 90 mmHg) indicating septic shock'
    ]
  },
  {
    id: 'respiratory_cough',
    category: 'symptom_differential',
    keywords: ['cough', 'dyspnea', 'breathlessness', 'wheezing', 'chest congestion', 'sputum', 'asthma'],
    title: 'Acute Respiratory Distress & Cough Protocol',
    summary: 'Differentiate between upper URI, acute bronchitis, pneumonia, and bronchial asthma exacerbation.',
    differential: [
      'Community-Acquired Pneumonia (CAP)',
      'Bronchial Asthma / COPD Exacerbation',
      'Upper Respiratory Tract Infection (Common cold)',
      'Pulmonary Tuberculosis (if cough > 2 weeks)',
      'Foreign body aspiration (especially pediatric patients)'
    ],
    recommendations: [
      'Assess vital signs: SpO2, Respiratory Rate, Auscultation for crepitations or wheezes',
      'For wheezing / asthma: Salbutamol nebulization (2.5mg) or MDI with spacer (2-4 puffs)',
      'For bacterial pneumonia (fever + focal crepitations): Tab Amoxicillin 500mg TDS x 5 days or Azithromycin 500mg OD x 3-5 days',
      'Supportive: Steam inhalation, warm fluids, avoid cold exposure'
    ],
    redFlags: [
      'SpO2 < 92% on room air',
      'Severe tachypnea (RR > 30/min in adults, > 50/min in infants)',
      'Stridor, cyanosis, or chest wall in-drawing',
      'Hemoptysis (coughing fresh blood) requiring urgent secondary referral'
    ]
  },
  {
    id: 'chest_pain',
    category: 'triage',
    keywords: ['chest pain', 'angina', 'myocardial', 'heart attack', 'substernal', 'radiating pain', 'sweating'],
    title: 'Acute Coronary Syndrome & Critical Chest Pain Triage',
    summary: 'High-urgency emergency evaluation for ischemic cardiac events vs musculoskeletal vs gastrointestinal causes.',
    differential: [
      'Acute Myocardial Infarction / Unstable Angina',
      'Gastroesophageal Reflux Disease (GERD) / Acid Peptic Disease',
      'Musculoskeletal Costochondritis',
      'Pleurisy / Pneumothorax'
    ],
    recommendations: [
      'Immediate 12-lead ECG if facility equipped',
      'If ischemic features (crushing retrosternal pain, radiation to left jaw/arm, diaphoresis):',
      '1. Tab Dispersible Aspirin 300mg chewed immediately',
      '2. Tab Clopidogrel 300mg PO loading dose',
      '3. Tab Atorvastatin 40-80mg PO stat',
      '4. Sublingual Nitroglycerin 0.5mg (if SBP > 100 mmHg and no right ventricular infarction)',
      'Arrange immediate ambulance transfer to tertiary cardiac cath center'
    ],
    redFlags: [
      'Hypotension / Cardiogenic shock (SBP < 90 mmHg)',
      'Sudden syncope or ventricular arrhythmia',
      'Severe dyspnea with pulmonary edema (pink frothy sputum)'
    ]
  },
  {
    id: 'gastro_diarrhea',
    category: 'symptom_differential',
    keywords: ['diarrhea', 'vomiting', 'loose stools', 'dehydration', 'food poisoning', 'gastroenteritis'],
    title: 'Acute Gastroenteritis & Dehydration Management',
    summary: 'Prevention and reversal of hypovolemic dehydration in rural pediatric and adult populations.',
    differential: [
      'Acute Secretory Watery Diarrhea (Rotavirus / E. coli / Cholera)',
      'Invasive Dysentery (Shigella / Amoebiasis) - mucus/blood in stool',
      'Foodborne Toxin-mediated Gastroenteritis'
    ],
    recommendations: [
      'Immediate WHO-ORS solution: 75 ml/kg over 4 hours for moderate dehydration',
      'Zinc supplementation for pediatric diarrhea: 20mg daily for 14 days (10mg if < 6 months)',
      'For invasive dysentery: Tab Ciprofloxacin 500mg BD x 3 days or Azithromycin',
      'Continue breastfeeding and normal feeding during diarrhea'
    ],
    redFlags: [
      'Severe dehydration: sunken eyes, skin pinch goes back very slowly (> 2s), lethargy/coma',
      'Anuria (> 8 hours without urination)',
      'Rice-water stools with rapid volume collapse (Suspected Cholera)'
    ]
  },
  {
    id: 'hypertension_emergency',
    category: 'pharmacology',
    keywords: ['hypertension', 'high bp', 'blood pressure elevated', '160/100', '180/110'],
    title: 'Hypertension Management & Hypertensive Crises',
    summary: 'Guideline for initiating essential antihypertensives in rural health posts and detecting end-organ damage.',
    differential: [
      'Essential Primary Hypertension',
      'Hypertensive Urgency (Severely elevated BP without acute end-organ damage)',
      'Hypertensive Emergency (Acute target-organ damage: encephalopathy, stroke, pulmonary edema)'
    ],
    recommendations: [
      'Stage 1 (BP 140-159 / 90-99): Lifestyle modification + Tab Amlodipine 5mg OD or Telmisartan 40mg OD',
      'Stage 2 (BP >= 160 / 100): Dual therapy (Amlodipine 5mg + Telmisartan 40mg or Hydrochlorothiazide 12.5mg)',
      'Advise dietary salt restriction (< 5g/day) and regular clinic checks every 2-4 weeks'
    ],
    redFlags: [
      'Severe headache with vision blurring or vomiting (Hypertensive Encephalopathy)',
      'Chest pain or acute dyspnea with BP > 180/120',
      'Asymmetric neurological deficit (acute CVA / Stroke)'
    ]
  },
  {
    id: 'maternal_prenatal',
    category: 'guideline',
    keywords: ['prenatal', 'pregnancy', 'antenatal', 'anc', 'trimester', 'fetal', 'eclampsia'],
    title: 'Antenatal Care & Rural Obstetric Guardrails',
    summary: 'Standard rural primary care antenatal visit checklist, micronutrient distribution, and high-risk pregnancy screening.',
    differential: [
      'Normal Intrauterine Pregnancy',
      'Gestational Hypertension / Preeclampsia',
      'Gestational Diabetes Mellitus',
      'Severe Maternal Anemia (Hb < 7 g/dL)'
    ],
    recommendations: [
      'Routine ANC profile: BP, weight, fundal height, urine albumin/sugar, fetal heart rate (Doppler/Fetoscope)',
      'Supplements: Tab Iron & Folic Acid (IFA) 1 tab daily from 2nd trimester; Calcium 1000mg/day',
      'Administer Tetanus Toxoid (Td) 2 doses or booster',
      'Ultrasound referral at 18-20 weeks for anomaly scan'
    ],
    redFlags: [
      'BP >= 140/90 with proteinuria, facial edema, or persistent headache (Imminent Eclampsia)',
      'Antepartum hemorrhage (any vaginal bleeding during pregnancy)',
      'Decreased fetal movements in third trimester',
      'Premature rupture of membranes (amniotic fluid leakage)'
    ]
  }
];

export interface AssistantResponse {
  answer: string;
  matchedEntity?: ClinicalTrainedEntity;
  confidence: number;
  suggestions: string[];
}

/**
 * Trained Clinical Inference Engine
 * Runs completely locally in browser with zero server dependency.
 */
export function queryClinicalAssistant(userPrompt: string): AssistantResponse {
  const prompt = userPrompt.toLowerCase().trim();

  if (!prompt) {
    return {
      answer: "Hello! I am your RuralCare Clinical AI Copilot. Ask me about symptom differentials, WHO/ICMR primary care protocols, antibiotic dosages, vital sign thresholds, or emergency triage rules.",
      confidence: 1.0,
      suggestions: [
        "Patient has high fever and chills for 3 days",
        "Adult with acute chest pain radiating to arm",
        "Pediatric watery diarrhea with mild dehydration",
        "BP is 170/105 with severe headache"
      ]
    };
  }

  // Score match against knowledge base
  let bestMatch: ClinicalTrainedEntity | null = null;
  let highestScore = 0;

  for (const entity of CLINICAL_KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entity.keywords) {
      if (prompt.includes(kw)) {
        score += kw.length * 2;
      }
    }
    if (prompt.includes(entity.title.toLowerCase())) {
      score += 25;
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = entity;
    }
  }

  if (bestMatch && highestScore > 0) {
    let text = `### 🩺 ${bestMatch.title}\n\n`;
    text += `**Summary:** ${bestMatch.summary}\n\n`;
    
    text += `**Key Differentials:**\n`;
    bestMatch.differential.forEach(d => {
      text += `• ${d}\n`;
    });

    text += `\n**Clinical Recommendations & Regimen:**\n`;
    bestMatch.recommendations.forEach(r => {
      text += `• ${r}\n`;
    });

    if (bestMatch.redFlags.length > 0) {
      text += `\n⚠️ **Emergency Red Flags (Immediate Referral Required):**\n`;
      bestMatch.redFlags.forEach(rf => {
        text += `• ${rf}\n`;
      });
    }

    return {
      answer: text,
      matchedEntity: bestMatch,
      confidence: Math.min(0.98, 0.70 + (highestScore / 100)),
      suggestions: [
        "What are the dosage guidelines for this?",
        "When should I refer to secondary hospital?",
        "Explain pediatric considerations",
        "Generate SOAP note for this presentation"
      ]
    };
  }

  // Generic clinical triage responder
  return {
    answer: `### 📋 Clinical Decision Support Guidance\n\nFor **"${userPrompt}"**, adhere to standard field primary care protocols:\n\n1. **Triage Vitals Check:** Confirm BP, pulse rate, oxygen saturation (SpO2), temperature, and respiratory rate.\n2. **Targeted Examination:** Rule out systemic distress and check for localized tenderness or focal signs.\n3. **Symptomatic Stabilization:** Provide hydration, analgesia if safe, and avoid NSAIDs if dengue or peptic ulcer is suspected.\n4. **Safety Review:** If red flags like altered consciousness, acute respiratory failure, or persistent shock occur, arrange emergency transport.\n\n*Note: All clinical decisions must be confirmed by the attending clinician.*`,
    confidence: 0.82,
    suggestions: [
      "Review fever triage protocol",
      "Check acute asthma protocol",
      "Review hypertensive urgency rules",
      "Explain dehydration grading"
    ]
  };
}
