import { test } from "node:test";
import assert from "node:assert/strict";
import { AgewellStore, DomainError } from "./agewell-store";
import { HARD_RULES, assess, assessCached, claude, context, safeOutput } from "./agewell-engine";
import { GetAgewellPatientResponse, GetAgewellStateResponse } from "@workspace/api-zod";
import { assertGroundedCarePlan } from "./agewell-intake";
import type { CarePlan } from "@workspace/api-zod";

delete process.env.ANTHROPIC_API_KEY;
test("selection stays synchronized for cohort and intake demo actions",async()=>{
 const s=new AgewellStore();
 const other=s.state().patients.find(p=>p.id!=="margaret")!;
 const before=s.detail(other.id).day;
 await s.demo("select",other.id);
 assert.equal(s.state().selected_patient_id,other.id);
 assert.equal(s.detail(other.id).day,before);
 await s.demo("advance");
 assert.equal(s.detail(other.id).day,Math.min(before+1,7));
 assert.equal(s.detail("margaret").day,1);
 const intake=s.confirm(s.detail("margaret").care_plan);
 await s.demo("advance");
 assert.equal(s.state().selected_patient_id,intake.id);
 assert.equal(s.detail(intake.id).day,2);
 await s.demo("jump");
 assert.equal(s.detail(intake.id).day,7);
 assert.equal(s.detail("margaret").day,1);
 await assert.rejects(s.demo("select","missing"),/not found/i);
 assert.equal(s.state().selected_patient_id,intake.id);
 await s.demo("reset");
 assert.equal(s.state().selected_patient_id,"margaret");
});
test("condition-specific notes round-trip and evening BP independently triggers safety",async()=>{
 const s=new AgewellStore();
 const fields={meal_note:"Breakfast recorded",wound_check:"Dry dressing",mobility_note:"Walked to doorway",activity_tolerance:"Rested after walking",bp_evening_systolic:185,bp_evening_diastolic:92};
 let d=await s.log("margaret",fields);
 GetAgewellPatientResponse.parse(d);
 for(const [key,value] of Object.entries(fields))assert.equal(d.logs[0][key as keyof typeof fields],value);
 assert.ok(d.current_assessment.triggered_hard_rules.includes("HR_SBP_CRIT_HIGH"));
 assert.equal(d.current_assessment.level,"RED");
 assert.ok(d.current_assessment.rationale.some(r=>r.includes("185/92")));
 d=await s.log("margaret",{bp_evening_systolic:85});
 assert.ok(d.current_assessment.triggered_hard_rules.includes("HR_SBP_CRIT_LOW"));
 d=await s.log("margaret",{bp_evening_systolic:null,bp_evening_diastolic:null});
 assert.equal(d.current_assessment.level,"GREEN");
 d=await s.log("margaret",{bp_systolic:null,bp_evening_systolic:180});
 assert.equal(d.current_assessment.level,"RED");
});
test("live intake literal grounding covers all requested clinical and caregiver sections",()=>{
 const s=new AgewellStore(),p=structuredClone(s.get("margaret").care_plan);
 p.patient={id:"intake",name:"Pat Example",age:78,lives_alone:true};
 p.caregiver={name:"Sam Example",relation:"daughter",phone:"555-0101",distance_miles:20};
 p.admission_reason="Hypertension";p.primary_condition="HYPERTENSION";
 p.discharge_diagnoses=["Hypertension"];p.chronic_conditions=["Hypertension"];
 p.medications=[];Object.keys(p.discharge_baseline).forEach(k=>p.discharge_baseline[k as keyof typeof p.discharge_baseline]=null);
 p.monitoring_instructions=[{what:"Blood pressure",frequency:"twice daily",threshold_text:"call for dizziness"}];
 p.red_flag_symptoms=["chest pain"];
 p.follow_up=[{provider:"Dr. Example",specialty:"Cardiology",due_date:"09/19/2026"}];
 p.diet_activity_restrictions=["Low sodium diet"];
 const source="Pat Example, age 78, lives alone. Daughter Sam Example, 555-0101, 20 miles. Hypertension. Blood pressure twice daily; call for dizziness. Chest pain. Dr. Example, Cardiology, 09/19/2026. Low sodium diet.";
 assert.doesNotThrow(()=>assertGroundedCarePlan(p,source));
 const changes:((plan:CarePlan)=>void)[]=[
  q=>q.discharge_diagnoses.push("Kidney disease"),q=>q.chronic_conditions.push("Diabetes"),
  q=>q.caregiver.name="Invented Person",q=>q.caregiver.phone="555-9999",q=>q.caregiver.distance_miles=999,
  q=>q.follow_up[0].provider="Dr. Invented",q=>q.follow_up[0].specialty="Neurology",q=>q.follow_up[0].due_date="09/26/2026",
  q=>q.monitoring_instructions[0].what="Glucose",q=>q.monitoring_instructions[0].frequency="hourly",
  q=>q.monitoring_instructions[0].threshold_text="Invented threshold",
  q=>q.red_flag_symptoms.push("fainting"),q=>q.diet_activity_restrictions.push("No exercise"),
 ];
 for(const change of changes){const q=structuredClone(p);change(q);assert.throws(()=>assertGroundedCarePlan(q,source));}
});
test("exact initial cohort and fully valid detail contracts",()=>{
 const s=new AgewellStore();assert.deepEqual(s.state().counts,{GREEN:72,YELLOW:19,ORANGE:7,RED:2});
 GetAgewellStateResponse.parse(s.state());
 for(const row of s.state().patients)GetAgewellPatientResponse.parse(s.detail(row.id));
 assert.equal(s.get("margaret").logs[6].weight_lb,157.8);
 assert.equal(s.get("margaret").logs[6].med_verification.label_dose,"50 mg");
});
test("cohort profiles are distinct and connected-device metadata is honest",()=>{
 const s=new AgewellStore(),signatures=new Set<string>();
 for(const row of s.state().patients){
  const p=s.get(row.id);
  signatures.add(JSON.stringify({plan:p.care_plan,logs:p.logs.map(l=>({vitals:[l.bp_systolic,l.heart_rate,l.weight_lb,l.spo2,l.glucose,l.temp_f],symptoms:l.symptoms,meds:l.meds_taken}))}));
  assert.ok(p.care_plan.follow_up.length>0,row.id);
  assert.ok(p.care_plan.medications.every(m=>m.expires_at),row.id);
  assert.ok(p.logs.every(l=>l.source&&l.observed_at&&l.last_synced_at),row.id);
  for(const l of p.logs){
   assert.ok(Number.isFinite(Date.parse(l.date)),`${row.id} invalid log date`);
   assert.ok(Number.isFinite(Date.parse(String(l.observed_at))),`${row.id} invalid observed_at`);
   assert.ok(Number.isFinite(Date.parse(String(l.last_synced_at))),`${row.id} invalid last_synced_at`);
   if(l.weight_lb!==null)assert.match(l.source!,/simulated scale/);
   if(l.bp_systolic!==null||l.bp_diastolic!==null)assert.match(l.source!,/simulated blood pressure cuff/);
   if(l.spo2!==null)assert.match(l.source!,/simulated pulse oximeter/);
   if(l.glucose!==null)assert.match(l.source!,/simulated glucose meter/);
   if(l.temp_f!==null)assert.match(l.source!,/simulated thermometer/);
  }
  for(const f of p.care_plan.follow_up)assert.ok(f.due_date&&Number.isFinite(Date.parse(f.due_date)),`${row.id} invalid follow-up date`);
 }
 assert.equal(signatures.size,100);
});
test("scheduled medication profiles always expose an explicit missed dose",()=>{
 const s=new AgewellStore();
 for(const row of s.state().patients){
  const p=s.get(row.id), scheduled=p.care_plan.medications.filter(m=>!/\b(prn|as needed)\b/i.test(m.frequency||""));
  const records=p.logs.slice(0,p.day).flatMap(l=>l.meds_taken);
  if(!scheduled.length) continue;
  const relevant=records.filter(r=>scheduled.some(m=>m.name===r.med_name));
  assert.ok(relevant.some(r=>!r.taken),`${row.id} should not be 100%`);
 }
});
test("COPD readings use the patient's baseline while absolute floors remain emergencies",()=>{
 const s=new AgewellStore(),robert=s.get("robert"),plan=structuredClone(robert.care_plan),stable=structuredClone(robert.logs.slice(0,1));
 plan.discharge_baseline.spo2=95;stable[0].spo2=95;stable[0].symptoms=[];
 assert.equal(assessCached(plan,stable).level,"GREEN");
 stable[0].spo2=91;
 assert.equal(assessCached(plan,stable).level,"YELLOW");
 stable[0].spo2=87;
 assert.equal(assessCached(plan,stable).level,"RED");
});
test("seven day teaching scenario, dynamic counts and report",async()=>{
 const s=new AgewellStore();
 for(let i=2;i<=7;i++){
  await s.demo("advance");const d=s.detail("margaret");
  assert.equal(d.current_assessment.level,i<5?"GREEN":i===5?"YELLOW":"ORANGE");
  GetAgewellPatientResponse.parse(d);
 }
 const d=s.detail("margaret");assert.equal(d.current_assessment.who_should_act,"pharmacist");
 assert.ok(d.current_assessment.triggered_hard_rules.includes("HR_MED_MISMATCH"));
 assert.equal(d.report.medication_adherence_pct,98);assert.equal(d.report.available,true);
 assert.deepEqual(s.state().counts,{GREEN:71,YELLOW:19,ORANGE:8,RED:2});
 assert.ok(d.cases.every(c=>c.events[1].note.includes("SIMULATED")));
 await s.demo("reset");assert.equal(s.detail("margaret").day,1);
});
test("all eleven rules and null reading safety",()=>{
 const s=new AgewellStore(),p=s.get("margaret"),v=structuredClone(p.logs[0]);
 const nulls={...v,bp_systolic:null,bp_diastolic:null,heart_rate:null,weight_lb:null,spo2:null,temp_f:null,glucose:null};
 assert.equal(HARD_RULES.length,11);assert.deepEqual(HARD_RULES.filter(r=>r.when(nulls,context(p.care_plan,[nulls]))),[]);
 const triggers:Record<string,Partial<typeof v>>={
 HR_SBP_CRIT_HIGH:{bp_systolic:180},HR_SBP_CRIT_LOW:{bp_systolic:90},HR_HR_CRIT:{heart_rate:130},
 HR_SPO2_CRIT:{spo2:87},HR_TEMP_FEVER:{temp_f:100.4},HR_CHF_WEIGHT_1D:{weight_lb:158},
 HR_CHF_WEIGHT_7D:{weight_lb:160},HR_GLUCOSE_CRIT:{glucose:59},HR_RED_FLAG_SX:{symptoms:["chest pain"]},
 HR_MED_MISMATCH:{med_verification:{checked:true,label_dose:"50 mg",expected_dose:"25 mg",mismatch:true}},
 HR_MED_MISSED_2:{meds_taken:[{med_name:"x",taken:false,time:null},{med_name:"y",taken:false,time:null}]}};
 for(const rule of HARD_RULES){const value={...v,...triggers[rule.id]};assert.equal(rule.when(value,context(p.care_plan,[v,value])),true,rule.id);}
});
test("mutated logs never use stale seed assessment; verification and RED priority",async()=>{
 const s=new AgewellStore();
 let d=await s.log("margaret",{bp_systolic:185});
 assert.equal(d.current_assessment.level,"RED");assert.equal(d.current_assessment.who_should_act,"emergency");
 d=await s.log("margaret",{bp_systolic:120,med_verification:{checked:true,label_dose:"50 mg",expected_dose:"50 mg",mismatch:false}});
 assert.equal(d.logs[0].med_verification.expected_dose,"25 mg");assert.equal(d.current_assessment.who_should_act,"pharmacist");
 d=await s.log("margaret",{symptoms:["chest pain"]});
 assert.equal(d.current_assessment.level,"RED");assert.equal(d.current_assessment.who_should_act,"emergency");
 d=await s.log("margaret",{symptoms:[],med_verification:{checked:true,label_dose:"25 mg",expected_dose:"50 mg",mismatch:true}});
 assert.equal(d.current_assessment.level,"GREEN");
 assert.ok(safeOutput(d.current_assessment));
});
test("closed loop enforces role, sequential action, optimistic state and clinician evidence",async()=>{
 const s=new AgewellStore();await s.demo("jump");
 const c=s.detail("margaret").cases.find(c=>c.who_should_act==="pharmacist")!;
 const transition=(state:"ACKNOWLEDGED"|"ACTED"|"RESOLVED",actor:"pharmacist"|"nurse",extra={})=>s.transition(c.id,{state,actor,note:"Reviewed the documented discrepancy and completed reconciliation review.",...extra});
 assert.throws(()=>transition("ACKNOWLEDGED","nurse"),DomainError);
 assert.throws(()=>transition("ACTED","pharmacist"),DomainError);
 assert.throws(()=>transition("ACKNOWLEDGED","pharmacist",{expected_state:"DETECTED"}),DomainError);
 transition("ACKNOWLEDGED","pharmacist");
 assert.throws(()=>transition("RESOLVED","pharmacist"),DomainError);
 transition("ACTED","pharmacist");
 assert.equal(c.resolution_check.status,"ACTED_UNRESOLVED");
 assert.throws(()=>transition("RESOLVED","pharmacist"),DomainError);
 assert.throws(()=>transition("RESOLVED","pharmacist",{clinician_expected:true}),DomainError);
 transition("RESOLVED","nurse",{clinician_expected:true,note:"After pharmacist reconciliation and clinical review, this recorded state is expected for this patient's documented follow-up."});
 assert.equal(c.state,"RESOLVED");
});
test("intake monitoring does not fabricate home readings or missed medication",()=>{
 const s=new AgewellStore();const plan=structuredClone(s.get("margaret").care_plan);
 Object.keys(plan.discharge_baseline).forEach(k=>{plan.discharge_baseline[k as keyof typeof plan.discharge_baseline]=null;});
 const d=s.confirm(plan);
 assert.equal(d.logs[0].weight_lb,null);assert.equal(d.logs[0].meds_taken.length,0);
 assert.equal(d.current_assessment.level,"GREEN");assert.equal(d.current_assessment.confidence,"low");
});
test("resolution accepts verified later improvement but not missing observations",async()=>{
 const s=new AgewellStore();for(let i=0;i<4;i++)await s.demo("advance");
 const c=s.detail("margaret").cases[0];
 s.transition(c.id,{state:"ACKNOWLEDGED",actor:"caregiver",note:"Read the recovery observation."});
 s.transition(c.id,{state:"ACTED",actor:"caregiver",note:"Completed a check-in and relayed observations to the care team."});
 await s.demo("advance");
 await s.log("margaret",{bp_systolic:null,bp_diastolic:null,heart_rate:null,weight_lb:null,spo2:null,temp_f:null,symptoms:[]});
 assert.throws(()=>s.transition(c.id,{state:"RESOLVED",actor:"caregiver",note:"Missing readings are not evidence of recovery."}),DomainError);
 await s.log("margaret",{...s.get("margaret").care_plan.discharge_baseline,symptoms:[]});
 s.transition(c.id,{state:"RESOLVED",actor:"caregiver",note:"Reviewed the new readings returning to the documented baseline."});
 assert.equal(c.state,"RESOLVED");
});
test("unsafe/malformed/provider-failure AI falls back and cannot lower hard rules",async()=>{
 const s=new AgewellStore(),p=s.get("margaret"),logs=[{...p.logs[0],spo2:87}];
 const original=globalThis.fetch;process.env.ANTHROPIC_API_KEY="synthetic-test-key";
 const fallback=assessCached(p.care_plan,logs);
 try{
  const advised={...fallback,level:"GREEN",recommended_action:"Take 50 mg now."};
  globalThis.fetch=async()=>new Response(JSON.stringify({content:[{type:"text",text:JSON.stringify(advised)}]}));
  let a=await assess(p.care_plan,logs);
  assert.equal(a.level,"RED");assert.equal(a.ai_mode,"live");assert.ok(!JSON.stringify(a).includes("Take 50 mg"));
  globalThis.fetch=async()=>new Response(JSON.stringify({content:[{type:"text",text:JSON.stringify({bad:true})}]}));
  a=await assess(p.care_plan,logs);assert.equal(a.level,"RED");assert.equal(a.ai_mode,"cached");
  globalThis.fetch=async()=>{throw new Error("network");};
  assert.equal((await assess(p.care_plan,logs)).ai_mode,"cached");
  globalThis.fetch=async()=>new Response(JSON.stringify({content:[{type:"text",text:JSON.stringify({level:"GREEN",rationale:["Drink more water; oxygen saturation is 87%."],confidence:"high"})}]}));
  a=await assess(p.care_plan,logs);
  assert.equal(a.level,"RED");assert.equal(a.who_should_act,"emergency");assert.equal(a.ai_mode,"live");
  assert.ok(!JSON.stringify(a).includes("Drink more water"));
 }finally{globalThis.fetch=original;delete process.env.ANTHROPIC_API_KEY;}
});
test("live assessment is atomic while polling and accepts fenced JSON",async()=>{
 const s=new AgewellStore(),original=globalThis.fetch;
 process.env.ANTHROPIC_API_KEY="synthetic-test-key";
 let release!:()=>void,requested!:()=>void;
 const requestStarted=new Promise<void>(resolve=>{requested=resolve;});
 const released=new Promise<void>(resolve=>{release=resolve;});
 try{
  globalThis.fetch=async()=>{
   requested();
   await released;
    const p=s.get("margaret"),fallback=assessCached(p.care_plan,p.logs.slice(0,2));
    const output={level:fallback.level,rationale:fallback.rationale,confidence:fallback.confidence};
   return new Response(JSON.stringify({content:[{type:"text",text:`\`\`\`json\n${JSON.stringify(output)}\n\`\`\``}]}));
  };
  const advancing=s.demo("advance","margaret");
  await requestStarted;
  assert.equal(s.detail("margaret").day,1);
  assert.doesNotThrow(()=>GetAgewellStateResponse.parse(s.state()));
  release();
  await advancing;
  assert.equal(s.detail("margaret").day,2);
  assert.equal(s.detail("margaret").current_assessment.ai_mode,"live");
 }finally{globalThis.fetch=original;delete process.env.ANTHROPIC_API_KEY;}
});
test("log mutation and assessment commit atomically while live AI is pending",async()=>{
 const s=new AgewellStore(),original=globalThis.fetch;
 process.env.ANTHROPIC_API_KEY="synthetic-test-key";
 let release!:()=>void,requested!:()=>void;
 const requestStarted=new Promise<void>(resolve=>{requested=resolve;});
 const released=new Promise<void>(resolve=>{release=resolve;});
 try{
  globalThis.fetch=async()=>{
   requested();
   await released;
   return new Response(JSON.stringify({content:[{type:"text",text:JSON.stringify({level:"RED",rationale:["Systolic blood pressure is 185."],confidence:"high"})}]}));
  };
  const logging=s.log("margaret",{bp_systolic:185});
  await requestStarted;
  assert.notEqual(s.detail("margaret").logs[0].bp_systolic,185);
  assert.doesNotThrow(()=>GetAgewellPatientResponse.parse(s.detail("margaret")));
  release();
  const detail=await logging;
  assert.equal(detail.logs[0].bp_systolic,185);
  assert.equal(detail.current_assessment.level,"RED");
  assert.equal(detail.current_assessment.ai_mode,"live");
 }finally{globalThis.fetch=original;delete process.env.ANTHROPIC_API_KEY;}
});
test("AI retries only when the preferred model id is rejected",async()=>{
 const original=globalThis.fetch,models:string[]=[];process.env.ANTHROPIC_API_KEY="synthetic-test-key";
 try{
  globalThis.fetch=async(_input,init)=>{
   const body=JSON.parse(String(init?.body));models.push(body.model);
   if(models.length===1)return new Response(JSON.stringify({error:{message:"unknown model"}}),{status:400});
   return new Response(JSON.stringify({content:[{type:"text",text:"{}"}]}));
  };
  await claude("system",{test:true});
  assert.deepEqual(models,["claude-sonnet-5","claude-sonnet-4-5"]);
 }finally{globalThis.fetch=original;delete process.env.ANTHROPIC_API_KEY;}
});