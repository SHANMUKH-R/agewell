import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CarePlan, DayLog, Assessment } from "@workspace/api-zod";
import { assessCached, assessmentFingerprint, dataFile } from "../../src/lib/agewell-engine";
const source=JSON.parse(dataFile("seed.json")) as {patients:{care_plan:CarePlan;logs:DayLog[]}[]};
const fallback=JSON.parse(dataFile("fallback-assessments.json"));
const precomputed:Record<string,Assessment>={};
for(const p of source.patients.slice(0,5)){
 for(let day=1;day<=7;day++){
  const logs=p.logs.slice(0,day);
  precomputed[assessmentFingerprint(p.care_plan,logs)]=assessCached(p.care_plan,logs);
 }
}
writeFileSync(resolve("server/data/fallback-assessments.json"),JSON.stringify({...fallback,precomputed},null,2));