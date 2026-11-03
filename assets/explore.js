/* Batch E2 explorers: Incoterms Explorer, Import Desk, Warehouse Slotting Puzzle, Doha Route Planner.
   They register themselves in LSCM_SIMS.SIMS, so they appear in My Supply Chain, Tools and Search. */
(function (root) {
  'use strict';
  var SIMS = root.LSCM_SIMS;
  if (!SIMS) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n, d) { return isFinite(n) ? Number(n).toLocaleString('en-GB', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d || 0 }) : '–'; }
  function $(s, el) { return el.querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call(el.querySelectorAll(s)); }
  function resRow(label, val, main) { return '<div class="res-row' + (main ? ' main' : '') + '"><span>' + label + '</span><b>' + val + '</b></div>'; }
  function overseas(c) { return c.suppliers.filter(function (s) { return s.kind === 'Global'; })[0] || c.suppliers[c.suppliers.length - 1]; }
  function local(c) { return c.suppliers.filter(function (s) { return s.kind === 'Local'; })[0] || c.suppliers[0]; }

  // ===================================================== 1. Incoterms ====
  // Who pays for each part of the journey. S = seller, B = buyer, O = no one has to (optional; the one carrying the risk usually buys it).
  // Named place for C and D terms: the buyer's warehouse in Doha (any-mode terms) or Hamad Port (sea terms).
  var LEGS = ['Packing and loading at the seller', 'Export clearance', 'Transport to the main carrier', 'Loading onto the ship / main transport',
    'Main transport (freight)', 'Cargo insurance', 'Import clearance and duties', 'Transport to the buyer’s place', 'Unloading at the buyer’s place'];
  var TERMS = {
    EXW: { name: 'Ex Works', mode: 'Any mode', costs: 'BBBBBOBBB', risk: 0, place: 'Seller’s premises',
      say: 'The seller only makes the goods ready at its own site. You (the buyer) do everything else, even loading and export clearance.', tip: 'Hard for foreign buyers: you must clear export in the seller’s country. FCA is usually better.' },
    FCA: { name: 'Free Carrier', mode: 'Any mode', costs: 'SSSBBOBBB', risk: 3, place: 'Your carrier’s terminal in the export country',
      say: 'The seller clears export and hands the goods to the carrier you chose. From there, cost and risk are yours.', tip: 'The best choice for containers: risk passes when the carrier takes the box.' },
    CPT: { name: 'Carriage Paid To', mode: 'Any mode', costs: 'SSSSSOBSB', risk: 3, place: 'Your warehouse in Doha',
      say: 'The seller pays transport to Doha, but the risk passes to you when the goods reach the first carrier.', tip: 'Watch out: the seller pays, but you carry the risk on the way. Get insurance.' },
    CIP: { name: 'Carriage and Insurance Paid To', mode: 'Any mode', costs: 'SSSSSSBSB', risk: 3, place: 'Your warehouse in Doha',
      say: 'Like CPT, and the seller must also buy insurance. Since 2020 the cover must be high (Institute Cargo Clauses A, “all risks”).', tip: 'Good for containers when the seller arranges the transport.' },
    DAP: { name: 'Delivered at Place', mode: 'Any mode', costs: 'SSSSSOBSB', risk: 8, place: 'Your warehouse in Doha',
      say: 'The seller carries cost and risk until the truck arrives at your door, ready to unload. You clear import and pay the duty.', tip: 'Common for regional trucks into Qatar.' },
    DPU: { name: 'Delivered at Place Unloaded', mode: 'Any mode', costs: 'SSSSSOBSS', risk: 9, place: 'Your warehouse in Doha',
      say: 'Like DAP, but the seller also unloads. It is the only rule where the seller must unload. (DPU replaced DAT in 2020.)', tip: 'Use it only if the seller can really unload at your site.' },
    DDP: { name: 'Delivered Duty Paid', mode: 'Any mode', costs: 'SSSSSOSSB', risk: 8, place: 'Your warehouse in Doha',
      say: 'The seller does almost everything, including import clearance and Qatar duty. You only unload.', tip: 'Easy for you, hard for a foreign seller: they must act as importer in Qatar.' },
    FAS: { name: 'Free Alongside Ship', mode: 'Sea only', costs: 'SSSBBOBBB', risk: 3, place: 'Next to the ship at the export port',
      say: 'The seller places the goods next to the ship at the export port. Loading and everything after is yours.', tip: 'Used for bulk cargo, not containers.' },
    FOB: { name: 'Free on Board', mode: 'Sea only', costs: 'SSSSBOBBB', risk: 4, place: 'On board the ship at the export port',
      say: 'The seller loads the goods on board the ship. Then cost and risk pass to you.', tip: 'Made for bulk cargo. For containers, FCA fits better.' },
    CFR: { name: 'Cost and Freight', mode: 'Sea only', costs: 'SSSSSOBBB', risk: 4, place: 'Hamad Port',
      say: 'The seller pays the sea freight to Hamad Port, but the risk passes to you once the goods are on board at the export port.', tip: 'Seller pays, you carry the risk at sea. Buy insurance.' },
    CIF: { name: 'Cost, Insurance and Freight', mode: 'Sea only', costs: 'SSSSSSBBB', risk: 4, place: 'Hamad Port',
      say: 'Like CFR, and the seller buys insurance. Only minimum cover is required (Institute Cargo Clauses C).', tip: 'Check the insurance: minimum cover may not be enough for valuable goods.' }
  };
  var TERM_ORDER = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];
  var QUIZ = [
    { q: 'You want the supplier to do everything, including paying Qatar import duty.', a: 'DDP', o: ['DAP', 'DDP', 'CIP', 'EXW'] },
    { q: 'You will collect from the supplier’s factory and do the export clearance yourself.', a: 'EXW', o: ['FCA', 'FOB', 'EXW', 'DAP'] },
    { q: 'Bulk cargo by sea. The seller pays freight to Hamad Port and must buy insurance. Risk passes when the goods are on board at the export port.', a: 'CIF', o: ['CIP', 'CFR', 'CIF', 'DAP'] },
    { q: 'A container goes by sea. The seller hands it to your forwarder’s terminal in the export country. Your forwarder books the ship.', a: 'FCA', o: ['FOB', 'FCA', 'FAS', 'EXW'] },
    { q: 'The seller must deliver to your warehouse in Doha and unload the goods.', a: 'DPU', o: ['DAP', 'DDP', 'DPU', 'CPT'] },
    { q: 'The seller pays carriage to Doha and buys “all risks” insurance. The goods travel by air.', a: 'CIP', o: ['CIF', 'CPT', 'CIP', 'DAP'] }
  ];

  function incotermsPage(el, ctx) {
    var term = 'FCA', qi = 0, score = 0, answered = false, mode = 'explore';
    function legRow(t) {
      var T = TERMS[t];
      return '<div class="ic-legs">' + LEGS.map(function (l, i) {
        var who = T.costs[i];
        return '<div class="ic-leg ic-' + who + (i < T.risk ? ' ic-riskS' : ' ic-riskB') + '"><span class="ic-n">' + (i + 1) + '</span><span class="ic-l">' + esc(l) + '</span><b>' + (who === 'S' ? 'Seller pays' : who === 'B' ? 'Buyer pays' : 'Not required') + '</b></div>' +
          (i + 1 === T.risk ? '<div class="ic-flag">◆ Risk passes to the buyer here</div>' : '');
      }).join('') + (T.risk === 0 ? '' : '') + '</div>';
    }
    function explore() {
      var T = TERMS[term];
      el.innerHTML = '<div class="ic-tabs" role="tablist">' + TERM_ORDER.map(function (t) { return '<button class="ic-tab' + (t === term ? ' on' : '') + '" data-t="' + t + '">' + t + '</button>'; }).join('') + '</div>' +
        '<div class="tool-grid sec"><div class="card pad"><div class="eyebrow muted">' + esc(T.mode) + '</div><h3 class="h3" style="margin:4px 0">' + term + ' · ' + esc(T.name) + '</h3>' +
        '<p>' + esc(T.say) + '</p><div class="results">' + resRow('Delivery point', esc(T.place)) + resRow('Risk passes', T.risk === 0 ? 'At the seller’s site, before loading' : 'After step ' + T.risk + ': ' + esc(LEGS[T.risk - 1].toLowerCase())) +
        resRow('Seller pays', T.costs.split('').filter(function (x) { return x === 'S'; }).length + ' of 9 steps', true) + '</div>' +
        '<div class="callout"><b>Tip</b>' + esc(T.tip) + '</div>' +
        '<p class="small muted">' + (T.mode === 'Sea only' ? 'Sea terms here are named at Hamad Port.' : 'Any-mode terms here are named at your warehouse in Doha (EXW and FCA at the export side).') + ' Insurance under rules other than CIF and CIP is not required, but the one who carries the risk usually buys it.</p></div>' +
        '<div class="card pad"><h3 class="h3">Who pays for each step?</h3>' + legRow(term) +
        '<div class="ic-key"><span><i class="ic-S"></i>Seller</span><span><i class="ic-B"></i>Buyer</span><span><i class="ic-O"></i>Not required</span></div></div></div>' +
        '<div class="card pad sec"><h3 class="h3">Ready? Test yourself</h3><p class="muted">Six real situations. Pick the right Incoterm.</p><button class="btn" id="icQuiz">Start the challenge</button></div>' +
        '<p class="small muted sec">Based on the ICC Incoterms® 2020 rules (iccwbo.org). Always write the rule, the named place and “Incoterms® 2020”, for example “FCA Shanghai container terminal, Incoterms® 2020”.</p>';
      $$('[data-t]', el).forEach(function (b) { b.onclick = function () { term = b.getAttribute('data-t'); explore(); }; });
      $('#icQuiz', el).onclick = function () { mode = 'quiz'; qi = 0; score = 0; quiz(); };
    }
    function quiz() {
      if (qi >= QUIZ.length) return result();
      var Q = QUIZ[qi]; answered = false;
      el.innerHTML = '<div class="card pad"><div class="eyebrow muted">Question ' + (qi + 1) + ' of ' + QUIZ.length + ' · score ' + score + '</div><h3 class="h3">' + esc(Q.q) + '</h3>' +
        '<div class="shock-acts">' + Q.o.map(function (t) { return '<button class="shock-act" data-a="' + t + '"><b>' + t + '</b><small>' + esc(TERMS[t].name) + '</small></button>'; }).join('') + '</div><div id="icFb"></div></div>';
      $$('[data-a]', el).forEach(function (b) {
        b.onclick = function () {
          if (answered) return; answered = true;
          var t = b.getAttribute('data-a'), ok = t === Q.a; if (ok) score++;
          $$('[data-a]', el).forEach(function (x) { x.disabled = true; if (x.getAttribute('data-a') === Q.a) x.classList.add('ok'); else if (x === b) x.classList.add('no'); });
          $('#icFb', el).innerHTML = '<div class="callout"><b>' + (ok ? 'Correct.' : 'Not quite. The answer is ' + Q.a + '.') + '</b>' + esc(TERMS[Q.a].say) + '</div><button class="btn" id="icNext">' + (qi + 1 < QUIZ.length ? 'Next question' : 'See my score') + '</button>';
          $('#icNext', el).onclick = function () { qi++; quiz(); };
        };
      });
    }
    function result() {
      var c = ctx.company, s = overseas(c);
      el.innerHTML = '<div class="grid g2"><div class="card pad"><div class="eyebrow muted">Result</div><h3 class="h3">' + score + ' of ' + QUIZ.length + ' correct</h3>' +
        '<p>' + (score >= 5 ? 'Excellent. You can choose Incoterms with confidence.' : score >= 3 ? 'Good start. Look again at the terms you missed.' : 'Go back to the explorer and compare where risk passes.') + '</p>' +
        '<div class="btns"><button class="btn ghost" id="icBack">Back to the explorer</button></div></div>' +
        '<div class="card pad"><h3 class="h3">Your company</h3><p class="small muted">' + esc(c.name) + ' buys from ' + esc(s.name) + ' (' + esc(s.route) + '). Which rule would you use?</p>' +
        '<label class="field"><span>My Incoterm for this supplier</span><select class="input" id="icMine">' + TERM_ORDER.map(function (t) { return '<option value="' + t + '"' + (t === (s.route.indexOf('Sea') === 0 ? 'FCA' : 'DAP') ? ' selected' : '') + '>' + t + ' · ' + esc(TERMS[t].name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>Why? (one sentence)</span><input class="input" id="icWhy" maxlength="200"></label>' +
        '<button class="btn" id="icSave">Save to My Supply Chain</button></div></div>';
      $('#icBack', el).onclick = function () { mode = 'explore'; explore(); };
      $('#icSave', el).onclick = function () { ctx.saveSim('incoterms', { quizScore: score + ' / ' + QUIZ.length, myIncoterm: $('#icMine', el).value, why: $('#icWhy', el).value.trim() }); };
    }
    explore();
  }

  // ===================================================== 2. Import Desk ====
  // Practice figures. Qatar applies the GCC common customs tariff: most goods 5% of the CIF value; some basic foods and medicines are 0%.
  function importPage(el, ctx) {
    var c = ctx.company, s = overseas(c), L = local(c);
    var qty = c.weeklyDemand * 4, price = s.cost, cartons = Math.ceil(qty / 10);
    var origin = (s.name.match(/India|Germany|China|Spain|Turkey/) || [/Europe/.test(s.name) ? 'Netherlands' : 'China'])[0];
    // the document set; three fields are wrong on purpose
    var DOCS = [
      { doc: 'Commercial invoice', fields: [['Seller', esc(s.name)], ['Buyer', esc(c.name) + ', Doha, Qatar'], ['Quantity', f(qty) + ' units'], ['Unit price', 'QAR ' + f(price, 2)], ['Total value', 'QAR ' + f(qty * price + 1000, 2), 'bad', 'Total does not match: ' + f(qty) + ' × ' + f(price, 2) + ' = QAR ' + f(qty * price, 2) + '.'], ['Country of origin', origin]] },
      { doc: 'Packing list', fields: [['Cartons', f(cartons)], ['Units', f(qty - 40) + ' units', 'bad', 'The packing list shows 40 fewer units than the invoice. Customs will ask why.'], ['Gross weight', f(cartons * 12) + ' kg'], ['Marks', esc(c.name.toUpperCase()) + ' / DOHA']] },
      { doc: 'Bill of lading', fields: [['Shipper', esc(s.name)], ['Consignee', esc(c.name)], ['Port of discharge', 'Jebel Ali, UAE', 'bad', 'Wrong port. The goods must be discharged at Hamad Port, Qatar.'], ['Container', 'MSKU 482917-3'], ['Freight', 'Prepaid']] },
      { doc: 'Certificate of origin', fields: [['Exporter', esc(s.name)], ['Origin', origin], ['Goods', esc(c.product)]] }
    ];
    var flagged = {}, checked = false, duty = 5, dwell = 3, clear = 2;
    var freight = Math.round(qty * price * 0.08), insurance = Math.round(qty * price * 0.006), port = 650, agent = 450, inland = 400;
    function docsHtml() {
      return '<div class="imp-docs">' + DOCS.map(function (d, di) {
        return '<div class="imp-doc"><h4>' + esc(d.doc) + '</h4>' + d.fields.map(function (x, fi) {
          var id = di + '-' + fi, on = flagged[id], cls = 'imp-f' + (on ? ' on' : '') + (checked ? (x[2] === 'bad' ? (on ? ' hit' : ' miss') : (on ? ' wrong' : '')) : '');
          return '<button class="' + cls + '" data-f="' + id + '"' + (checked ? ' disabled' : '') + '><span>' + esc(x[0]) + '</span><b>' + x[1] + '</b>' + (checked && x[2] === 'bad' ? '<small>' + esc(x[3]) + '</small>' : '') + '</button>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
    function counts() {
      var hit = 0, wrong = 0;
      DOCS.forEach(function (d, di) { d.fields.forEach(function (x, fi) { if (flagged[di + '-' + fi]) { if (x[2] === 'bad') hit++; else wrong++; } }); });
      return { hit: hit, wrong: wrong };
    }
    function cost() {
      var goods = qty * price, cif = goods + freight + insurance, d = cif * duty / 100, total = cif + d + port + agent + inland;
      return { goods: goods, cif: cif, duty: d, total: total, unit: total / qty, days: s.lead + dwell + clear };
    }
    function draw() {
      var k = counts(), r = cost();
      el.innerHTML = '<div class="card pad"><div class="eyebrow muted">Part 1 · Check the documents</div><h3 class="h3" style="margin:4px 0">A container of ' + esc(c.product) + ' is on its way from ' + esc(s.name) + '.</h3>' +
        '<p>Before it reaches Hamad Port, check the documents. <b>Tap every field you think is wrong.</b> There are 3 mistakes.</p>' + docsHtml() +
        '<div class="btns">' + (checked ? '<span class="chip">' + k.hit + ' of 3 found' + (k.wrong ? ' · ' + k.wrong + ' false alarm' + (k.wrong > 1 ? 's' : '') : '') + '</span><button class="btn ghost" id="impAgain">Try again</button>' : '<button class="btn" id="impCheck">Check my answers</button>') + '</div></div>' +
        '<div class="tool-grid sec"><div class="card pad tool-in"><div class="eyebrow muted">Part 2 · Landed cost and time</div><h3 class="h3" style="margin:4px 0">' + f(qty) + ' units at QAR ' + f(price, 2) + '</h3>' +
        '<p class="small muted">Freight QAR ' + f(freight) + ' · insurance QAR ' + f(insurance) + ' · port charges QAR ' + f(port) + ' · clearing agent QAR ' + f(agent) + ' · truck to your warehouse QAR ' + f(inland) + ' (practice figures)</p>' +
        '<label class="field"><span>Customs duty rate</span><select class="input" id="impDuty"><option value="5"' + (duty === 5 ? ' selected' : '') + '>5% – most goods</option><option value="0"' + (duty === 0 ? ' selected' : '') + '>0% – exempt goods</option></select></label>' +
        '<label class="field"><span>Days waiting at Hamad Port: <b>' + dwell + '</b></span><input type="range" id="impDwell" min="1" max="10" value="' + dwell + '"></label>' +
        '<label class="field"><span>Days for customs clearance: <b>' + clear + '</b></span><input type="range" id="impClear" min="1" max="7" value="' + clear + '"></label>' +
        '<p class="small muted">Most goods pay 5% (the GCC common customs tariff); some basic foods and medicines pay 0%. Duty is charged on the CIF value (goods + freight + insurance). The rate depends on the HS code: check it with Qatar customs (Al Nadeeb) or your clearing agent.</p></div>' +
        '<div class="card pad tool-out"><div class="results">' + resRow('Goods value', 'QAR ' + f(r.goods)) + resRow('CIF value (goods + freight + insurance)', 'QAR ' + f(r.cif)) + resRow('Customs duty ' + duty + '%', 'QAR ' + f(r.duty)) +
        resRow('Port, agent and truck', 'QAR ' + f(port + agent + inland)) + resRow('Total landed cost', 'QAR ' + f(r.total)) + resRow('Landed cost per unit', 'QAR ' + f(r.unit, 2), true) +
        resRow('Local supplier price', 'QAR ' + f(L.cost, 2) + ' · ' + (r.unit < L.cost ? 'import is cheaper by QAR ' + f(L.cost - r.unit, 2) : 'local is cheaper by QAR ' + f(r.unit - L.cost, 2))) +
        resRow('Order to warehouse', f(r.days) + ' days (' + s.lead + ' shipping + ' + dwell + ' port + ' + clear + ' customs)') + '</div>' +
        '<div class="callout"><b>Think about it</b>A cheaper import price is not the full story. Wrong documents can hold a container at the port for days, and every day costs storage and stock.</div>' +
        '<button class="btn" id="impSave">Save to My Supply Chain</button></div></div>';
      $$('[data-f]', el).forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-f'); flagged[id] = !flagged[id]; draw(); }; });
      var ck = $('#impCheck', el); if (ck) ck.onclick = function () { checked = true; draw(); };
      var ag = $('#impAgain', el); if (ag) ag.onclick = function () { checked = false; flagged = {}; draw(); };
      $('#impDuty', el).onchange = function () { duty = Number(this.value); draw(); };
      $('#impDwell', el).oninput = function () { dwell = Number(this.value); draw(); };
      $('#impClear', el).oninput = function () { clear = Number(this.value); draw(); };
      $('#impSave', el).onclick = function () {
        var kk = counts(), rr = cost();
        ctx.saveSim('import', { errorsFound: checked ? kk.hit + ' of 3' : 'not checked', landedUnit: +rr.unit.toFixed(2), dutyRate: duty + '%', daysToWarehouse: rr.days });
      };
    }
    draw();
  }

  // =========================================== 3. Warehouse slotting ====
  var ITEMS = {
    food: ['Yoghurt 24', 'Milk 1L', 'Laban 2L', 'Cheese slices', 'Butter', 'Cream', 'Hummus', 'Juice 1L', 'Eggs 30', 'Labneh', 'Feta tin', 'Ghee tin'],
    pharma: ['Paracetamol', 'Vitamin D', 'Cough syrup', 'Hand gel', 'Plasters', 'Ibuprofen', 'Baby formula', 'Antacid', 'Eye drops', 'Thermometer', 'Gloves box', 'Bandages'],
    online: ['Phone case', 'Charger', 'Earbuds', 'Power bank', 'Cable 1m', 'Screen guard', 'Smartwatch', 'Speaker', 'Laptop bag', 'Mouse', 'Keyboard', 'Tripod'],
    build: ['Cement 50kg', 'Tile glue', 'Screws box', 'Paint 18L', 'PVC pipe', 'Sand bag', 'Grout', 'Nails box', 'Sealant', 'Gloves', 'Tape', 'Wire roll']
  };
  var PICKS = [6, 140, 9, 58, 3, 24, 110, 15, 4, 36, 2, 80]; // picks a day, in the starting order (mixed up on purpose)
  var ROWS = 3, COLS = 4;
  function slotDist(i) { var r = Math.floor(i / COLS), col = i % COLS; return 6 + col * 7 + r * 4; } // metres from the dispatch door
  function walk(layout) { return layout.reduce(function (a, item, slot) { return a + PICKS[item] * 2 * slotDist(slot); }, 0); }
  function bestLayout() {
    var items = PICKS.map(function (p, i) { return i; }).sort(function (a, b) { return PICKS[b] - PICKS[a]; });
    var slots = PICKS.map(function (p, i) { return i; }).sort(function (a, b) { return slotDist(a) - slotDist(b); });
    var lay = []; slots.forEach(function (s, k) { lay[s] = items[k]; }); return lay;
  }
  function abc(i) { var sorted = PICKS.slice().sort(function (a, b) { return b - a; }), r = sorted.indexOf(PICKS[i]); return r < 3 ? 'A' : r < 7 ? 'B' : 'C'; }
  function slottingPage(el, ctx) {
    var names = ITEMS[ctx.company.id] || ITEMS.food, start = PICKS.map(function (p, i) { return i; }), lay = start.slice(), sel = null, moves = 0;
    var best = walk(bestLayout()), first = walk(start);
    function draw() {
      var w = walk(lay), eff = best / w * 100;
      el.innerHTML = '<div class="tool-grid"><div class="card pad"><div class="eyebrow muted">Your pick face · tap two products to swap them</div>' +
        '<div class="slot-wrap"><div class="slot-grid">' + lay.map(function (item, slot) {
          return '<button class="slot slot-' + abc(item) + (sel === slot ? ' sel' : '') + '" data-s="' + slot + '"><b>' + esc(names[item]) + '</b><small>' + PICKS[item] + ' picks/day · ' + slotDist(slot) + ' m</small><i>' + abc(item) + '</i></button>';
        }).join('') + '</div><div class="slot-door">▲ Dispatch door · nearest slots are bottom-left</div></div>' +
        '<div class="ic-key"><span><i class="slot-A"></i>A: fast movers</span><span><i class="slot-B"></i>B: medium</span><span><i class="slot-C"></i>C: slow</span></div></div>' +
        '<div class="card pad tool-out"><div class="results">' + resRow('Walking per day (there and back)', f(w / 1000, 2) + ' km', true) + resRow('Starting layout', f(first / 1000, 2) + ' km') +
        resRow('Best possible', f(best / 1000, 2) + ' km') + resRow('Your efficiency', f(eff, 0) + '%') + resRow('Swaps made', moves) + '</div>' +
        lineBar(eff) +
        '<div class="callout"><b>The rule</b>Put the fastest movers (A items) in the slots closest to the dispatch door, at waist height (“golden zone”). Slow movers (C items) go to the far end.</div>' +
        '<div class="btns"><button class="btn" id="slSave">Save to My Supply Chain</button><button class="btn ghost" id="slReset">Start again</button><button class="btn ghost" id="slShow">Show the best layout</button></div></div></div>';
      $$('[data-s]', el).forEach(function (b) {
        b.onclick = function () {
          var s = Number(b.getAttribute('data-s'));
          if (sel === null) { sel = s; } else if (sel === s) { sel = null; } else { var t = lay[sel]; lay[sel] = lay[s]; lay[s] = t; sel = null; moves++; }
          draw();
        };
      });
      $('#slReset', el).onclick = function () { lay = start.slice(); moves = 0; sel = null; draw(); };
      $('#slShow', el).onclick = function () { lay = bestLayout(); sel = null; draw(); ctx.toast('This is the ABC layout: fastest items nearest the door.'); };
      $('#slSave', el).onclick = function () { var ww = walk(lay); ctx.saveSim('slotting', { walkKmDay: +(ww / 1000).toFixed(2), efficiency: Math.round(best / ww * 100) + '%', swaps: moves }); };
    }
    function lineBar(eff) { return '<div class="meter"><span style="width:' + Math.min(100, eff).toFixed(0) + '%"></span></div><p class="small muted">' + (eff >= 99 ? 'Perfect layout.' : eff >= 90 ? 'Very close to the best layout.' : 'Keep swapping: move A items closer to the door.') + '</p>'; }
    draw();
  }

  // ============================================ 4. Doha route planner ====
  // Positions are rough kilometres from Msheireb (east = x, north = y). The map is a sketch, not to scale.
  var DEPOT = { id: 'D', name: 'Your depot · Birkat Al Awamer', x: -4, y: -18 };
  var PLACES = [
    { id: 'wb', name: 'West Bay', x: 3, y: 4 }, { id: 'pe', name: 'The Pearl', x: 6, y: 9 }, { id: 'lu', name: 'Lusail', x: 3, y: 14 },
    { id: 'wk', name: 'Al Wakrah', x: 3, y: -14 }, { id: 'ry', name: 'Al Rayyan', x: -9, y: 1, left: true }, { id: 'gh', name: 'Al Gharrafa', x: -7, y: 6 },
    { id: 'ia', name: 'Industrial Area', x: -11, y: -7 }, { id: 'sd', name: 'Al Sadd', x: -3, y: 1 }
  ];
  var CUST = { food: 'Supermarket', pharma: 'Pharmacy', online: 'Home order', build: 'Building site' };
  var WINDOWS = { lu: 600, wb: 630 }; // must arrive before 10:00 and 10:30 (minutes after midnight)
  var START = 7 * 60, SPEED = 40, STOP_MIN = 12, ROAD = 1.3, FUEL_L = 12, FUEL_QAR = 2.05, DRIVER_QAR = 40;
  function km(a, b) { return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) * ROAD; }
  function byId(id) { return id === 'D' ? DEPOT : PLACES.filter(function (p) { return p.id === id; })[0]; }
  function runRoute(order) {
    var t = START, dist = 0, prev = DEPOT, late = [], times = {};
    order.forEach(function (id) { var p = byId(id), d = km(prev, p); dist += d; t += d / SPEED * 60; times[id] = t; if (WINDOWS[id] && t > WINDOWS[id]) late.push(p.name); t += STOP_MIN; prev = p; });
    if (order.length) { var back = km(prev, DEPOT); dist += back; t += back / SPEED * 60; }
    var hours = (t - START) / 60, fuel = dist * FUEL_L / 100 * FUEL_QAR, cost = fuel + hours * DRIVER_QAR;
    return { km: dist, end: t, hours: hours, late: late, times: times, fuel: fuel, cost: cost };
  }
  function suggest() {
    // nearest-neighbour start, then 2-opt; time windows checked after, with a small penalty for lateness
    var left = PLACES.map(function (p) { return p.id; }), order = [], cur = DEPOT;
    while (left.length) { left.sort(function (a, b) { return km(cur, byId(a)) - km(cur, byId(b)); }); var n = left.shift(); order.push(n); cur = byId(n); }
    function score(o) { var r = runRoute(o); return r.km + r.late.length * 50; }
    var improved = true;
    while (improved) {
      improved = false;
      for (var i = 0; i < order.length - 1; i++) for (var j = i + 1; j < order.length; j++) {
        var o2 = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1));
        if (score(o2) < score(order) - 1e-9) { order = o2; improved = true; }
      }
    }
    return order;
  }
  function hhmm(m) { m = Math.round(m); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
  function routePage(el, ctx) {
    var order = [], showBest = false, cust = CUST[ctx.company.id] || 'Customer';
    var W = 360, H = 460;
    function X(x) { return (x + 14) / 24 * (W - 40) + 20; }
    function Y(y) { return H - 20 - (y + 21) / 38 * (H - 40); }
    function map(o, best) {
      var pts = [DEPOT].concat(o.map(byId)).concat(o.length === PLACES.length ? [DEPOT] : []);
      var line = pts.map(function (p) { return X(p.x) + ',' + Y(p.y); }).join(' ');
      var bpts = best ? [DEPOT].concat(best.map(byId)).concat([DEPOT]).map(function (p) { return X(p.x) + ',' + Y(p.y); }).join(' ') : '';
      return '<svg class="route-map" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sketch map of Doha with delivery stops">' +
        '<path d="M' + X(4) + ' 0 C ' + X(8) + ' ' + Y(10) + ', ' + X(4) + ' ' + Y(0) + ', ' + X(6) + ' ' + Y(-8) + ' S ' + X(4) + ' ' + Y(-16) + ', ' + X(7) + ' ' + H + ' L ' + W + ' ' + H + ' L ' + W + ' 0 Z" fill="#E6F2FF"/>' +
        '<text x="' + (W - 14) + '" y="' + (H / 2) + '" font-size="12" fill="#4a5675" text-anchor="end">The Gulf</text>' +
        (bpts ? '<polyline points="' + bpts + '" fill="none" stroke="#00B86B" stroke-width="3" stroke-dasharray="7 6"/>' : '') +
        (o.length ? '<polyline points="' + line + '" fill="none" stroke="#1F7BFF" stroke-width="4" stroke-linejoin="round"/>' : '') +
        '<g><rect x="' + (X(DEPOT.x) - 11) + '" y="' + (Y(DEPOT.y) - 11) + '" width="22" height="22" rx="5" fill="#14213D"/><text x="' + X(DEPOT.x) + '" y="' + (Y(DEPOT.y) + 4) + '" font-size="11" fill="#fff" text-anchor="middle" font-weight="700">D</text>' +
        '<text x="' + (X(DEPOT.x) + 16) + '" y="' + (Y(DEPOT.y) + 4) + '" font-size="12" fill="#14213D">Depot</text></g>' +
        PLACES.map(function (p) {
          var k = o.indexOf(p.id), on = k !== -1;
          return '<g class="rstop" data-p="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.name) + '"><circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="16" fill="' + (on ? '#1F7BFF' : '#fff') + '" stroke="' + (WINDOWS[p.id] ? '#FFC300' : '#1F7BFF') + '" stroke-width="3"/>' +
            '<text x="' + X(p.x) + '" y="' + (Y(p.y) + 4) + '" font-size="12" font-weight="700" text-anchor="middle" fill="' + (on ? '#fff' : '#14213D') + '">' + (on ? k + 1 : '+') + '</text>' +
            '<text x="' + (X(p.x) + (p.x > 2 || p.left ? -21 : 21)) + '" y="' + (Y(p.y) + 4) + '" font-size="12" fill="#14213D" text-anchor="' + (p.x > 2 || p.left ? 'end' : 'start') + '">' + esc(p.name) + '</text></g>';
        }).join('') + '</svg>';
    }
    function draw() {
      var r = runRoute(order), done = order.length === PLACES.length, best = showBest || done ? suggest() : null, rb = best ? runRoute(best) : null;
      el.innerHTML = '<div class="tool-grid"><div class="card pad"><div class="eyebrow muted">Tap the stops in the order your van should visit them</div>' + map(order, showBest ? best : null) +
        '<p class="small muted">Sketch map, not to scale. Gold rings have a delivery window.</p><div class="btns"><button class="btn ghost" id="rtUndo"' + (order.length ? '' : ' disabled') + '>Undo</button><button class="btn ghost" id="rtClear"' + (order.length ? '' : ' disabled') + '>Clear</button></div></div>' +
        '<div class="card pad tool-out"><h3 class="h3">8 deliveries · van leaves 07:00</h3><ul class="goals small">' +
        PLACES.map(function (p) { return '<li>' + esc(cust) + ', ' + esc(p.name) + (WINDOWS[p.id] ? ' · <b>before ' + hhmm(WINDOWS[p.id]) + '</b>' : '') + (r.times[p.id] ? ' · arrive ' + hhmm(r.times[p.id]) : '') + '</li>'; }).join('') + '</ul>' +
        '<div class="results">' + resRow('Stops planned', order.length + ' of ' + PLACES.length) + resRow('Distance (back to depot)', done ? f(r.km, 1) + ' km' : '–') + resRow('Back at depot', done ? hhmm(r.end) : '–') +
        resRow('Late deliveries', done ? (r.late.length ? r.late.join(', ') : 'None') : '–') + resRow('Route cost (fuel + driver)', done ? 'QAR ' + f(r.cost) : '–', true) +
        (rb ? resRow('Computer route', f(rb.km, 1) + ' km · QAR ' + f(rb.cost) + (rb.late.length ? ' · late: ' + rb.late.join(', ') : '')) : '') + '</div>' +
        '<p class="small muted">Practice figures: 40 km/h average, 12 minutes per stop, van uses 12 L per 100 km, fuel QAR ' + f(FUEL_QAR, 2) + ' a litre, driver QAR ' + DRIVER_QAR + ' an hour. Roads are about 1.3 × the straight line.</p>' +
        '<div class="callout"><b>Think about it</b>The shortest route is not always the best one. A customer with a time window may need to come first, even if it adds kilometres.</div>' +
        '<div class="btns">' + (done ? '<button class="btn" id="rtSave">Save to My Supply Chain</button>' : '') + '<button class="btn ghost" id="rtBest">' + (showBest ? 'Hide the computer route' : 'Show a computer route') + '</button></div></div></div>';
      $$('[data-p]', el).forEach(function (g) {
        function tap() { var id = g.getAttribute('data-p'); if (order.indexOf(id) === -1) { order.push(id); draw(); } }
        g.addEventListener('click', tap); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
      });
      var u = $('#rtUndo', el); u.onclick = function () { order.pop(); draw(); };
      $('#rtClear', el).onclick = function () { order = []; draw(); };
      $('#rtBest', el).onclick = function () { showBest = !showBest; draw(); };
      var sv = $('#rtSave', el);
      if (sv) sv.onclick = function () { ctx.saveSim('route', { km: +r.km.toFixed(1), backAt: hhmm(r.end), late: r.late.length, cost: Math.round(r.cost), vsComputer: rb ? Math.round(r.km / rb.km * 100) + '% of computer distance' : '' }); };
    }
    draw();
  }

  SIMS.EXPLORE = { TERMS: TERMS, LEGS: LEGS, QUIZ: QUIZ, walk: walk, bestLayout: bestLayout, PICKS: PICKS, slotDist: slotDist, runRoute: runRoute, suggest: suggest, PLACES: PLACES };
  SIMS.SIMS.push(
    { id: 'incoterms', name: 'Incoterms Explorer', short: 'Incoterms', stage: 'Source', session: 4, page: incotermsPage,
      intro: 'Pick any of the 11 Incoterms® 2020 rules and see who pays for each step and where the risk passes. Then test yourself on six real situations.' },
    { id: 'import', name: 'Import Desk', short: 'Import Desk', stage: 'Source', session: 4, page: importPage,
      intro: 'A container is coming to Hamad Port. Find the mistakes in the documents, then work out the landed cost and the days until it reaches your warehouse.' },
    { id: 'slotting', name: 'Warehouse Slotting Puzzle', short: 'Slotting', stage: 'Deliver', session: 8, page: slottingPage,
      intro: 'Swap products on the pick face to cut the distance pickers walk every day. Use ABC analysis to get close to the best layout.' },
    { id: 'route', name: 'Doha Route Planner', short: 'Route planner', stage: 'Deliver', session: 9, page: routePage,
      intro: 'Plan a van route to 8 customers across Doha. Meet the delivery windows and keep kilometres and cost low, then compare with a computer route.' }
  );
})(typeof window !== 'undefined' ? window : globalThis);
