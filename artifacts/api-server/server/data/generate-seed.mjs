import { readFileSync, writeFileSync } from "node:fs";

const prompt = readFileSync(new URL("../../../../attached_assets/agewell-replit-build-prompt_1789834918722.md", import.meta.url), "utf8");
const raw = prompt.slice(prompt.indexOf('"MERCY GENERAL HOSPITAL') + 1, prompt.indexOf('09/26/2026."') + '09/26/2026.'.length);
const fallbackPath = new URL("./fallback-assessments.json", import.meta.url);
const existingFallback = JSON.parse(readFileSync(fallbackPath, "utf8"));
const round = (value, digits = 1) => Number(value.toFixed(digits));
const dateFor = (day, hour = 8) => `2026-09-${String(12 + day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`;
const sourceForLog = (log) => {
  const devices = [];
  if (log.weight_lb !== null) devices.push("simulated scale");
  if (log.bp_systolic !== null || log.bp_diastolic !== null || log.bp_evening_systolic !== null) devices.push("simulated blood pressure cuff");
  if (log.spo2 !== null) devices.push("simulated pulse oximeter");
  if (log.heart_rate !== null || log.activity_steps !== null || log.sleep_hours !== null) devices.push("simulated wearable");
  if (log.glucose !== null) devices.push("simulated glucose meter");
  if (log.temp_f !== null) devices.push("simulated thermometer");
  return devices.join("; ");
};

