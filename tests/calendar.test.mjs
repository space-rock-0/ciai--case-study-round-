import test from 'node:test';
import assert from 'node:assert/strict';
import {allocate,sum,generate,date,DAY,iso} from '../src/core.mjs';
const week=(start,tv=70000)=>({week_start:start,week_end:iso(new Date(+date(start)+6*DAY)),tv});
for(let [name,start,expected] of [
 ['month boundary','2026-06-29',{'2026-06':20000,'2026-07':50000}],
 ['year boundary','2025-12-29',{'2025-12':30000,'2026-01':40000}],
 ['leap year','2024-02-26',{'2024-02':40000,'2024-03':30000}],
 ['whole week','2026-06-08',{'2026-06':70000}]
])test(name,()=>assert.deepEqual(allocate([week(start)]),expected));
test('faulty path demonstrably assigns entire week to Monday month',()=>assert.deepEqual(allocate([week('2026-06-29')],true),{'2026-06':70000}));
test('zero-spend boundary remains zero',()=>assert.ok(Object.values(allocate([week('2026-06-29',0)])).every(x=>x===0)));
test('full generated spend is conserved before cropping',()=>{let {weeks}=generate(cfg);assert.ok(Math.abs(sum(Object.values(allocate(weeks)))-sum(weeks.map(x=>x.tv)))<1e-7);});
const cfg={seed:42,analysisStart:'2021-01-01',analysisMonths:60,warmupMonths:12};
test('cropped-window total equals explicit daily overlap',()=>{let {weeks}=generate(cfg),a=allocate(weeks),start=+date('2021-01-01'),end=+date('2026-01-01'),direct=sum(weeks.map(w=>sum(Array.from({length:7},(_,i)=>{let d=+date(w.week_start)+i*DAY;return d>=start&&d<end?w.tv/7:0;}))));assert.ok(Math.abs(sum(Object.entries(a).filter(([m])=>m>='2021-01'&&m<'2026-01').map(([,v])=>v))-direct)<1e-7);});
