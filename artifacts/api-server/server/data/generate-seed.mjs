import { readFileSync, writeFileSync } from "node:fs";
const prompt = readFileSync(new URL("../../../../attached_assets/agewell-replit-build-prompt_1789834918722.md", import.meta.url), "utf8");
const raw = prompt.slice(prompt.indexOf('"MERCY GENERAL HOSPITAL') + 1, prompt.indexOf('09/26/2026."') + '09/26/2026.'.length);
const baseline={bp_systolic:118,bp_diastolic:72,heart_rate:68,weight_lb:154.2,spo2:96,temp_f:98.2,glucose:null};
const medications=[
 ["Metoprolol succinate","25 mg","once daily","morning",true,"12.5 mg"],
 ["Furosemide","40 mg","once daily","morning",true,null],
 ["Lisinopril","10 mg","once daily","morning",false,null],
 ["Metformin","500 mg","twice daily","morning and evening",false,null],
 ["Atorvastatin","20 mg","nightly","evening",false,null]
].map(([name,dose,frequency,time_of_day,changed_at_discharge,previous_dose])=>({name,dose,frequency,time_of_day,changed_at_discharge,previous_dose}));
const plan={patient:{id:"margaret",name:"Margaret Ellis",age:78,lives_alone:true},caregiver:{name:"Dana Ellis",relation:"daughter",phone:null,distance_miles:430},admission_reason:"Acute decompensated heart failure with volume overload.",discharge_diagnoses:["Heart failure with reduced ejection fraction (HFrEF, EF 38%)","Essential hypertension","Type 2 diabetes mellitus","Stage 3a chronic kidney disease"],chronic_conditions:["HFrEF","Hypertension","Type 2 diabetes","Stage 3a chronic kidney disease"],primary_condition:"CHF",medications,discharge_baseline:baseline,monitoring_instructions:[{what:"Weight",frequency:"Every morning before breakfast, same scale, after using the bathroom",threshold_text:"3 lb in one day or 5 lb in one week"},{what:"Blood pressure",frequency:"Twice daily, morning and evening",threshold_text:null}],red_flag_symptoms:["increased shortness of breath","difficulty breathing lying flat","new or worsening swelling in legs or ankles","dizziness or lightheadedness","chest pain","fainting"],follow_up:[{provider:"Dr. Alan Reyes",specialty:"Cardiology",due_date:"2026-09-19"},{provider:"Dr. Priya Nair",specialty:"Primary care",due_date:"2026-09-26"}],diet_activity_restrictions:["Low sodium diet, under 2 g daily","Fluid restriction 1.5 L daily"]};
const rows=[
 [120,74,70,154,96,98.1,[],"Feeling alright. Slept okay."],
 [118,72,69,154.3,97,98.3,[],"Went to the mailbox and back."],
 [122,75,71,154.1,96,98,[],"Good day."],
 [119,73,72,154.6,96,98.2,[],"A little tired but fine."],
 [124,76,78,155.9,95,98.4,["mild fatigue"],"Feet felt a bit puffy in my shoes."],
 [131,80,84,156.8,94,98.3,["mild fatigue","ankle swelling","dizziness on standing"],"Got lightheaded getting up from the chair. Didn't go down for the mail today."],
 [138,84,91,157.8,93,98.5,["fatigue","ankle swelling","dizziness on standing","short of breath climbing stairs"],"I think I already took the blue one this morning. Stairs were harder than usual."]
];
function logs(p,values=rows){return values.map(([bp_systolic,bp_diastolic,heart_rate,weight_lb,spo2,temp_f,symptoms,free_text_note],i)=>({day:i+1,date:`2026-09-${String(13+i).padStart(2,"0")}`,bp_systolic,bp_diastolic,heart_rate,weight_lb,spo2,temp_f,glucose:null,pain_score:null,sleep_hours:null,activity_steps:null,meds_taken:p.medications.flatMap(m=>m.frequency==="twice daily"?[{med_name:m.name,taken:true,time:"08:00"},{med_name:m.name,taken:true,time:"18:00"}]:[{med_name:m.name,taken:true,time:m.time_of_day==="evening"?"20:00":"08:00"}]),med_verification:{checked:i===6,label_dose:i===6?"50 mg":"",expected_dose:i===6?"25 mg":"",mismatch:i===6,med_name:"Metoprolol succinate"},symptoms,free_text_note}));}
const patients=[{care_plan:plan,day:1,logs:logs(plan),discharge_summary_raw:raw}];
function cohort(id,name,age,primary,day,level,diagnosis){
 const p=structuredClone(plan);p.patient={id,name,age,lives_alone:false};p.caregiver={name:null,relation:null,phone:null,distance_miles:null};p.primary_condition=primary;p.admission_reason=diagnosis;p.discharge_diagnoses=[diagnosis];p.chronic_conditions=[];p.medications=[];p.follow_up=[];p.diet_activity_restrictions=[];
 p.discharge_baseline={bp_systolic:128,bp_diastolic:78,heart_rate:74,weight_lb:166,spo2:95,temp_f:98.2,glucose:120};
 p.monitoring_instructions=[{what:primary==="COPD"?"Oxygen saturation":primary==="DIABETES"?"Glucose":primary==="POST_OP"?"Temperature and wound":"Blood pressure",frequency:"Daily",threshold_text:null}];p.red_flag_symptoms=["chest pain","confusion","fainting"];
 if(id==="alice")p.medications=[{name:"Cephalexin",dose:"500 mg",frequency:"twice daily",time_of_day:"morning and evening",changed_at_discharge:true,previous_dose:null}];
 const ls=logs(p,Array.from({length:7},(_,i)=>[128+i%3,78,74+i%2,166+i*.1,95-i%2,98.2,[],"Synthetic daily recovery check."]));
 ls.forEach((l,i)=>{l.med_verification={checked:false,label_dose:"",expected_dose:"",mismatch:false};l.glucose=120+i*2;if(level==="YELLOW"){l.symptoms=["mild fatigue"];l.heart_rate=85+i;l.weight_lb=167+i*.2;}if(level==="ORANGE")l.temp_f=100.6;if(level==="RED"){l.spo2=87;l.symptoms=["confusion"];}if(id==="alice"){l.glucose=145+i*12;l.meds_taken.forEach(m=>m.taken=false);}});
 patients.push({care_plan:p,day,logs:ls,discharge_summary_raw:"Synthetic cohort care plan; not a real discharge record."});
}
cohort("robert","Robert Vance",81,"COPD",4,"GREEN","COPD exacerbation");
cohort("alice","Alice Moreau",74,"DIABETES",3,"YELLOW","Cellulitis and type 2 diabetes");
cohort("james","James Okonkwo",69,"POST_OP",6,"GREEN","Total hip arthroplasty");
cohort("susan","Susan Park",86,"COPD",2,"RED","Community-acquired pneumonia");
const first=["Evelyn","Arthur","Dorothy","Walter","Helen","George","Ruth","Frank","Irene","Thomas","Rose","Henry","Clara","Samuel","Esther","Louis","Grace","Raymond","Nora"];
const last=["Bennett","Chen","Patel","Rivera","Williams"];
for(let i=0;i<95;i++)cohort(`patient-${i+6}`,`${first[i%19]} ${last[Math.floor(i/19)]}`,65+i%28,["CHF","DIABETES","COPD","POST_OP","HYPERTENSION"][i%5],1+i%7,i<69?"GREEN":i<87?"YELLOW":i<94?"ORANGE":"RED","Synthetic post-discharge recovery");
writeFileSync(new URL("./seed.json",import.meta.url),JSON.stringify({patients},null,2));
writeFileSync(new URL("./fallback-assessments.json",import.meta.url),JSON.stringify({
 GREEN:{headline:"Recovery is tracking with the discharge plan",recommended_action:"Continue logging your recovery observations.",who_should_act:"patient"},
 YELLOW:{headline:"Early changes deserve a closer look",recommended_action:"Caregiver review and an additional recovery check are requested.",who_should_act:"caregiver"},
 ORANGE:{headline:"Your care team should review these changes",recommended_action:"Nurse review of the recorded changes is requested within 24 hours.",who_should_act:"nurse"},
 RED:{headline:"Urgent warning signs need immediate human attention",recommended_action:"Please call 911 now. A care-team notification is simulated; AgeWell does not contact emergency services.",who_should_act:"emergency"},
 mismatch:{headline:"Medicine bottle differs from the discharge record",recommended_action:"Pharmacist review of the medication discrepancy is requested within 24 hours.",who_should_act:"pharmacist"}
},null,2));