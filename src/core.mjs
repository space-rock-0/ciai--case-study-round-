import fs from 'node:fs';
export const channels=['tv','digital','email'];
export const DAY=86400000;
export const date=s=>new Date(s+'T00:00:00Z');
export const iso=d=>d.toISOString().slice(0,10);
export const month=d=>iso(d).slice(0,7);
export function addMonths(s,n){let d=date(s); d.setUTCMonth(d.getUTCMonth()+n);return iso(d);}
export function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function normal(r){return Math.sqrt(-2*Math.log(Math.max(r(),1e-12)))*Math.cos(2*Math.PI*r());}
export const sum=a=>a.reduce((x,y)=>x+y,0);
export const mean=a=>sum(a)/a.length;
export const quantile=(a,p)=>{a=[...a].sort((x,y)=>x-y);let i=(a.length-1)*p,j=Math.floor(i);return a[j]+(a[Math.ceil(i)]-a[j])*(i-j);};
export const interval=a=>[quantile(a,.025),quantile(a,.975)];
export function save(path,obj){fs.mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});fs.writeFileSync(path,JSON.stringify(obj,null,2)+'\n');}
export function csv(path,rows){fs.mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});let keys=Object.keys(rows[0]);fs.writeFileSync(path,keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n')+'\n');}
export function allocate(weeks,naive=false){let result={};for(let w of weeks){for(let j=0;j<(naive?1:7);j++){let d=new Date(+date(w.week_start)+j*DAY),m=month(d);result[m]=(result[m]||0)+w.tv/(naive?1:7);}}return result;}
export function validate(weeks,rows,cfg){let checks=[];function check(name,ok){checks.push({name,passed:!!ok});}
 check('weekly required fields and finite nonnegative spend',weeks.length>0&&weeks.every(w=>typeof w.week_start==='string'&&typeof w.week_end==='string'&&Number.isFinite(w.tv)&&w.tv>=0));
 check('unique TV week starts',new Set(weeks.map(w=>w.week_start)).size===weeks.length);
 check('parseable canonical dates; Monday–Sunday seven-day periods',weeks.every(w=>{let s=date(w.week_start),e=date(w.week_end);return Number.isFinite(+s)&&Number.isFinite(+e)&&iso(s)===w.week_start&&iso(e)===w.week_end&&s.getUTCDay()===1&&e.getUTCDay()===0&&+e-+s===6*DAY;}));
 check('weekly continuity without gaps or overlaps',weeks.every((w,i)=>!i||+date(w.week_start)-+date(weeks[i-1].week_start)===7*DAY));
 check('monthly grain and unique periods',rows.length>0&&rows.every(r=>/^\d{4}-\d{2}$/.test(r.month)&&Number.isFinite(+date(r.month+'-01'))&&month(date(r.month+'-01'))===r.month)&&new Set(rows.map(r=>r.month)).size===rows.length);
 check('finite sales and nonnegative finite digital/email',rows.every(r=>Number.isFinite(r.sales)&&['digital','email'].every(c=>Number.isFinite(r[c])&&r[c]>=0)));
 let start=addMonths(cfg.analysisStart,-cfg.warmupMonths);check('complete ordered warm-up and analysis months',rows.length===cfg.analysisMonths+cfg.warmupMonths&&rows.every((r,i)=>r.month===addMonths(start,i).slice(0,7)));
 check('weekly coverage spans complete monthly window',weeks.length&&+date(weeks[0].week_start)<=+date(start)&&+date(weeks.at(-1).week_end)>=+date(addMonths(cfg.analysisStart,cfg.analysisMonths))-DAY);
 check('declared units match project contract',cfg.spendUnit==='simulated currency thousands'&&cfg.salesUnit==='simulated revenue units');
 let a=allocate(weeks);check('full expanded calendar spend conservation',Math.abs(sum(Object.values(a))-sum(weeks.map(w=>w.tv)))<1e-7);
 check('one-to-one month join coverage',rows.every(r=>Object.hasOwn(a,r.month)));
 return {passed:checks.every(c=>c.passed),checks};
}
export function requireValid(w,r,c){let v=validate(w,r,c);if(!v.passed)throw Error('Refresh rejected: '+v.checks.filter(x=>!x.passed).map(x=>x.name).join('; '));return v;}
export function response(spend,decay,half){let state=0;return spend.map(x=>{state=x+decay*state;return state/(half+state);});}
export function generate(cfg){let r=rng(cfg.seed),start=addMonths(cfg.analysisStart,-cfg.warmupMonths),end=addMonths(cfg.analysisStart,cfg.analysisMonths),d=date(start);while(d.getUTCDay()!==1)d=new Date(+d-DAY);let weeks=[];for(;+d<+date(end);d=new Date(+d+7*DAY)){let tv=35+45*r()+(r()<.20?90+80*r():0);weeks.push({week_start:iso(d),week_end:iso(new Date(+d+6*DAY)),tv});}
 let tv=allocate(weeks),rows=[];for(let i=0;i<cfg.analysisMonths+cfg.warmupMonths;i++){let m=addMonths(start,i).slice(0,7);rows.push({month:m,tv:tv[m],digital:90+220*r(),email:20+85*r()});}
 let parameters={tv:{decay:.45,half:550,beta:280},digital:{decay:.25,half:250,beta:210},email:{decay:.15,half:90,beta:110}},effects={};for(let c of channels)effects[c]=response(rows.map(x=>x[c]),parameters[c].decay,parameters[c].half).map(x=>x*parameters[c].beta);
 let truthRows=rows.map((x,i)=>{let baseline=430+1.1*i+28*Math.sin(2*Math.PI*i/12)+18*Math.cos(2*Math.PI*i/12),noise=normal(r)*14; x.sales=baseline+sum(channels.map(c=>effects[c][i]))+noise;return{month:x.month,baseline,noise,...Object.fromEntries(channels.map(c=>[c,effects[c][i]]))};});
 return {weeks,rows,truth:{parameters,monthly:truthRows,noiseSd:14,baseline:{intercept:430,trend:1.1,sin:28,cos:18},seed:cfg.seed}};
}
