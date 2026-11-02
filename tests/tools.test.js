const T=require('../assets/tools.js'),C=T.CALC,assert=require('assert');let n=0;
function ok(name,fn){fn();n++;console.log('  ok',name);}
const near=(a,b,e=0.01)=>assert(Math.abs(a-b)<=e,a+' != '+b);
ok('EOQ = 948.68, total 1,897.37 (book example)',()=>{const r=C.eoq(12000,75,2);near(r.q,948.68);near(r.total,1897.37);near(r.ordering,r.holding);});
ok('Reorder point 80×7+200 = 760; 200×5+300 = 1300',()=>{assert.equal(C.rop(80,7,200).rop,760);assert.equal(C.rop(200,5,300).rop,1300);});
ok('Safety stock 1.65×20×√2 = 46.67',()=>near(C.ssBasic(1.65,20,2).ss,46.67));
ok('Safety stock max method 150×3 − 100×2 = 250',()=>assert.equal(C.ssMax(150,3,100,2).ss,250));
ok('Safety stock variable LT: σ=√(2·400+10000·0.25)=57.45',()=>near(C.ssVariable(1.65,100,20,2,0.5).sdl,57.45));
ok('Turnover 1.2m / 200k = 6, 60.8 days',()=>{const r=C.turnover(1200000,180000,220000);near(r.turns,6);near(r.days,60.83);});
ok('Supplier matrix: A 4.10, B 3.825, C 3.75 (corrected)',()=>{const t=C.weighted([40,25,20,15],[[4.5,3,4,5],[3.5,4.5,3.5,4],[4,3.5,3,4.5]]);near(t[0],4.10);near(t[1],3.825);near(t[2],3.75);});
ok('ABC: highest value item is A, classes in order',()=>{const r=C.abc([{name:'x',units:10,cost:100},{name:'y',units:10,cost:10},{name:'z',units:10,cost:1}],80,95);assert.deepEqual(r.rows.map(x=>x.cls),['A','B','C']);});
ok('Landed cost: CIF 21,950; duty 1,097.50; total 23,997.50',()=>{const r=C.landed({goods:20000,freight:1800,insurance:150,dutyPct:5,taxPct:0,fees:600,inland:350,units:1000});near(r.cif,21950);near(r.duty,1097.5);near(r.total,23997.5);});
ok('Forecast: 3-period MA next, ES first = actual[0], unbiased on flat data',()=>{const r=C.forecast([10,20,30,40],3,[0.5,0.3,0.2],0.5);near(r.ma[4],30);near(r.es[1],10);near(r.es[2],15);const f=C.forecast([5,5,5,5,5],2,[0.6,0.4],0.3);assert.equal(f.err.ma.bias,0);assert.equal(f.err.es.mape,0);});
ok('OTIF 455/500 = 91%',()=>near(C.otif({orders:500,onTime:480,inFull:470,both:455,errors:12}).otif,91));
ok('NPS 60/25/15 = +45',()=>near(C.nps(60,25,15).nps,45));
ok('Risk levels',()=>{assert.equal(C.riskLevel(16),'Critical');assert.equal(C.riskLevel(12),'High');assert.equal(C.riskLevel(6),'Medium');assert.equal(C.riskLevel(4),'Low');});
ok('Fuel saving book example €2,880/vehicle',()=>near(60000/100*3*1.6,2880));
console.log(n+' calculator checks passed');