const baseline = { bp_systolic: 118, bp_diastolic: 72, heart_rate: 68, weight_lb: 154.2, spo2: 96, temp_f: 98.2, glucose: null };
const medications = [
  ["Metoprolol succinate", "25 mg", "once daily", "morning", true, "12.5 mg", "2027-03-01"],
  ["Furosemide", "40 mg", "once daily", "morning", true, null, "2027-01-15"],
  ["Lisinopril", "10 mg", "once daily", "morning", false, null, "2027-05-20"],
  ["Metformin", "500 mg", "twice daily", "morning and evening", false, null, "2027-02-10"],
  ["Atorvastatin", "20 mg", "nightly", "evening", false, null, "2027-04-08"],
].map(([name, dose, frequency, time_of_day, changed_at_discharge, previous_dose, expires_at]) => ({ name, dose, frequency, time_of_day, changed_at_discharge, previous_dose, expires_at }));
const plan = {
  patient: { id: "margaret", name: "Margaret Ellis", age: 78, lives_alone: true },
  caregiver: { name: "Dana Ellis", relation: "daughter", phone: null, distance_miles: 430 },
  admission_reason: "Acute decompensated heart failure with volume overload.",
  discharge_diagnoses: ["Heart failure with reduced ejection fraction (HFrEF, EF 38%)", "Essential hypertension", "Type 2 diabetes mellitus", "Stage 3a chronic kidney disease"],
  chronic_conditions: ["HFrEF", "Hypertension", "Type 2 diabetes", "Stage 3a chronic kidney disease"],
  primary_condition: "CHF",
  medications,
  discharge_baseline: baseline,
  monitoring_instructions: [
    { what: "Weight", frequency: "Every morning before breakfast, same scale, after using the bathroom", threshold_text: "3 lb in one day or 5 lb in one week" },
    { what: "Blood pressure", frequency: "Twice daily, morning and evening", threshold_text: null },
  ],
  red_flag_symptoms: ["increased shortness of breath", "difficulty breathing lying flat", "new or worsening swelling in legs or ankles", "dizziness or lightheadedness", "chest pain", "fainting"],
  follow_up: [{ provider: "Dr. Alan Reyes", specialty: "Cardiology", due_date: "2026-09-19" }, { provider: "Dr. Priya Nair", specialty: "Primary care", due_date: "2026-09-26" }],
  diet_activity_restrictions: ["Low sodium diet, under 2 g daily", "Fluid restriction 1.5 L daily"],
};
const rows = [
  [120, 74, 70, 154, 96, 98.1, []],
  [118, 72, 69, 154.3, 97, 98.3, []],
  [122, 75, 71, 154.1, 96, 98, []],
  [119, 73, 72, 154.6, 96, 98.2, []],
  [124, 76, 78, 155.9, 95, 98.4, ["mild fatigue"]],
  [131, 80, 84, 156.8, 94, 98.3, ["mild fatigue", "ankle swelling", "dizziness on standing"]],
  [138, 84, 91, 157.8, 93, 98.5, ["fatigue", "ankle swelling", "dizziness on standing", "short of breath climbing stairs"]],
];
function medicationTaken(p, day, medIndex, availableDay = 7, level = "GREEN") {
  const medication = p.medications[medIndex];
  if (/\b(as needed|prn)\b/i.test(medication.frequency)) return [];
  const doses = /twice|two/i.test(medication.frequency) ? 2 : 1;
  // Deterministic simulated self-report: each person has a different,
  // believable pattern.  Every scheduled dose is represented explicitly,
  // including missed doses; an absent record remains genuinely unknown.
  const seed = [...p.patient.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const firstScheduled = p.medications.findIndex((item) => !/\b(as needed|prn)\b/i.test(item.frequency));
  // Keep one known miss in the visible window, but move its date by patient.
  // Margaret's teaching scenario intentionally starts with exactly one miss.
  const missDay = p.patient.id === "margaret"
    ? 1
    : Math.max(1, Math.min(availableDay, availableDay <= 2 ? 1 : 1 + (seed % (availableDay - 1))));
  return Array.from({ length: doses }, (_, doseIndex) => ({
    med_name: medication.name,
    taken: day === missDay && medIndex === firstScheduled && doseIndex === 0
      ? false
      : true,
    time: doseIndex ? "18:00" : /evening|night/i.test(medication.time_of_day || "") ? "20:00" : "08:00",
  }));
}
function logs(p, values = rows) {
  return values.map(([bp_systolic, bp_diastolic, heart_rate, weight_lb, spo2, temp_f, symptoms], i) => {
    const log = {
    day: i + 1,
    date: `2026-09-${String(13 + i).padStart(2, "0")}`,
    bp_systolic, bp_diastolic, heart_rate, weight_lb, spo2, temp_f, glucose: null, pain_score: null, sleep_hours: null, activity_steps: null,
    meds_taken: p.medications.flatMap((_, medIndex) => medicationTaken(p, i + 1, medIndex, p._availableDay || 7, p._seedLevel || "GREEN")),
    med_verification: { checked: i === 6, label_dose: i === 6 ? "50 mg" : "", expected_dose: i === 6 ? "25 mg" : "", mismatch: i === 6, med_name: "Metoprolol succinate" },
    symptoms,
    free_text_note: i === 6 ? "I think I already took the blue one this morning. Stairs were harder than usual." : "Feeling alright. Slept okay.",
    source: "",
    observed_at: dateFor(i + 1),
    last_synced_at: dateFor(i + 1, 8),
    };
    log.source = sourceForLog(log);
    return log;
  });
}
const patients = [{ care_plan: plan, day: 1, logs: logs(plan), discharge_summary_raw: raw }];

const nameFirst = ["Evelyn", "Arthur", "Dorothy", "Walter", "Helen", "George", "Ruth", "Frank", "Irene", "Thomas", "Rose", "Henry", "Clara", "Samuel", "Esther", "Louis", "Grace", "Raymond", "Nora"];
const nameLast = ["Bennett", "Chen", "Patel", "Rivera", "Williams"];
const providers = ["Dr. Maya Shah", "Dr. Luis Ortega", "Dr. Keiko Sato", "Dr. Jonah Brooks", "Dr. Elena Rossi"];
const specialty = { CHF: "Cardiology", DIABETES: "Endocrinology", COPD: "Pulmonology", POST_OP: "Orthopedics", HYPERTENSION: "Primary care" };
const medicationCatalog = {
  CHF: [["Carvedilol", "12.5 mg", "twice daily"], ["Spironolactone", "25 mg", "once daily"], ["Empagliflozin", "10 mg", "once daily"]],
  DIABETES: [["Glipizide", "5 mg", "once daily"], ["Sitagliptin", "100 mg", "once daily"], ["Insulin glargine", "10 units", "nightly"]],
  COPD: [["Tiotropium", "18 mcg", "once daily"], ["Albuterol inhaler", "2 puffs", "as needed"], ["Budesonide", "200 mcg", "twice daily"]],
  POST_OP: [["Acetaminophen", "500 mg", "as needed"], ["Aspirin", "81 mg", "once daily"], ["Gabapentin", "100 mg", "nightly"]],
  HYPERTENSION: [["Amlodipine", "5 mg", "once daily"], ["Losartan", "50 mg", "once daily"], ["Hydrochlorothiazide", "25 mg", "morning"]],
};
const conditionSymptoms = {
  CHF: ["ankle swelling", "fatigue", "short of breath climbing stairs"],
  DIABETES: ["dizziness", "missed meal", "fatigue"],
  COPD: ["short of breath", "sputum change", "fatigue"],
  POST_OP: ["wound redness", "pain", "limited mobility"],
  HYPERTENSION: ["dizziness", "headache", "fatigue"],
};
function cohort(id, name, age, primary, day, level, diagnosis, index) {
  const offset = (index % 17) - 8;
  const b = {
    bp_systolic: 118 + offset,
    bp_diastolic: 72 + Math.round(offset / 2),
    heart_rate: 68 + (index % 13),
    weight_lb: round(148 + (index % 23) * 1.7),
    spo2: primary === "COPD" ? 93 + (index % 5) : 95 + (index % 3),
    temp_f: 98 + (index % 4) / 10,
    glucose: primary === "DIABETES" ? 102 + (index % 7) * 4 : null,
  };
  const p = structuredClone(plan);
  p.patient = { id, name, age, lives_alone: index % 3 === 0 };
  p.caregiver = { name: `${nameFirst[(index + 4) % nameFirst.length]} ${nameLast[(index + 2) % nameLast.length]}`, relation: index % 2 ? "son" : "daughter", phone: `555-01${String(index).padStart(2, "0")}`, distance_miles: 12 + (index * 7) % 480 };
  p.admission_reason = diagnosis;
  p.discharge_diagnoses = [diagnosis];
  p.chronic_conditions = [`${primary} follow-up`];
  p.primary_condition = primary;
  p.discharge_baseline = b;
  p.medications = medicationCatalog[primary].slice(0, 1 + (index % 3)).map(([name, dose, frequency], medIndex) => ({
    name, dose, frequency, time_of_day: frequency === "nightly" ? "evening" : "morning", changed_at_discharge: (index + medIndex) % 2 === 0, previous_dose: null,
    expires_at: `2027-${String(1 + ((index + medIndex) % 10)).padStart(2, "0")}-${String(5 + ((index * 3 + medIndex) % 20)).padStart(2, "0")}`,
  })).sort((a, b) => {
    const order = (time) => /morning/i.test(time || "") ? 0 : /afternoon/i.test(time || "") ? 1 : /evening|night/i.test(time || "") ? 2 : 3;
    return order(a.time_of_day) - order(b.time_of_day);
  });
  p.monitoring_instructions = [{ what: primary === "COPD" ? "Oxygen saturation" : primary === "DIABETES" ? "Glucose" : primary === "POST_OP" ? "Temperature and wound" : "Blood pressure", frequency: "Daily", threshold_text: null }];
  p.red_flag_symptoms = ["chest pain", "confusion", "fainting"];
  const followUpDate = new Date(Date.UTC(2026, 8, 18 + (index % 18))).toISOString().slice(0, 10);
  p.follow_up = [{ provider: providers[index % providers.length], specialty: specialty[primary], due_date: followUpDate }];
  p.diet_activity_restrictions = [`Personalized ${primary.toLowerCase()} recovery plan`];
  p._availableDay = day;
  p._seedLevel = level;
  const ls = Array.from({ length: 7 }, (_, i) => {
    const progress = i / 6;
    const log = {
      day: i + 1, date: `2026-09-${String(13 + i).padStart(2, "0")}`,
      bp_systolic: null, bp_diastolic: null, heart_rate: null, weight_lb: null, spo2: null, temp_f: null, glucose: null,
      pain_score: null, sleep_hours: round(6 + ((index + i) % 4) * 0.4), activity_steps: 1800 + ((index * 173 + i * 241) % 2200),
      // Scheduled doses are always represented. A false record is a known
      // miss; only PRN orders have no scheduled record.
      meds_taken: p.medications.flatMap((_, medIndex) => medicationTaken(p, i + 1, medIndex, p._availableDay || 7, p._seedLevel || "GREEN")),
      med_verification: { checked: false, label_dose: "", expected_dose: "", mismatch: false, med_name: p.medications[0]?.name || "" },
      symptoms: (i === day - 1 && level === "YELLOW") ? [conditionSymptoms[primary][index % conditionSymptoms[primary].length]] : [],
      free_text_note: `Day ${i + 1} connected-device recovery reading for ${name}.`,
      source: "", observed_at: dateFor(i + 1), last_synced_at: dateFor(i + 1, 8 + (index % 3)),
    };
    if (["CHF", "HYPERTENSION"].includes(primary)) {
      log.bp_systolic = round(b.bp_systolic + Math.sin(index + i) * 3 + (i === day - 1 && level === "YELLOW" ? 16 : 0));
      log.bp_diastolic = round(b.bp_diastolic + Math.sin(index + i) * 2);
    }
    if (["CHF", "DIABETES", "COPD", "POST_OP", "HYPERTENSION"].includes(primary)) log.heart_rate = round(b.heart_rate + Math.sin(index + i) * 3 + (i === day - 1 && level === "YELLOW" ? 11 : 0));
    if (["CHF"].includes(primary)) log.weight_lb = round(b.weight_lb + progress * (level === "ORANGE" ? 5.2 : level === "YELLOW" ? 1.2 : 0.5) + Math.sin(index) * 0.2);
    if (primary === "COPD") log.spo2 = round(b.spo2 - progress * (level === "RED" ? 8 : 1) + Math.sin(index + i) * 0.5);
    if (primary === "DIABETES") log.glucose = round(b.glucose + Math.sin(index + i) * 7 + (level === "RED" && i === day - 1 ? 320 : 0), 0);
    if (primary === "POST_OP") {
      log.temp_f = round(b.temp_f + (level === "ORANGE" && i === day - 1 ? 2.5 : 0) + progress * 0.1);
      log.pain_score = Math.min(10, Math.round(6 - progress * 2 + index % 2));
    }
    if (level === "ORANGE" && i === day - 1) log.temp_f = 100.6;
    if (level === "RED" && i === day - 1) {
      if (primary === "COPD") log.spo2 = 86;
      else if (primary === "DIABETES") log.glucose = 450;
      else if (primary === "HYPERTENSION") log.bp_systolic = 185;
      else log.symptoms = [index % 2 ? "confusion" : "chest pain"];
    }
    log.source = sourceForLog(log);
    return log;
  });
  delete p._availableDay;
  delete p._seedLevel;
  patients.push({ care_plan: p, day, logs: ls, discharge_summary_raw: "Synthetic cohort care plan; not a real discharge record." });
}
cohort("robert", "Robert Vance", 81, "COPD", 4, "GREEN", "COPD exacerbation", 0);
cohort("alice", "Alice Moreau", 74, "DIABETES", 3, "YELLOW", "Cellulitis and type 2 diabetes", 1);
cohort("james", "James Okonkwo", 69, "POST_OP", 6, "GREEN", "Total hip arthroplasty", 2);
cohort("susan", "Susan Park", 86, "COPD", 2, "RED", "Community-acquired pneumonia", 3);
for (let i = 0; i < 95; i++) cohort(`patient-${i + 6}`, `${nameFirst[i % nameFirst.length]} ${nameLast[Math.floor(i / nameFirst.length)]}`, 65 + i % 28, ["CHF", "DIABETES", "COPD", "POST_OP", "HYPERTENSION"][i % 5], 1 + i % 7, i < 69 ? "GREEN" : i < 87 ? "YELLOW" : i < 94 ? "ORANGE" : "RED", "Synthetic post-discharge recovery", i + 4);

writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify({ patients }, null, 2));
writeFileSync(fallbackPath, JSON.stringify({
  GREEN: { headline: "Recovery is tracking with the discharge plan", recommended_action: "Continue logging your recovery observations.", who_should_act: "patient" },
  YELLOW: { headline: "Early changes deserve a closer look", recommended_action: "Caregiver review and an additional recovery check are requested.", who_should_act: "caregiver" },
  ORANGE: { headline: "Your care team should review these changes", recommended_action: "Nurse review of the recorded changes is requested within 24 hours.", who_should_act: "nurse" },
  RED: { headline: "Urgent warning signs need immediate human attention", recommended_action: "Please call 911 now. A care-team notification is simulated; AgeWell does not contact emergency services.", who_should_act: "emergency" },
  mismatch: { headline: "Medicine bottle differs from the discharge record", recommended_action: "Pharmacist review of the medication discrepancy is requested within 24 hours.", who_should_act: "pharmacist" },
  ...(existingFallback.precomputed ? { precomputed: existingFallback.precomputed } : {}),
}, null, 2));