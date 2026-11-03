import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {save} from '../src/core.mjs';
// A fresh, isolated directory proves that generated files are not hidden inputs.
let dir=fs.mkdtempSync(path.join(os.tmpdir(),'two-calendars-clean-'));
for(let item of ['config.json','package.json','scripts','src','specs'])fs.cpSync(path.resolve(item),path.join(dir,item),{recursive:true});
// Reuse genuine API evidence when present; a clean replay needs no credential/network.
const liveReviewPath='outputs/llm_live_review.json';
if(fs.existsSync(liveReviewPath)){fs.mkdirSync(path.join(dir,'outputs'),{recursive:true});fs.copyFileSync(liveReviewPath,path.join(dir,liveReviewPath));}
let started=new Date().toISOString(),run=spawnSync(process.execPath,['scripts/run_pipeline.mjs','--seed','42','--bootstrap','200'],{cwd:dir,encoding:'utf8'});
if(run.status!==0){console.error(run.stderr);throw Error('Clean reproduction failed; preserved at '+dir);}
let ref=JSON.parse(fs.readFileSync('outputs/model_results.json','utf8')),fresh=JSON.parse(fs.readFileSync(path.join(dir,'outputs/model_results.json'),'utf8'));
const numerical=x=>JSON.stringify({config:x.config,results:x.results,changes:x.pairedChanges,truth:x.truthScenarios,calendar:x.calendar,schedule:x.schedule});
const hash=x=>crypto.createHash('sha256').update(numerical(x)).digest('hex');let same=hash(ref)===hash(fresh);
save('outputs/reproducibility.json',{started,completed:new Date().toISOString(),cleanDirectory:dir,command:'node scripts/run_pipeline.mjs --seed 42 --bootstrap 200',reviewEvidence:fs.existsSync(liveReviewPath)?'Genuine OpenAI API response replayed offline':'Genuine original Codex-context response replayed offline',exitCode:run.status,numericalReferenceSha256:hash(ref),numericalFreshSha256:hash(fresh),numericallyIdentical:same,scope:'All estimates, intervals, diagnostics, candidate sensitivities, scenarios, config, paired changes, truth scenarios and calendar values. Timestamps excluded.',cleanup:'Isolated temporary directory retained for audit; no user files removed.'});
console.log(same?'Clean end-to-end reproduction exactly matches every saved numerical result.':'Reproduction differs; investigate outputs/reproducibility.json');if(!same)process.exitCode=1;
