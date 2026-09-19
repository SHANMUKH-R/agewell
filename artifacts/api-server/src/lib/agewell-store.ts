import { randomUUID } from "node:crypto";
import type { CarePlan, DayLog, Assessment, CareCase, PatientDetail, Dashboard, Protocol, TransitionInput, LogInput } from "@workspace/api-zod";
import { assess, assessCached, dataFile, rank } from "./agewell-engine";

export class DomainError extends Error { constructor(public status:number,message:string){super(message);} }
type Stored = {care_plan:CarePlan;day:number;logs:DayLog[];discharge_summary_raw:string;assessments:Assessment[];cases:CareCase[]};
export const protocols:Record<CarePlan["primary_condition"],Protocol>={
 CHF:{name:"CHF",label:"CHF — daily weight, BP, HR, SpO2",vitals:["weight_lb","bp_systolic","bp_diastolic","heart_rate","spo2"],symptoms:["ankle swelling","short of breath","chest pain"]},
 DIABETES:{name:"DIABETES",label:"Diabetes — glucose, medication timing, meals, activity, BP",vitals:["glucose","bp_systolic","bp_diastolic","activity_steps"],symptoms:["missed meal","dizziness","confusion"]},
 COPD:{name:"COPD",label:"COPD — SpO2, breathlessness, sputum, HR, activity tolerance",vitals:["spo2","heart_rate","activity_steps"],symptoms:["short of breath","sputum change","shortness of breath at rest"]},
 POST_OP:{name:"POST_OP",label:"Post-op — pain, temperature, wound, mobility, HR",vitals:["pain_score","temp_f","activity_steps","heart_rate"],symptoms:["wound redness","wound drainage","severe bleeding"]},
 HYPERTENSION:{name:"HYPERTENSION",label:"Hypertension — BP twice daily, HR, dizziness, adherence",vitals:["bp_systolic","bp_diastolic","bp_evening_systolic","bp_evening_diastolic","heart_rate"],symptoms:["dizziness","chest pain","fainting"]},
};
const now=()=>new Date().toISOString();
export class AgewellStore {
 patients=new Map<string,Stored>();
 selected="margaret";
 private rechecks=new Map<string,ReturnType<typeof setTimeout>>();
 constructor(){this.reset();}
 reset(){
  this.rechecks.forEach(timer=>clearTimeout(timer));this.rechecks.clear();
  this.patients.clear();this.selected="margaret";
  const seed=JSON.parse(dataFile("seed.json")) as {patients:Stored[]};
  for(const p of seed.patients){
   p.assessments=[];p.cases=[];
   this.patients.set(p.care_plan.patient.id,p);
   for(let d=1;d<=p.day;d++)this.record(p,assessCached(p.care_plan,p.logs.slice(0,d)));
  }
 }
 get(id:string){const p=this.patients.get(id);if(!p)throw new DomainError(404,"Patient not found");return p;}
 record(p:Stored,a:Assessment){
  p.assessments[a.day-1]=a;
  if(a.level==="GREEN")return;
  const existing=p.cases.find(c=>c.day===a.day&&c.state!=="RESOLVED"&&c.who_should_act===a.who_should_act);
  if(existing){existing.level=a.level;existing.headline=a.headline;return;}
  const timestamp=now();
  p.cases.push({id:`case-${p.care_plan.patient.id}-${a.day}-${p.cases.length+1}`,patient_id:p.care_plan.patient.id,day:a.day,level:a.level,headline:a.headline,who_should_act:a.who_should_act,state:"NOTIFIED",events:[{timestamp,state:"DETECTED",actor:"system",note:"Risk detected from recorded observations."},{timestamp,state:"NOTIFIED",actor:"system",note:`SIMULATED notification to ${a.who_should_act}; no message sent and no emergency service contacted.`}],resolution_check:{status:"OPEN",reason:"Correct-role acknowledgement and action, followed by recovery verification, are required.",next_check_hours:a.level==="RED"?0:4}});
 }
 state():Dashboard {
  const patients=[...this.patients.values()].map(p=>{const a=p.assessments[p.day-1];return {id:p.care_plan.patient.id,name:p.care_plan.patient.name,age:p.care_plan.patient.age,primary_condition:p.care_plan.primary_condition,diagnosis:p.care_plan.discharge_diagnoses.join("; "),day:p.day,level:a.level,headline:a.headline,who_should_act:a.who_should_act,ai_mode:a.ai_mode};}).sort((a,b)=>rank[b.level]-rank[a.level]||a.name.localeCompare(b.name));
  const counts={GREEN:0,YELLOW:0,ORANGE:0,RED:0};patients.forEach(p=>counts[p.level]++);
  return {synthetic:true,selected_patient_id:this.selected,ai_mode:patients.find(p=>p.id===this.selected)?.ai_mode??"cached",counts,patients};
 }
 detail(id:string):PatientDetail {
  const p=this.get(id),logs=p.logs.slice(0,p.day),assessments=p.assessments.slice(0,p.day),a=assessments.at(-1)!;
  const first=p.care_plan.patient.name.split(" ")[0];
  const summary={patient_summary:a.level==="GREEN"?`Good news, ${first} — your recovery is on track today. Keep sharing how you feel.`:a.level==="RED"?`${first}, please call 911 now. AgeWell cannot call for you. The care-team notification in this demo is simulated.`:`Thank you for checking in, ${first}. Your ${a.who_should_act} has been flagged to review a change. This demo's notification is simulated.`,clinical_summary:`Day ${p.day}: ${a.level}. ${a.rationale.join(" ")} ${a.recommended_action}`};
  const meds=logs.flatMap(l=>l.meds_taken),events={YELLOW:0,ORANGE:0,RED:0};
  assessments.forEach(x=>{if(x.level!=="GREEN")events[x.level]++;});
  const vitals=["weight_lb","bp_systolic","bp_diastolic","heart_rate","spo2","temp_f","glucose"] as const;
  return {id,day:p.day,care_plan:p.care_plan,protocol:protocols[p.care_plan.primary_condition],logs,assessments,current_assessment:a,cases:p.cases,summary,discharge_summary_raw:p.discharge_summary_raw,report:{available:p.day===7,days_monitored:logs.length,medication_adherence_pct:meds.length?Math.round(meds.filter(m=>m.taken).length/meds.length*100):0,events,human_interventions:p.cases.flatMap(c=>c.events).filter(e=>e.state==="ACTED").length,vital_trends:vitals.map(v=>{const latest=logs.at(-1)![v],initial=logs.find(l=>l[v]!==null)?.[v];return {vital:v,direction:latest===null||initial==null?"not recorded":Math.abs(latest-initial)<.2?"stable":latest>initial?"rising":"falling",baseline:p.care_plan.discharge_baseline[v],latest};}),symptom_log:logs.map(l=>({day:l.day,symptoms:l.symptoms})),cases:p.cases,follow_up:p.care_plan.follow_up.map(f=>({...f,status:"Scheduled in discharge plan; attendance not verified"})),trajectory:`Over ${logs.length} monitored days, ${first}'s recorded recovery moved from ${assessments[0].level} to ${a.level}. ${a.rationale.join(" ")} ${p.cases.filter(c=>c.state!=="RESOLVED").length} care gaps remain open. Acknowledgement alone is not resolution.`}};
 }
 async demo(action:string,id=this.selected){
  if(action==="reset"||action==="load"){this.reset();return this.state();}
  const p=this.get(id);this.selected=id;
  if(action==="select")return this.state();
  const target=action==="jump"?7:Math.min(p.day+1,7);
  while(p.day<target){p.day++;this.record(p,await assess(p.care_plan,p.logs.slice(0,p.day)));}
  return this.state();
 }
 async log(id:string,fields:LogInput["fields"]){
  const p=this.get(id); const day=p.logs[p.day-1]; const update=structuredClone(fields);
  for(const [key,value] of Object.entries(update)){
   if(typeof value==="number"&&(!Number.isFinite(value)||value<0||value>100000))throw new DomainError(400,`Invalid ${key}`);
  }
  if(update.meds_taken){
   const allowed=p.care_plan.medications.map(m=>m.name);
   if(update.meds_taken.some(m=>!allowed.includes(m.med_name)))throw new DomainError(400,"Medication not present in the discharge plan");
  }
  if(update.med_verification){
   const v=update.med_verification;const med=p.care_plan.medications.find(m=>m.name===(v.med_name??p.care_plan.medications[0]?.name));
   if(!med||!med.dose)throw new DomainError(400,"Select a medication with a documented discharge dose");
   const normalize=(s:string)=>s.toLowerCase().replace(/\s+/g,"").trim();
   v.med_name=med.name;v.expected_dose=med.dose;v.mismatch=v.checked&&normalize(v.label_dose)!==normalize(med.dose);
  }
  Object.assign(day,update);
  this.record(p,await assess(p.care_plan,p.logs.slice(0,p.day)));
  for(const c of p.cases)if(c.state==="ACTED")c.resolution_check=this.check(p,c);
  return this.detail(id);
 }
 check(p:Stored,c:CareCase):CareCase["resolution_check"]{
  const ack=c.events.some(e=>e.state==="ACKNOWLEDGED"&&e.actor===c.who_should_act);
  const act=c.events.some(e=>e.state==="ACTED"&&e.actor===c.who_should_act&&e.note.trim().length>0);
  if(!ack||!act)return {status:"OPEN",reason:"The routed human must acknowledge and document an action.",next_check_hours:4};
  const latest=p.logs[p.day-1],a=p.assessments[p.day-1];
  // A later observation is necessary; clicking through a timeline is not recovery.
  const actedAt=[...c.events].reverse().find(e=>e.state==="ACTED")!.timestamp;
  const documented=c.events.some(e=>(e.actor==="nurse"||e.actor==="physician")&&e.timestamp>=actedAt&&e.note.startsWith("EXPECTED STATE DOCUMENTED: "));
  const atDetection=p.logs[c.day-1];
  const vitals=["bp_systolic","bp_diastolic","heart_rate","weight_lb","spo2","temp_f","glucose"] as const;
  const measured=vitals.filter(k=>atDetection[k]!==null&&p.care_plan.discharge_baseline[k]!==null);
  const closer=measured.some(k=>latest[k]!==null&&Math.abs(latest[k]!-p.care_plan.discharge_baseline[k]!)<Math.abs(atDetection[k]!-p.care_plan.discharge_baseline[k]!));
  const notWorse=measured.every(k=>latest[k]!==null&&Math.abs(latest[k]!-p.care_plan.discharge_baseline[k]!)<=Math.abs(atDetection[k]!-p.care_plan.discharge_baseline[k]!));
  const gapCleared=(atDetection.med_verification.mismatch&&latest.med_verification.checked&&!latest.med_verification.mismatch)||latest.symptoms.length<atDetection.symptoms.length;
  const eveningSafe=atDetection.bp_evening_systolic==null||(latest.bp_evening_systolic!=null&&latest.bp_evening_systolic>90&&latest.bp_evening_systolic<180);
  const improved=p.day>c.day&&rank[a.level]<rank[c.level]&&!latest.med_verification.mismatch&&a.triggered_hard_rules.length===0&&notWorse&&eveningSafe&&(closer||gapCleared);
  return documented||improved?{status:"RESOLVED",reason:documented?"A clinician documented that the current state is expected, after correct-role action.":"A subsequent observation improved after correct-role acknowledgement and action.",next_check_hours:0}:{status:"ACTED_UNRESOLVED",reason:"Acknowledged is not resolved — underlying signals have not yet returned toward baseline. Auto-recheck scheduled.",next_check_hours:4};
 }
 transition(id:string,input:TransitionInput){
  const p=[...this.patients.values()].find(p=>p.cases.some(c=>c.id===id));if(!p)throw new DomainError(404,"Case not found");
  const c=p.cases.find(c=>c.id===id)!;
  if(input.expected_state&&input.expected_state!==c.state)throw new DomainError(409,"Case changed; refresh before acting");
  const states=["DETECTED","NOTIFIED","ACKNOWLEDGED","ACTED","RESOLVED"];
  if(states.indexOf(input.state)!==states.indexOf(c.state)+1)throw new DomainError(409,"Case states must advance sequentially");
  if(["ACKNOWLEDGED","ACTED"].includes(input.state)&&input.actor!==c.who_should_act)throw new DomainError(409,`The ${c.who_should_act} must acknowledge and act`);
  if(!input.note.trim())throw new DomainError(400,"A documented note is required");
  if(input.clinician_expected&&!["nurse","physician"].includes(input.actor))throw new DomainError(409,"Only a nurse or physician may document an expected clinical state");
  const event={timestamp:now(),state:input.state,actor:input.actor,note:input.clinician_expected?`EXPECTED STATE DOCUMENTED: ${input.note}`:input.note};
  if(input.state==="RESOLVED"){
   if(![c.who_should_act,"nurse","physician"].includes(input.actor))throw new DomainError(409,"Only the routed role or a clinician can verify resolution");
   const check=this.check({...p,cases:p.cases},{...c,events:[...c.events,event]});
   if(check.status!=="RESOLVED")throw new DomainError(409,check.reason);
   c.resolution_check=check;
  }
  c.events.push(event);c.state=input.state;
  if(input.state==="ACTED"){
   c.resolution_check=this.check(p,c);
   const recheck=()=>{
    if(c.state!=="ACTED"){this.rechecks.delete(c.id);return;}
    c.resolution_check=this.check(p,c);
    if(c.resolution_check.status!=="RESOLVED"){
     const timer=setTimeout(recheck,c.resolution_check.next_check_hours*3600000);timer.unref();this.rechecks.set(c.id,timer);
    }else this.rechecks.delete(c.id);
   };
   const timer=setTimeout(recheck,4*3600000);timer.unref();this.rechecks.set(c.id,timer);
  }
  return this.detail(p.care_plan.patient.id);
 }
  confirm(plan:CarePlan){
  const id=`intake-${randomUUID().slice(0,8)}`;const care_plan=structuredClone(plan);care_plan.patient.id=id;
   const logs:DayLog[]=Array.from({length:7},(_,i)=>({day:i+1,date:new Date(Date.now()+i*86400000).toISOString().slice(0,10),bp_systolic:null,bp_diastolic:null,heart_rate:null,weight_lb:null,spo2:null,temp_f:null,glucose:null,pain_score:null,sleep_hours:null,activity_steps:null,meds_taken:care_plan.medications.map(m=>({med_name:m.name,taken:false,time:null})),med_verification:{checked:false,label_dose:"",expected_dose:"",mismatch:false},symptoms:[],free_text_note:"No home readings recorded yet.",source:null,observed_at:null,last_synced_at:null}));
  // No observed dose is not the same as a missed dose: begin with no reports.
  logs.forEach(l=>l.meds_taken=[]);
  const p:Stored={care_plan,day:1,logs,assessments:[],cases:[],discharge_summary_raw:"Confirmed intake care plan."};this.patients.set(id,p);this.selected=id;this.record(p,assessCached(care_plan,logs.slice(0,1)));return this.detail(id);
 }
}
export const store=new AgewellStore();