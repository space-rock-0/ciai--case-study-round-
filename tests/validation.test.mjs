import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generate,validate,requireValid,csv} from '../src/core.mjs';
import {readCSV,loadSources} from '../src/io.mjs';
let cfg=JSON.parse(fs.readFileSync('config.json','utf8'));
test('generated dataset passes contract',()=>{let {weeks,rows}=generate(cfg);assert.equal(requireValid(weeks,rows,cfg).passed,true);});
const corruptions={
 'duplicate week':(w,r)=>w.push({...w[0]}),
 'weekly gap':w=>w.splice(10,1),
 'non-Monday label':w=>w[0].week_start='2019-12-31',
 'invalid date':w=>w[0].week_start='bad',
 'nonexistent date':w=>w[0].week_end='2020-02-30',
 'wrong interval':w=>w[0].week_end=w[0].week_start,
 'negative spend':w=>w[0].tv=-1,
 'infinite spend':w=>w[0].tv=Infinity,
 'missing source field':w=>delete w[0].tv,
 'duplicate month':(w,r)=>r[5].month=r[4].month,
 'month gap':(w,r)=>r.splice(6,1),
 'invalid month':(w,r)=>r[0].month='2020-13',
 'weekly sales pretending to be monthly':(w,r)=>r[0].month='2020-01-06',
 'nonfinite sales':(w,r)=>r[0].sales=NaN,
 'negative digital':(w,r)=>r[0].digital=-1,
 'missing end coverage':w=>w.pop()
};
for(let [label,mutate] of Object.entries(corruptions))test('rejects '+label,()=>{let {weeks,rows}=generate(cfg);mutate(weeks,rows);assert.throws(()=>requireValid(weeks,rows,cfg));});
test('rejects wrong units',()=>{let {weeks,rows}=generate(cfg);assert.throws(()=>requireValid(weeks,rows,{...cfg,spendUnit:'unknown'}));});
test('finite negative sales permitted',()=>{let {weeks,rows}=generate(cfg);rows[0].sales=-5;assert.equal(validate(weeks,rows,cfg).passed,true);});
test('CSV reader rejects schema and empty numeric fields',()=>{let dir=fs.mkdtempSync(path.join(os.tmpdir(),'calendar-test-')),file=path.join(dir,'test.csv');try{fs.writeFileSync(file,'month,digital\n2021-01,\n');assert.throws(()=>readCSV(file,['month','digital']));assert.throws(()=>readCSV(file,['month','sales']));}finally{fs.rmSync(dir,{recursive:true});}});
test('raw source round trip and duplicate monthly sales rejection',()=>{let dir=fs.mkdtempSync(path.join(os.tmpdir(),'calendar-join-')).replaceAll('\\','/'),{weeks,rows}=generate(cfg);try{csv(dir+'/tv_weekly.csv',weeks);csv(dir+'/digital_email_monthly.csv',rows.map(({month,digital,email})=>({month,digital,email})));let sales=rows.map(({month,sales})=>({month,sales}));csv(dir+'/sales_monthly.csv',sales);let loaded=loadSources(dir);assert.equal(requireValid(loaded.weeks,loaded.rows,cfg).passed,true);sales[1].month=sales[0].month;csv(dir+'/sales_monthly.csv',sales);assert.throws(()=>loadSources(dir));}finally{fs.rmSync(dir,{recursive:true});}});
