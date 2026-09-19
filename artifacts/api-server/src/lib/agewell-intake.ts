import type { CarePlan } from "@workspace/api-zod";

/** Conservative extraction guard: factual strings must be literal source excerpts.
 * Unsupported paraphrases are rejected instead of silently inventing provenance.
 */
export function assertGroundedCarePlan(plan:CarePlan,text:string):void {
 const normalize=(s:string)=>s.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
 const source=normalize(text);
 const literal=(value:unknown,path:string):void=>{
  if(value===null||value===undefined)return;
  if(typeof value==="string"){
   const fragment=normalize(value);
   if(!fragment||!source.includes(fragment))throw new Error(`Unsupported source fact: ${path}`);
  }else if(typeof value==="number"){
   const escaped=String(value).replace(/\./g,"\\.");
   if(!new RegExp(`(?:^|[^\\d.])${escaped}(?=$|[^\\d.])`).test(source))throw new Error(`Unsupported numeric fact: ${path}`);
  }else if(Array.isArray(value))value.forEach((v,i)=>literal(v,`${path}[${i}]`));
  else if(typeof value==="object")Object.entries(value).forEach(([k,v])=>literal(v,`${path}.${k}`));
 };
 literal(plan.patient.name,"patient.name");literal(plan.patient.age,"patient.age");
 if(plan.patient.lives_alone===true&&!/\blives alone\b/.test(source))throw new Error("Living arrangement not documented");
 if(plan.patient.lives_alone===false&&!/\b(?:does not live alone|lives with|living with)\b/.test(source))throw new Error("Living arrangement not documented");
 literal(plan.caregiver,"caregiver");
 literal(plan.admission_reason,"admission_reason");
 literal(plan.discharge_diagnoses,"discharge_diagnoses");
 literal(plan.chronic_conditions,"chronic_conditions");
 literal(plan.medications,"medications");
 literal(plan.discharge_baseline,"discharge_baseline");
 literal(plan.monitoring_instructions,"monitoring_instructions");
 literal(plan.red_flag_symptoms,"red_flag_symptoms");
 literal(plan.follow_up,"follow_up");
 literal(plan.diet_activity_restrictions,"diet_activity_restrictions");
 const conditionEvidence={
  CHF:/\b(?:chf|heart failure|hfref|hfpef)\b/,
  DIABETES:/\b(?:diabetes|t2dm|t1dm)\b/,
  COPD:/\b(?:copd|chronic obstructive pulmonary disease)\b/,
  POST_OP:/\b(?:post[- ]?op(?:erative)?|arthroplasty|surgery|surgical)\b/,
  HYPERTENSION:/\b(?:hypertension|hypertensive)\b/,
 };
 if(!conditionEvidence[plan.primary_condition].test(source))throw new Error("Primary condition not documented");
}