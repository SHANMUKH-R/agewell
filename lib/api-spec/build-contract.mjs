import { writeFileSync } from "node:fs";
const str = {type:"string"}, num={type:["number","null"]}, bool={type:"boolean"};
const ref = name => ({$ref:`#/components/schemas/${name}`});
const arr = items => ({type:"array",items});
const obj = (properties, required=Object.keys(properties)) => ({type:"object",properties,required});
const enumeration = values => ({type:"string",enum:values.split("|")});
const schemas = {
 HealthStatus:obj({status:str}), Error:obj({error:str}),
 Level:enumeration("GREEN|YELLOW|ORANGE|RED"),
 Actor:enumeration("patient|caregiver|pharmacist|nurse|physician|emergency"),
 CaseState:enumeration("DETECTED|NOTIFIED|ACKNOWLEDGED|ACTED|RESOLVED"),
 Medication:obj({name:str,dose:{type:["string","null"]},frequency:{type:["string","null"]},time_of_day:{type:["string","null"]},changed_at_discharge:bool,previous_dose:{type:["string","null"]}}),
 Vitals:obj(Object.fromEntries(["bp_systolic","bp_diastolic","heart_rate","weight_lb","spo2","temp_f","glucose"].map(k=>[k,num]))),
 CarePlan:obj({
 patient:obj({id:str,name:str,age:num,lives_alone:{type:["boolean","null"]}}),
 caregiver:obj({name:{type:["string","null"]},relation:{type:["string","null"]},phone:{type:["string","null"]},distance_miles:num}),
 admission_reason:{type:["string","null"]},discharge_diagnoses:arr(str),chronic_conditions:arr(str),
 primary_condition:enumeration("CHF|DIABETES|COPD|POST_OP|HYPERTENSION"),
 medications:arr(ref("Medication")),discharge_baseline:ref("Vitals"),
 monitoring_instructions:arr(obj({what:str,frequency:{type:["string","null"]},threshold_text:{type:["string","null"]}})),
 red_flag_symptoms:arr(str),follow_up:arr(obj({provider:str,specialty:{type:["string","null"]},due_date:{type:["string","null"]}})),diet_activity_restrictions:arr(str)
 }),
 MedTaken:obj({med_name:str,taken:bool,time:{type:["string","null"]}}),
 Verification:obj({checked:bool,med_name:str,label_dose:str,expected_dose:str,mismatch:bool},["checked","label_dose","expected_dose","mismatch"]),
 DayLog:obj({day:{type:"integer"},date:str,...Object.fromEntries(["bp_systolic","bp_diastolic","heart_rate","weight_lb","spo2","temp_f","glucose","sleep_hours","activity_steps","pain_score"].map(k=>[k,num])),meds_taken:arr(ref("MedTaken")),med_verification:ref("Verification"),symptoms:arr(str),free_text_note:str}),
 Assessment:obj({day:{type:"integer"},level:ref("Level"),headline:str,rationale:arr(str),deviation_from_plan:{type:["string","null"]},who_should_act:ref("Actor"),recommended_action:str,confidence:enumeration("high|medium|low"),triggered_hard_rules:arr(str),ai_mode:enumeration("live|cached")}),
 CaseEvent:obj({timestamp:str,state:ref("CaseState"),actor:str,note:str}),
 ResolutionCheck:obj({status:enumeration("OPEN|ACTED_UNRESOLVED|RESOLVED"),reason:str,next_check_hours:{type:"integer"}}),
 CareCase:obj({id:str,patient_id:str,day:{type:"integer"},level:ref("Level"),headline:str,who_should_act:ref("Actor"),state:ref("CaseState"),events:arr(ref("CaseEvent")),resolution_check:ref("ResolutionCheck")}),
 Protocol:obj({name:str,label:str,vitals:arr(str),symptoms:arr(str)}),
 Summary:obj({patient_summary:str,clinical_summary:str}),
 Report:obj({available:bool,days_monitored:{type:"integer"},medication_adherence_pct:{type:"number"},events:obj({YELLOW:{type:"integer"},ORANGE:{type:"integer"},RED:{type:"integer"}}),human_interventions:{type:"integer"},vital_trends:arr(obj({vital:str,direction:str,baseline:num,latest:num})),symptom_log:arr(obj({day:{type:"integer"},symptoms:arr(str)})),cases:arr(ref("CareCase")),follow_up:arr(obj({provider:str,specialty:{type:["string","null"]},due_date:{type:["string","null"]},status:str})),trajectory:str}),
 PatientRow:obj({id:str,name:str,age:num,primary_condition:str,diagnosis:str,day:{type:"integer"},level:ref("Level"),headline:str,who_should_act:ref("Actor"),ai_mode:enumeration("live|cached")}),
 PatientDetail:obj({id:str,day:{type:"integer"},care_plan:ref("CarePlan"),protocol:ref("Protocol"),logs:arr(ref("DayLog")),assessments:arr(ref("Assessment")),current_assessment:ref("Assessment"),cases:arr(ref("CareCase")),summary:ref("Summary"),report:ref("Report"),discharge_summary_raw:str}),
 Dashboard:obj({synthetic:bool,selected_patient_id:str,ai_mode:enumeration("live|cached"),counts:obj({GREEN:{type:"integer"},YELLOW:{type:"integer"},ORANGE:{type:"integer"},RED:{type:"integer"}}),patients:arr(ref("PatientRow"))}),
 DemoInput:obj({action:enumeration("load|advance|jump|reset"),patient_id:str},["action"]),
 LogInput:obj({fields:obj({bp_systolic:num,bp_diastolic:num,heart_rate:num,weight_lb:num,spo2:num,temp_f:num,glucose:num,pain_score:num,sleep_hours:num,activity_steps:num,meds_taken:arr(ref("MedTaken")),med_verification:ref("Verification"),symptoms:arr(str),free_text_note:str},[])}),
 TransitionInput:obj({state:ref("CaseState"),actor:ref("Actor"),note:{type:"string",minLength:1},expected_state:ref("CaseState"),clinician_expected:bool},["state","actor","note"]),
 IntakeInput:obj({text:str,file_base64:str,filename:str},[]),
 IntakeResult:obj({care_plan:ref("CarePlan"),ai_mode:enumeration("live|cached"),warnings:arr(str)}),
 IntakeConfirmInput:obj({care_plan:ref("CarePlan")}),
 IntakeSample:obj({text:str})
};
const paths={};
// Condition-specific observations are optional for backward-compatible seed logs.
const conditionFields={
 meal_note:str,wound_check:str,mobility_note:str,activity_tolerance:str,
 bp_evening_systolic:num,bp_evening_diastolic:num,
};
Object.assign(schemas.DayLog.properties,conditionFields);
Object.assign(schemas.LogInput.properties.fields.properties,conditionFields);
function endpoint(path,method,id,response,body,param){
 const op={operationId:id,responses:Object.fromEntries([200,400,404,409,422].map(code=>[code,{description:code===200?"Success":"Error",content:{"application/json":{schema:ref(code===200?response:"Error")}}}]))};
 if(body)op.requestBody={required:true,content:{"application/json":{schema:ref(body)}}};
 if(param)op.parameters=[{name:"id",in:"path",required:true,schema:str}];
 paths[path]??={};paths[path][method]=op;
}
endpoint("/healthz","get","healthCheck","HealthStatus");
endpoint("/agewell/state","get","getAgewellState","Dashboard");
endpoint("/agewell/patients/{id}","get","getAgewellPatient","PatientDetail",null,true);
endpoint("/agewell/demo","post","runAgewellDemo","Dashboard","DemoInput");
endpoint("/agewell/patients/{id}/log","post","updateAgewellLog","PatientDetail","LogInput",true);
endpoint("/agewell/cases/{id}/transition","post","transitionAgewellCase","PatientDetail","TransitionInput",true);
endpoint("/agewell/intake/sample","get","getAgewellIntakeSample","IntakeSample");
endpoint("/agewell/intake/extract","post","extractAgewellIntake","IntakeResult","IntakeInput");
endpoint("/agewell/intake/confirm","post","confirmAgewellIntake","PatientDetail","IntakeConfirmInput");
writeFileSync(new URL("./openapi.yaml",import.meta.url),JSON.stringify({openapi:"3.1.0",info:{title:"Api",version:"1.0.0"},servers:[{url:"/api"}],paths,components:{schemas}},null,2));