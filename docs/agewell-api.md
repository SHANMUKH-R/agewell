# AgeWell API contract — ready

The complete contract lives in `lib/api-spec/openapi.yaml`; generated hooks are in `@workspace/api-client-react`. All JSON endpoints are prefixed `/api/agewell`. Margaret's id is `margaret`.

- GET `/state` → `{synthetic:true,selected_patient_id,ai_mode,counts:{GREEN,YELLOW,ORANGE,RED},patients:PatientRow[]}`. Rows have id/name/age/primary_condition/diagnosis/day/level/headline/who_should_act/ai_mode. Sorted by severity.
- GET `/patients/:id` → PatientDetail `{id,day,care_plan,protocol:{name,label,vitals,symptoms},logs,assessments,current_assessment,cases,summary:{patient_summary,clinical_summary},report,discharge_summary_raw}`. Logs/assessments include only elapsed days. CarePlan, DayLog, Assessment and Case use the prompt's exact snake_case fields. DayLog adds nullable pain_score. Medication verification optionally has med_name.
- POST `/demo` `{action:"load"|"advance"|"jump"|"reset",patient_id?}` → Dashboard. Defaults Margaret. Load/reset restore demo; advance one day; jump evaluates all remaining days to 7.
- POST `/patients/:id/log` `{fields:{...partial DayLog}}` → PatientDetail. Supports vitals, symptoms, meds_taken, med_verification, free_text_note, sleep_hours/activity_steps/pain_score. Verification mismatch and expected dose are recomputed server-side.
- POST `/cases/:id/transition` `{state,actor,note,expected_state?,clinician_expected?}` → PatientDetail. Actors patient/caregiver/pharmacist/nurse/physician/emergency. State changes sequentially; expected_state is optimistic concurrency. Correct routed role must acknowledge and act. ACTED triggers verification, not automatic resolution. RESOLVED needs recovery or a nurse/physician's explicit clinician_expected=true plus a documented note. Failed transitions return 409. Notifications are simulated.
- GET `/intake/sample` → `{text}` exact Margaret discharge text.
- POST `/intake/extract` `{text}` OR `{filename,file_base64}` for .txt/.pdf → `{care_plan,ai_mode,warnings}`. File base64 is raw, no data URI prefix. Unsupported documents return 422 with explicit `{error}`; never substitute Margaret for arbitrary input.
- POST `/intake/confirm` `{care_plan}` → PatientDetail, selected for monitoring.

Report fields: available (day 7), days_monitored, medication_adherence_pct, events:{YELLOW,ORANGE,RED}, human_interventions, vital_trends:[{vital,direction,baseline,latest}], symptom_log:[{day,symptoms}], cases, follow_up:[{provider,specialty,due_date,status}], trajectory.

Errors are `{error:string}` with 400 invalid input / 404 missing / 409 transition conflict / 422 unsupported intake. All medication doses are transcribed ground truth only. Assessments never provide dosing advice. RED asks a human to call 911; no automatic emergency calls. No real notifications or database.

Condition-specific DayLog and LogInput.fields optionally include `meal_note`, `wound_check`, `mobility_note`, and `activity_tolerance` (strings), plus `bp_evening_systolic` and `bp_evening_diastolic` (number or null). Existing logs may omit these fields. Medication timing remains `meds_taken[].time`. Either morning or evening systolic BP can trigger the high/low RED hard rule; a normal morning reading cannot mask an unsafe evening reading.

Live intake grounding is conservative: diagnoses, chronic conditions, caregiver facts, follow-up provider/specialty/date, restrictions, monitoring instructions, and red flags must be literal source excerpts (case/whitespace normalized). Unsubstantiated paraphrases or inferred facts return 422. Preserve source date notation; absent facts stay null/empty rather than being fabricated.