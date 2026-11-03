/* My Supply Chain lab: the learner runs one Qatar company through the course.
 * One lab step per teaching session, a supply chain map, the Control Tower,
 * the four simulations (assets/sims.js) and a printable final report.
 */
(function (root) {
  'use strict';
  var SIMS = root.LSCM_SIMS, CALC = root.LSCM_TOOLS && root.LSCM_TOOLS.CALC;
  var STAGE_LABEL = { Plan: 'Plan', Source: 'Source', Make: 'Make', Deliver: 'Deliver', Return: 'Return & sustain' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n, d) { return isFinite(n) ? Number(n).toLocaleString('en-GB', { maximumFractionDigits: d == null ? 0 : d }) : '–'; }
  function $(s, el) { return el.querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call(el.querySelectorAll(s)); }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; }

  function company(ctx) {
    var lab = ctx.lab(); if (!lab.company) return null;
    var c = JSON.parse(JSON.stringify(SIMS.COMPANIES[lab.company]));
    if (lab.name) c.name = lab.name;
    return c;
  }
  function chosenSupplier(ctx, c) { var s = ctx.lab().steps[3]; var i = s ? Number(s.values.supplier) : 0; return c.suppliers[i] || c.suppliers[0]; }
  function leadWeeks(sup) { return Math.max(1, Math.ceil(sup.lead / 7)); }

  // ---------------------------------------------------------------- steps --
  var STEPS = {
    1: { title: 'Map your supply chain', stage: 'Plan',
      intro: 'Name your company and describe one activity for each SCOR stage. This becomes your supply chain map.',
      fields: function (c) { return [
        { id: 'name', label: 'Company name', type: 'text', value: c.name },
        { id: 'customers', label: 'Who are your main customers?', type: 'text', value: { food: 'Supermarkets and cafés in Doha', pharma: 'Pharmacies and private clinics', online: 'Shoppers across Qatar', build: 'Building contractors' }[c.id] },
        { id: 'plan', label: 'Plan: how do you plan demand?', type: 'textarea', value: '' },
        { id: 'source', label: 'Source: where do your products come from?', type: 'textarea', value: '' },
        { id: 'make', label: 'Make: what do you do to the products (store, pack, assemble)?', type: 'textarea', value: '' },
        { id: 'deliver', label: 'Deliver: how do products reach customers?', type: 'textarea', value: '' },
        { id: 'return', label: 'Return: what happens to returns, waste and packaging?', type: 'textarea', value: '' }
      ]; },
      compute: function (v) { return { rows: [], summary: { name: v.name, customers: v.customers } }; } },

    2: { title: 'Forecast next month', stage: 'Plan',
      intro: 'Use your last 12 months of sales to forecast next month. Compare methods, choose one, and adjust for what the numbers cannot see.',
      fields: function () { return [
        { id: 'method', label: 'Method', type: 'select', value: 'es', options: [['ma', '3-month moving average'], ['wma', 'Weighted moving average (0.5, 0.3, 0.2)'], ['es', 'Exponential smoothing']] },
        { id: 'alpha', label: 'α for exponential smoothing (0.1–0.9)', type: 'number', value: 0.3 },
        { id: 'adj', label: 'Your adjustment (%) for things the data cannot see', type: 'number', value: 0 },
        { id: 'reason', label: 'Why this adjustment? (promotion, Ramadan, new customer…)', type: 'textarea', value: '' }
      ]; },
      compute: function (v, c) {
        var a = Math.min(0.9, Math.max(0.1, num(v.alpha) || 0.3));
        var r = CALC.forecast(c.demand, 3, [0.5, 0.3, 0.2], a), L = c.demand.length;
        var names = { ma: '3-month moving average', wma: 'Weighted moving average', es: 'Exponential smoothing' };
        var base = r[v.method][L], fc = base * (1 + (num(v.adj) || 0) / 100);
        return { rows: [['Past sales (oldest → newest)', c.demand.join(', ')]].concat(['ma', 'wma', 'es'].map(function (k) {
            return [names[k], 'next ' + f(r[k][L]) + ' · MAPE ' + f(r.err[k].mape, 1) + '% · bias ' + f(r.err[k].bias)];
          })).concat([['Your forecast for next month', f(fc) + ' units', 1]]),
          summary: { method: names[v.method], forecast: Math.round(fc), mape: +r.err[v.method].mape.toFixed(1) } };
      } },

    3: { title: 'Choose your main supplier', stage: 'Source',
      intro: 'Compare your three suppliers on cost, lead time, quality and risk. Try the Supplier Selection Risk Matrix first, then choose.',
      fields: function (c) { return [
        { id: 'supplier', label: 'Main supplier', type: 'select', value: '0', options: c.suppliers.map(function (s, i) { return [String(i), s.name + ' · QAR ' + s.cost + ' · ' + s.lead + ' days']; }) },
        { id: 'backup', label: 'Backup supplier', type: 'select', value: '1', options: c.suppliers.map(function (s, i) { return [String(i), s.name]; }) },
        { id: 'why', label: 'Why this choice? Use total cost, not only price.', type: 'textarea', value: '' }
      ]; },
      compute: function (v, c, ctx) {
        var sc = SIMS.MODEL.supplierScores(c.suppliers, { cost: 35, lead: 20, quality: 25, risk: 20 }), s = c.suppliers[+v.supplier] || c.suppliers[0];
        var sim = ctx.lab().sims.supplier;
        return { rows: c.suppliers.map(function (x, i) { return [x.name, 'score ' + f(sc[i].total, 2) + ' / 5 · ' + x.kind + ' · ' + x.route]; })
          .concat(sim ? [['Your saved portfolio', esc(sim.mix)]] : []).concat([['Main supplier', esc(s.name), 1]]),
          summary: { supplier: s.name, cost: s.cost, lead: s.lead, backup: (c.suppliers[+v.backup] || {}).name } };
      } },

    4: { title: 'Plan an import', stage: 'Source',
      intro: 'Plan one shipment from your main supplier: choose an Incoterm, list the documents and work out the landed cost per unit.',
      fields: function (c, ctx) { var s = chosenSupplier(ctx, c), local = s.kind === 'Local'; return [
        { id: 'incoterm', label: 'Incoterm', type: 'select', value: local ? 'DAP' : 'FCA', options: ['EXW', 'FCA', 'FOB', 'CIF', 'CIP', 'DAP', 'DPU', 'DDP'].map(function (t) { return [t, t]; }) },
        { id: 'qty', label: 'Units in this shipment', type: 'number', value: c.weeklyDemand * 4 },
        { id: 'freight', label: 'International freight (QAR)', type: 'number', value: local ? 0 : Math.round(c.weeklyDemand * 4 * s.cost * 0.08) },
        { id: 'insurance', label: 'Insurance (QAR)', type: 'number', value: local ? 0 : Math.round(c.weeklyDemand * 4 * s.cost * 0.006) },
        { id: 'duty', label: 'Duty rate (%) – check your HS code', type: 'number', value: local ? 0 : 5 },
        { id: 'fees', label: 'Port, clearance and broker fees (QAR)', type: 'number', value: local ? 0 : 900 },
        { id: 'inland', label: 'Transport to your warehouse (QAR)', type: 'number', value: 400 },
        { id: 'docs', label: 'Documents you will need', type: 'checks', value: [], options: ['Commercial invoice', 'Packing list', 'Bill of lading / air waybill', 'Certificate of origin', 'Health or conformity certificate', 'Letter of credit (if used)'] }
      ]; },
      compute: function (v, c, ctx) {
        var s = chosenSupplier(ctx, c), qty = num(v.qty) || 1;
        var r = CALC.landed({ goods: qty * s.cost, freight: num(v.freight) || 0, insurance: num(v.insurance) || 0, dutyPct: num(v.duty) || 0, taxPct: 0, fees: num(v.fees) || 0, inland: num(v.inland) || 0, units: qty });
        var warn = (v.incoterm === 'FOB' || v.incoterm === 'CIF') && s.kind !== 'Local' ? ' (tip: for containers, FCA or CIP usually fit better)' : '';
        return { rows: [['Supplier', esc(s.name) + ' · ' + esc(s.route)], ['Incoterm', esc(v.incoterm) + warn], ['Goods value', 'QAR ' + f(qty * s.cost)], ['Customs value (CIF)', 'QAR ' + f(r.cif)], ['Duty', 'QAR ' + f(r.duty)],
          ['Documents ticked', (v.docs || []).length + ' of 6'], ['Landed cost per unit', 'QAR ' + f(r.perUnit, 2) + ' (supplier price ' + f(s.cost, 2) + ')', 1]],
          summary: { incoterm: v.incoterm, landedUnit: +r.perUnit.toFixed(2), total: Math.round(r.total) } };
      } },

    5: { title: 'Set your stock levels', stage: 'Make',
      intro: 'Use your demand and your supplier’s lead time to set safety stock, reorder point and order quantity. Then try the Working Capital Balancer.',
      fields: function () { return [
        { id: 'sl', label: 'Service level', type: 'select', value: '95', options: [['90', '90%'], ['95', '95%'], ['97.5', '97.5%'], ['99', '99%']] }
      ]; },
      compute: function (v, c, ctx) {
        var s = chosenSupplier(ctx, c), L = leadWeeks(s), z = root.LSCM_TOOLS.Z[v.sl] || 1.65;
        var ss = CALC.ssBasic(z, c.weeklySd, L).ss, rop = c.weeklyDemand * L + ss;
        var e = CALC.eoq(c.weeklyDemand * 52, c.orderCost, c.unitCost * c.holdingPct / 100);
        var t = CALC.turnover(c.cogs, c.stockOpen, c.stockClose);
        return { rows: [['Weekly demand', f(c.weeklyDemand) + ' (σ ' + f(c.weeklySd) + ')'], ['Lead time from ' + esc(s.name), L + ' week(s)'],
          ['Safety stock', f(Math.ceil(ss)) + ' units'], ['Reorder point', f(Math.ceil(rop)) + ' units'], ['EOQ', f(e.q) + ' units · ' + f(e.orders, 1) + ' orders a year'],
          ['Inventory turnover', f(t.turns, 1) + ' times a year · ' + f(t.days) + ' days of stock', 1]],
          summary: { ss: Math.ceil(ss), rop: Math.ceil(rop), eoq: Math.round(e.q), turns: +t.turns.toFixed(1), days: Math.round(t.days) } };
      } },

    7: { title: 'Measure and improve quality', stage: 'Make',
      intro: 'Measure last month’s delivery quality and plan one PDCA improvement.',
      fields: function (c) { var o = c.deliveriesMonth; return [
        { id: 'orders', label: 'Orders delivered last month', type: 'number', value: o },
        { id: 'otif', label: 'Orders on time AND in full', type: 'number', value: Math.round(o * 0.91) },
        { id: 'errors', label: 'Orders with any error', type: 'number', value: Math.round(o * 0.03) },
        { id: 'target', label: 'Your OTIF target (%)', type: 'number', value: 96 },
        { id: 'problem', label: 'Plan: the main problem and its root cause (use 5 Whys)', type: 'textarea', value: '' },
        { id: 'do', label: 'Do: the small change you will test', type: 'textarea', value: '' },
        { id: 'check', label: 'Check: which KPI will show it worked?', type: 'text', value: 'OTIF' }
      ]; },
      compute: function (v) {
        var o = num(v.orders) || 1, ot = (num(v.otif) || 0) / o * 100, acc = (o - (num(v.errors) || 0)) / o * 100, tg = num(v.target) || 0;
        return { rows: [['OTIF', f(ot, 1) + '%'], ['Order accuracy', f(acc, 1) + '%'], ['Gap to target', f(tg - ot, 1) + ' points', 1]],
          summary: { otif: +ot.toFixed(1), target: tg, accuracy: +acc.toFixed(1) } };
      } },

    8: { title: 'Plan your warehouse', stage: 'Deliver',
      intro: 'Choose how to pick orders, where to put fast movers, and the KPIs you will track.',
      fields: function () { return [
        { id: 'picking', label: 'Main picking method', type: 'select', value: 'batch', options: [['single', 'Single-order'], ['batch', 'Batch'], ['zone', 'Zone'], ['wave', 'Wave']] },
        { id: 'slotting', label: 'Slotting: which items go closest to packing, and why?', type: 'textarea', value: '' },
        { id: 'lph', label: 'Target lines picked per hour', type: 'number', value: 80 },
        { id: 'acc', label: 'Target picking accuracy (%)', type: 'number', value: 99.5 },
        { id: 'dts', label: 'Target dock-to-stock time (hours)', type: 'number', value: 4 },
        { id: 'safety', label: 'One safety rule you will enforce', type: 'text', value: '' }
      ]; },
      compute: function (v) {
        var names = { single: 'Single-order', batch: 'Batch', zone: 'Zone', wave: 'Wave' };
        return { rows: [['Picking method', names[v.picking]], ['Targets', f(num(v.lph)) + ' lines/hour · ' + f(num(v.acc), 1) + '% accuracy · ' + f(num(v.dts)) + ' h dock-to-stock', 1]],
          summary: { picking: names[v.picking], lph: num(v.lph), acc: num(v.acc) } };
      } },

    9: { title: 'Plan your transport', stage: 'Deliver',
      intro: 'Check your delivery cost, and compare a cheaper, slower import mode with a faster one.',
      fields: function (c) { return [
        { id: 'deliveries', label: 'Deliveries per month', type: 'number', value: c.deliveriesMonth },
        { id: 'cost', label: 'Transport cost per month (QAR)', type: 'number', value: c.transportMonth },
        { id: 'saving', label: 'Freight saving with the slower mode, per shipment (QAR)', type: 'number', value: 6000 },
        { id: 'weeks', label: 'Extra transit time (weeks)', type: 'number', value: 2 },
        { id: 'lastmile', label: 'One idea to improve the last mile', type: 'textarea', value: '' }
      ]; },
      compute: function (v, c) {
        var cpd = (num(v.cost) || 0) / (num(v.deliveries) || 1);
        var hold = c.weeklyDemand * 4 * c.unitCost * c.holdingPct / 100 / 52, net = (num(v.saving) || 0) - (num(v.weeks) || 0) * hold;
        return { rows: [['Cost per delivery', 'QAR ' + f(cpd, 2)], ['Extra holding cost per week of transit', 'QAR ' + f(hold)], ['Net result of the slower mode', (net >= 0 ? 'Save QAR ' : 'Lose QAR ') + f(Math.abs(net)), 1]],
          summary: { costPerDelivery: +cpd.toFixed(2), slowerModeNet: Math.round(net) } };
      } },

    10: { title: 'Build your risk register', stage: 'Return',
      intro: 'List your three biggest risks, score them, and give each a strategy and a trigger. Then try the Shock Test.',
      fields: function (c) {
        var ideas = [c.suppliers.some(function (s) { return s.redSea; }) ? 'Red Sea route closes for our overseas supplier' : 'Overseas supplier ships late', 'Warehouse system stops (cyber attack)', 'Main customer cancels a big order'];
        var out = [];
        [0, 1, 2].forEach(function (i) {
          out.push({ id: 'r' + i, label: 'Risk ' + (i + 1), type: 'text', value: ideas[i] });
          out.push({ id: 'p' + i, label: 'Probability (1–5)', type: 'number', value: [3, 2, 2][i], half: true });
          out.push({ id: 'i' + i, label: 'Impact (1–5)', type: 'number', value: [4, 5, 3][i], half: true });
          out.push({ id: 's' + i, label: 'Strategy', type: 'select', value: 'reduce', options: [['avoid', 'Avoid'], ['reduce', 'Reduce'], ['transfer', 'Transfer'], ['accept', 'Accept']], half: true });
          out.push({ id: 't' + i, label: 'Trigger (if … then we will …)', type: 'text', value: '', half: true });
        });
        return out;
      },
      compute: function (v) {
        var rows = [], top = null;
        [0, 1, 2].forEach(function (i) {
          var p = Math.min(5, Math.max(1, num(v['p' + i]) || 1)), im = Math.min(5, Math.max(1, num(v['i' + i]) || 1)), s = p * im, lv = CALC.riskLevel(s);
          rows.push([esc(v['r' + i] || 'Risk ' + (i + 1)), p + ' × ' + im + ' = ' + s + ' · ' + lv + ' · ' + v['s' + i]]);
          if (!top || s > top.score) top = { name: v['r' + i], score: s, level: lv };
        });
        rows.push(['Top risk', esc(top.name) + ' (' + top.score + ', ' + top.level + ')', 1]);
        return { rows: rows, summary: { topRisk: top.name, topScore: top.score, topLevel: top.level } };
      } },

    11: { title: 'Your strategy and scorecard', stage: 'Return',
      intro: 'Choose one KPI and target for each perspective, and write your three main recommendations. This completes your final report.',
      fields: function () { return [
        { id: 'fin', label: 'Financial KPI and target', type: 'text', value: 'Logistics cost per unit shipped: −5% this year' },
        { id: 'cus', label: 'Customer KPI and target', type: 'text', value: 'OTIF 96%' },
        { id: 'pro', label: 'Internal process KPI and target', type: 'text', value: 'Dock-to-stock under 4 hours' },
        { id: 'lea', label: 'Learning and growth KPI and target', type: 'text', value: '12 training hours per person' },
        { id: 'sus', label: 'Sustainability KPI and target', type: 'text', value: 'CO₂ per delivery −10%' },
        { id: 'recs', label: 'Your three main recommendations for the company', type: 'textarea', value: '' }
      ]; },
      compute: function (v) { return { rows: [['Scorecard', '5 perspectives set', 1]], summary: { recommendations: (v.recs || '').slice(0, 300) } }; } }
  };
  var STEP_ORDER = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11];

  // -------------------------------------------------------------- views ---
  function chooser(ctx) {
    return '<h1 class="h2">My Supply Chain</h1><p class="sub">Choose the company you will run for the whole course. Every session, you use its tools on your company.</p>' +
      '<div class="grid g2">' + Object.keys(SIMS.COMPANIES).map(function (k, i) {
        var c = SIMS.COMPANIES[k], st = ['Plan', 'Source', 'Make', 'Deliver'][i];
        return '<button class="card pad toolcard st-' + st + ' co-pick" data-co="' + k + '"><span class="chip st-' + st + '"><span class="d"></span>' + esc(c.type) + '</span><b style="font-size:1.1rem;margin-top:6px">' + esc(c.name) + '</b><small>' + esc(c.about) + '</small>' +
          '<small>Main product: ' + esc(c.product) + ' · ' + c.suppliers.length + ' suppliers to choose from</small></button>';
      }).join('') + '</div><p class="small muted sec">All company figures are examples for teaching. You can rename your company in Step 1.</p>';
  }

  function stepDone(ctx, n) { return !!ctx.lab().steps[n]; }
  function home(ctx) {
    var c = company(ctx), lab = ctx.lab(), done = STEP_ORDER.filter(function (n) { return stepDone(ctx, n); }).length;
    return '<div class="card pad lab-head"><div><div class="eyebrow muted">My Supply Chain · ' + esc(c.type) + '</div><h1 class="h2" style="margin:4px 0">' + esc(c.name) + '</h1><p class="muted" style="margin:0">' + esc(c.about) + '</p></div>' +
      '<div class="btns"><a class="btn" href="#/lab/tower">Open Control Tower</a><a class="btn ghost" href="#/lab/report">Final report</a></div></div>' +
      '<div class="card pad sec">' + map(ctx, c) + '</div>' +
      '<div class="sec"><h2>Lab steps</h2><p class="sub">' + done + ' of ' + STEP_ORDER.length + ' done. Each step opens with its session.</p><div class="grid g2">' +
      STEP_ORDER.map(function (n) {
        var s = STEPS[n], open = ctx.isOpen(n), d = stepDone(ctx, n);
        return '<a class="card pad toolcard st-' + s.stage + (open ? '' : ' locked-card') + '" href="' + (open ? '#/lab/step/' + n : '#/sessions') + '"><span class="chip st-' + s.stage + '"><span class="d"></span>Session ' + n + '</span>' +
          '<b>' + esc(s.title) + '</b><small>' + (d ? '✓ Done · tap to edit' : open ? 'Open now' : 'Opens with Session ' + n) + '</small></a>';
      }).join('') + '</div></div>' +
      '<div class="sec"><h2>Simulations</h2><p class="sub">Practise decisions with your company’s numbers. Save your result to see it in the Control Tower.</p><div class="grid g2">' +
      SIMS.SIMS.map(function (s) {
        var r = lab.sims[s.id];
        return '<a class="card pad toolcard st-' + s.stage + '" href="#/lab/sim/' + s.id + '"><span class="chip st-' + s.stage + '"><span class="d"></span>Session ' + s.session + '</span><b>' + esc(s.name) + '</b><small>' + esc(s.intro) + '</small>' + (r ? '<small><b>✓ Result saved</b></small>' : '') + '</a>';
      }).join('') + '</div></div>' +
      '<p class="small muted sec"><button class="linkbtn" id="labReset">Start again with a different company</button></p>';
  }

  function map(ctx, c) {
    var lab = ctx.lab(), sup = lab.steps[3] ? lab.steps[3].summary.supplier : 'Choose in step 3', inc = lab.steps[4] ? lab.steps[4].summary.incoterm : 'Step 4';
    var nodes = [
      { x: 70, stage: 'Source', label: 'Supplier', sub: sup, done: stepDone(ctx, 3) },
      { x: 230, stage: 'Source', label: c.suppliers.some(function (s) { return s.kind !== 'Local'; }) ? 'Hamad Port / border' : 'Border', sub: inc, done: stepDone(ctx, 4) },
      { x: 390, stage: 'Make', label: 'Your warehouse', sub: lab.steps[5] ? 'ROP ' + f(lab.steps[5].summary.rop) : 'Steps 5, 7, 8', done: stepDone(ctx, 5) },
      { x: 550, stage: 'Deliver', label: 'Customers', sub: lab.steps[1] ? lab.steps[1].summary.customers : 'Step 1', done: stepDone(ctx, 9) },
      { x: 710, stage: 'Return', label: 'Returns & recycling', sub: 'Steps 10, 11', done: stepDone(ctx, 10) }
    ];
    var col = { Plan: '#00B4B4', Source: '#FF5A36', Make: '#8338EC', Deliver: '#1F7BFF', Return: '#00B86B' };
    function short(s) { s = String(s || ''); return s.length > 22 ? s.slice(0, 21) + '…' : s; }
    return '<h2 class="h3">Your supply chain map</h2><div class="map-wrap"><svg viewBox="0 0 780 230" class="lab-map" role="img" aria-label="Supply chain map">' +
      '<rect x="40" y="10" width="700" height="34" rx="17" fill="' + (stepDone(ctx, 2) ? '#E6F8F8' : '#F4F6FA') + '" stroke="#00B4B4" stroke-width="2"/>' +
      '<text x="390" y="32" text-anchor="middle" font-size="13" font-weight="600" fill="#14213D">Plan: ' + esc(lab.steps[2] ? 'forecast ' + f(lab.steps[2].summary.forecast) + ' units next month' : 'forecast in step 2') + '</text>' +
      nodes.slice(0, -1).map(function (n, i) { return '<line x1="' + (n.x + 40) + '" y1="120" x2="' + (nodes[i + 1].x - 40) + '" y2="120" stroke="' + col[nodes[i + 1].stage] + '" stroke-width="6" stroke-linecap="round"/>'; }).join('') +
      nodes.map(function (n) {
        return '<circle cx="' + n.x + '" cy="120" r="36" fill="' + (n.done ? col[n.stage] : '#fff') + '" stroke="' + col[n.stage] + '" stroke-width="5"/>' +
          (n.done ? '<path d="M' + (n.x - 11) + ' 120 l8 8 l15 -16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
          '<text x="' + n.x + '" y="182" text-anchor="middle" font-size="13" font-weight="700" fill="#14213D">' + esc(n.label) + '</text>' +
          '<text x="' + n.x + '" y="200" text-anchor="middle" font-size="11" fill="#4a5675">' + esc(short(n.sub)) + '</text>';
      }).join('') + '</svg></div>';
  }

  function fieldHtml(fd, v) {
    var val = v[fd.id] !== undefined ? v[fd.id] : fd.value, cls = 'field' + (fd.half ? ' half' : '');
    if (fd.type === 'textarea') return '<label class="' + cls + ' full"><span>' + esc(fd.label) + '</span><textarea class="input" data-f="' + fd.id + '">' + esc(val) + '</textarea></label>';
    if (fd.type === 'select') return '<label class="' + cls + '"><span>' + esc(fd.label) + '</span><select class="input" data-f="' + fd.id + '">' + fd.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    if (fd.type === 'checks') return '<fieldset class="field full"><legend>' + esc(fd.label) + '</legend><div class="checks">' + fd.options.map(function (o) { return '<label class="check"><input type="checkbox" data-c="' + fd.id + '" value="' + esc(o) + '"' + ((val || []).indexOf(o) !== -1 ? ' checked' : '') + '> ' + esc(o) + '</label>'; }).join('') + '</div></fieldset>';
    return '<label class="' + cls + '"><span>' + esc(fd.label) + '</span><input class="input" data-f="' + fd.id + '" value="' + esc(val) + '"' + (fd.type === 'number' ? ' inputmode="decimal"' : '') + '></label>';
  }
  function stepView(ctx, n) {
    var c = company(ctx), s = STEPS[n];
    if (!s) return '<div class="card pad empty">Step not found.</div>';
    if (!ctx.isOpen(n)) return '<a class="back" href="#/lab">← My Supply Chain</a><div class="card pad empty">This step opens with Session ' + n + '.</div>';
    var saved = ctx.lab().steps[n], vals = saved ? saved.values : {};
    var fields = s.fields(c, ctx);
    var simLinks = SIMS.SIMS.filter(function (x) { return x.session === n; });
    return '<a class="back" href="#/lab">← My Supply Chain</a><div class="card shead st-' + s.stage + '"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="chip st-' + s.stage + '"><span class="d"></span>' + STAGE_LABEL[s.stage] + '</span><small class="muted">Lab step · Session ' + n + ' · ' + esc(c.name) + '</small>' + (saved ? '<span class="chip done">✓ Saved</span>' : '') + '</div>' +
      '<h1>' + esc(s.title) + '</h1><p class="muted" style="margin:0">' + esc(s.intro) + '</p></div>' +
      (simLinks.length ? '<p class="sec btns">' + simLinks.map(function (x) { return '<a class="btn ghost" href="#/lab/sim/' + x.id + '">Try the ' + esc(x.name) + '</a>'; }).join('') + '</p>' : '') +
      '<div class="tool-grid sec"><form class="card pad lab-form" id="labForm" onsubmit="return false">' + fields.map(function (fd) { return fieldHtml(fd, vals); }).join('') + '</form>' +
      '<div class="card pad tool-out"><h3 class="h3">Your results</h3><div id="labOut"></div><button class="btn" id="labSave">' + (saved ? 'Update and send to Ms. Maria' : 'Save and send to Ms. Maria') + '</button>' +
      (saved && saved.sent ? '<p class="small muted" style="margin-top:8px">Last sent ' + new Date(saved.sent).toLocaleDateString('en-GB') + '</p>' : '') + '</div></div>';
  }
  function collect(el) {
    var v = {};
    $$('[data-f]', el).forEach(function (i) { v[i.getAttribute('data-f')] = i.value; });
    $$('[data-c]', el).forEach(function (i) { var k = i.getAttribute('data-c'); v[k] = v[k] || []; if (i.checked) v[k].push(i.value); });
    return v;
  }
  function wireStep(ctx, el, n) {
    var form = $('#labForm', el); if (!form) return;
    var c = company(ctx);
    function update() {
      try {
        var r = STEPS[n].compute(collect(el), c, ctx);
        $('#labOut', el).innerHTML = r.rows.length ? '<div class="results">' + r.rows.map(function (x) { return '<div class="res-row' + (x[2] ? ' main' : '') + '"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('') + '</div>' : '<p class="muted small">Your answers build your company’s map and report.</p>';
      } catch (e) { $('#labOut', el).innerHTML = '<p class="note err">Check your numbers.</p>'; }
    }
    form.addEventListener('input', update); form.addEventListener('change', update); update();
    $('#labSave', el).onclick = function () {
      var v = collect(el), r = STEPS[n].compute(v, c, ctx);
      if (n === 1 && v.name && v.name.trim()) ctx.lab().name = v.name.trim().slice(0, 60);
      ctx.saveStep(n, v, r.summary);
    };
  }

  function tower(ctx) {
    var c = company(ctx), L = ctx.lab(), S = L.steps, M = L.sims;
    function tile(stage, label, val, sub, state, href) {
      return '<a class="card tower-tile st-' + stage + (state ? ' t-' + state : '') + '" href="' + href + '"><small>' + esc(label) + '</small><b>' + val + '</b><span>' + sub + '</span></a>';
    }
    var none = function (n) { return ['–', 'Not set yet · step ' + n, '', '#/lab/step/' + n]; };
    var tiles = [];
    tiles.push(S[2] ? ['Plan', 'Forecast next month', f(S[2].summary.forecast) + ' units', 'MAPE ' + f(S[2].summary.mape, 1) + '% · ' + esc(S[2].summary.method), S[2].summary.mape <= 10 ? 'good' : S[2].summary.mape <= 20 ? 'warn' : 'bad', '#/lab/step/2'] : ['Plan', 'Forecast next month'].concat(none(2)));
    tiles.push(M.bullwhip ? ['Plan', 'Bullwhip at supplier', '× ' + f(M.bullwhip.supplierSwing, 1), 'Service ' + f(M.bullwhip.service, 1) + '%' + (M.bullwhip.shared ? ' · data shared' : ''), M.bullwhip.supplierSwing <= 3 ? 'good' : M.bullwhip.supplierSwing <= 8 ? 'warn' : 'bad', '#/lab/sim/bullwhip'] : ['Plan', 'Bullwhip at supplier', '–', 'Run the simulation', '', '#/lab/sim/bullwhip']);
    tiles.push(S[3] ? ['Source', 'Main supplier', esc(S[3].summary.supplier), 'QAR ' + f(S[3].summary.cost, 2) + ' · ' + S[3].summary.lead + ' days · backup: ' + esc(S[3].summary.backup || '–'), S[3].summary.backup && S[3].summary.backup !== S[3].summary.supplier ? 'good' : 'warn', '#/lab/step/3'] : ['Source', 'Main supplier'].concat(none(3)));
    tiles.push(M.supplier ? ['Source', 'Supplier portfolio risk', f(M.supplier.avgRisk, 2) + ' / 5', 'Avg cost QAR ' + f(M.supplier.avgCost, 2) + ' · ' + f(M.supplier.avgLead, 1) + ' days', M.supplier.avgRisk <= 2 ? 'good' : M.supplier.avgRisk <= 3 ? 'warn' : 'bad', '#/lab/sim/supplier'] : ['Source', 'Supplier portfolio risk', '–', 'Run the risk matrix', '', '#/lab/sim/supplier']);
    tiles.push(S[4] ? ['Source', 'Landed cost per unit', 'QAR ' + f(S[4].summary.landedUnit, 2), esc(S[4].summary.incoterm), '', '#/lab/step/4'] : ['Source', 'Landed cost per unit'].concat(none(4)));
    tiles.push(S[5] ? ['Make', 'Reorder point', f(S[5].summary.rop) + ' units', 'Safety stock ' + f(S[5].summary.ss) + ' · EOQ ' + f(S[5].summary.eoq) + ' · turnover ' + f(S[5].summary.turns, 1), '', '#/lab/step/5'] : ['Make', 'Reorder point'].concat(none(5)));
    tiles.push(M.balancer ? ['Make', 'Cash tied up in stock', 'QAR ' + f(M.balancer.cash), M.balancer.serviceLevel + '% service · ' + f(M.balancer.days, 1) + ' days of stock', '', '#/lab/sim/balancer'] : ['Make', 'Cash tied up in stock', '–', 'Run the balancer', '', '#/lab/sim/balancer']);
    tiles.push(S[7] ? ['Make', 'OTIF', f(S[7].summary.otif, 1) + '%', 'Target ' + f(S[7].summary.target, 1) + '% · accuracy ' + f(S[7].summary.accuracy, 1) + '%', S[7].summary.otif >= S[7].summary.target ? 'good' : S[7].summary.otif >= S[7].summary.target - 3 ? 'warn' : 'bad', '#/lab/step/7'] : ['Make', 'OTIF'].concat(none(7)));
    tiles.push(S[8] ? ['Deliver', 'Warehouse picking', esc(S[8].summary.picking), f(S[8].summary.lph) + ' lines/hour · ' + f(S[8].summary.acc, 1) + '% accuracy', '', '#/lab/step/8'] : ['Deliver', 'Warehouse picking'].concat(none(8)));
    tiles.push(S[9] ? ['Deliver', 'Cost per delivery', 'QAR ' + f(S[9].summary.costPerDelivery, 2), 'Slower import mode: ' + (S[9].summary.slowerModeNet >= 0 ? 'saves ' : 'costs ') + 'QAR ' + f(Math.abs(S[9].summary.slowerModeNet)), '', '#/lab/step/9'] : ['Deliver', 'Cost per delivery'].concat(none(9)));
    tiles.push(S[10] ? ['Return', 'Top risk', S[10].summary.topScore + ' · ' + esc(S[10].summary.topLevel), esc(S[10].summary.topRisk), S[10].summary.topScore >= 16 ? 'bad' : S[10].summary.topScore >= 10 ? 'warn' : 'good', '#/lab/step/10'] : ['Return', 'Top risk'].concat(none(10)));
    tiles.push(M.shock ? ['Return', 'Shock test score', M.shock.score + ' / 100', esc(M.shock.event) + ' · ' + M.shock.service + '% served', M.shock.score >= 80 ? 'good' : M.shock.score >= 65 ? 'warn' : 'bad', '#/lab/sim/shock'] : ['Return', 'Shock test score', '–', 'Run the shock test', '', '#/lab/sim/shock']);
    return '<a class="back" href="#/lab">← My Supply Chain</a><div class="tower-head"><div><div class="eyebrow">Control Tower</div><h1 class="h2" style="color:#fff;margin:4px 0">' + esc(c.name) + '</h1><p style="margin:0;opacity:.85">Your company’s key figures, built from your lab steps and simulations.</p></div></div>' +
      '<div class="grid tower-grid sec">' + tiles.map(function (t) { return tile.apply(null, t); }).join('') + '</div>' +
      '<p class="small muted sec">Colour band: green = on track, gold = watch, coral = act now. Tap any tile to change it.</p>';
  }

  function report(ctx) {
    var c = company(ctx), L = ctx.lab();
    return '<a class="back noprint" href="#/lab">← My Supply Chain</a><div class="card handout"><div class="pad panel-h" style="padding-bottom:0"><div><div class="eyebrow muted">Supply Chain Improvement Report</div><h1 class="h2" style="margin-top:4px">' + esc(c.name) + '</h1><p class="muted small" style="margin:0">' + esc(c.type) + ' · ' + esc(ctx.studentName()) + '</p></div>' +
      '<div class="btns"><button class="btn ghost" onclick="window.print()">Print or save PDF</button></div></div>' +
      STEP_ORDER.map(function (n) {
        var s = STEPS[n], d = L.steps[n];
        if (!d) return '<section><h3>' + n + '. ' + esc(s.title) + '</h3><p class="muted">Not done yet.</p></section>';
        var r = s.compute(d.values, c, ctx), texts = s.fields(c, ctx).filter(function (fd) { return fd.type === 'textarea' || (fd.type === 'text' && n !== 10); })
          .map(function (fd) { return d.values[fd.id] ? '<p><b>' + esc(fd.label) + '</b><br>' + esc(d.values[fd.id]).replace(/\n/g, '<br>') + '</p>' : ''; }).join('');
        return '<section><h3>' + n + '. ' + esc(s.title) + '</h3>' + (r.rows.length ? '<div class="results">' + r.rows.map(function (x) { return '<div class="res-row' + (x[2] ? ' main' : '') + '"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('') + '</div>' : '') + texts + '</section>';
      }).join('') +
      '<section><h3>Simulation results</h3>' + (Object.keys(L.sims).length ? '<div class="results">' + SIMS.SIMS.filter(function (s) { return L.sims[s.id]; }).map(function (s) {
        var r = L.sims[s.id];
        return '<div class="res-row"><span>' + esc(s.name) + '</span><b>' + esc(Object.keys(r).filter(function (k) { return k !== 'saved'; }).map(function (k) { return k + ': ' + r[k]; }).join(' · ')) + '</b></div>';
      }).join('') + '</div>' : '<p class="muted">No simulations saved yet.</p>') + '</section></div>';
  }

  var stopSim = null;
  function mount(el, ctx, sub, arg) {
    if (stopSim) { stopSim(); stopSim = null; }
    var lab = ctx.lab();
    if (!lab.company) {
      el.innerHTML = chooser(ctx);
      $$('[data-co]', el).forEach(function (b) { b.onclick = function () { lab.company = b.getAttribute('data-co'); lab.name = SIMS.COMPANIES[lab.company].name; ctx.persist(); ctx.toast('Welcome to ' + lab.name + '!'); mount(el, ctx); }; });
      return;
    }
    if (sub === 'step') { el.innerHTML = stepView(ctx, Number(arg)); wireStep(ctx, el, Number(arg)); return; }
    if (sub === 'tower') { el.innerHTML = tower(ctx); return; }
    if (sub === 'report') { el.innerHTML = report(ctx); return; }
    if (sub === 'sim') {
      var s = SIMS.SIMS.filter(function (x) { return x.id === arg; })[0];
      if (!s) { el.innerHTML = '<div class="card pad empty">Simulation not found.</div>'; return; }
      var c = company(ctx);
      el.innerHTML = '<a class="back" href="#/lab">← My Supply Chain</a><div class="card shead st-' + s.stage + '"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="chip st-' + s.stage + '"><span class="d"></span>' + STAGE_LABEL[s.stage] + '</span><small class="muted">Simulation · Session ' + s.session + ' · ' + esc(c.name) + '</small></div><h1>' + esc(s.name) + '</h1><p class="muted" style="margin:0">' + esc(s.intro) + '</p></div><div class="sec" id="simMount"></div>';
      var stop = s.page($('#simMount', el), { company: c, leadWeeks: leadWeeks(chosenSupplier(ctx, c)), toast: ctx.toast, saveSim: ctx.saveSim });
      if (typeof stop === 'function') stopSim = stop;
      return;
    }
    el.innerHTML = home(ctx);
    var rb = $('#labReset', el);
    if (rb) rb.onclick = function () { if (confirm('Start again with a new company? Your saved steps stay with Ms. Maria, but your map and Control Tower on this device will be cleared.')) { ctx.resetLab(); mount(el, ctx); } };
  }
  function stop() { if (stopSim) { stopSim(); stopSim = null; } }

  root.LSCM_LAB = { mount: mount, stop: stop, STEPS: STEPS, STEP_ORDER: STEP_ORDER };
})(typeof window !== 'undefined' ? window : globalThis);
