// Checks for the Batch E2 explorers (run: node tests/explore.test.js)
global.window = undefined;
const S = require('../assets/sims.js');
require('../assets/explore.js');
const E = S.EXPLORE; let n = 0;
function ok(c, m) { n++; if (!c) { console.error('FAIL: ' + m); process.exit(1); } }
const T = E.TERMS;
ok(Object.keys(T).length === 11, '11 Incoterms');
Object.keys(T).forEach(k => { ok(/^[SBO]{9}$/.test(T[k].costs), k + ' has 9 legs'); ok(T[k].risk >= 0 && T[k].risk <= 9, k + ' risk in range'); });
ok(T.EXW.costs.indexOf('S') === -1, 'EXW: buyer pays all');
ok(T.DDP.costs[6] === 'S' && T.DAP.costs[6] === 'B', 'only DDP seller pays import duty');
ok(T.DPU.costs[8] === 'S' && Object.keys(T).filter(k => T[k].costs[8] === 'S').length === 1, 'only DPU seller unloads');
ok(['CIF', 'CIP'].every(k => T[k].costs[5] === 'S') && Object.keys(T).filter(k => T[k].costs[5] === 'S').length === 2, 'only CIF and CIP need seller insurance');
ok(['FAS', 'FOB', 'CFR', 'CIF'].every(k => T[k].mode === 'Sea only'), 'sea-only terms');
ok(T.FOB.risk === T.CFR.risk && T.CFR.risk === T.CIF.risk, 'FOB/CFR/CIF risk on board');
ok(T.FCA.risk === T.CPT.risk && T.CPT.risk === T.CIP.risk, 'FCA/CPT/CIP risk at first carrier');
E.QUIZ.forEach((q, i) => { ok(q.o.indexOf(q.a) !== -1, 'quiz ' + i + ' answer in options'); q.o.forEach(o => ok(T[o], 'quiz option ' + o)); });
// slotting: best layout is the true minimum (sorted assignment), and beats the start
const start = E.PICKS.map((p, i) => i), best = E.bestLayout();
ok(new Set(best).size === 12, 'best layout uses each item once');
ok(E.walk(best) < E.walk(start), 'best beats start');
for (let t = 0; t < 2000; t++) { const l = best.slice(), a = t % 12, b = (t * 7 + 3) % 12; [l[a], l[b]] = [l[b], l[a]]; ok(E.walk(l) >= E.walk(best), 'no swap beats best'); }
// route planner
const sug = E.suggest();
ok(sug.length === E.PLACES.length && new Set(sug).size === sug.length, 'suggested route visits each stop once');
const r = E.runRoute(sug), rev = E.runRoute(E.PLACES.map(p => p.id));
ok(r.km > 0 && r.km <= rev.km, 'suggested route no longer than list order');
ok(r.late.length === 0, 'suggested route meets the windows');
ok(S.SIMS.length === 8, '8 simulations registered');
console.log(n + ' explorer checks passed');
