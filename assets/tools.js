/* Supply chain calculators. Every tool shows its working step by step.
 * Pure maths lives in CALC (also used by the tests); the page code is below it.
 */
(function (root) {
  'use strict';

  // ------------------------------------------------------------ maths --
  var Z = { '90': 1.28, '95': 1.65, '97.5': 1.96, '98': 2.05, '99': 2.33 };

  var CALC = {
    eoq: function (D, S, H) {
      var q = Math.sqrt(2 * D * S / H), orders = D / q, avg = q / 2;
      return { q: q, orders: orders, days: 365 / orders, avg: avg, ordering: orders * S, holding: avg * H, total: orders * S + avg * H };
    },
    rop: function (d, lt, ss) { return { ltDemand: d * lt, rop: d * lt + ss }; },
    ssBasic: function (z, sd, lt) { var sdl = sd * Math.sqrt(lt); return { sdl: sdl, ss: z * sdl }; },
    ssVariable: function (z, d, sd, lt, slt) { var sdl = Math.sqrt(lt * sd * sd + d * d * slt * slt); return { sdl: sdl, ss: z * sdl }; },
    ssMax: function (maxD, maxLT, d, lt) { return { maxDemand: maxD * maxLT, avgDemand: d * lt, ss: maxD * maxLT - d * lt }; },
    turnover: function (cogs, open, close) { var avg = (open + close) / 2, t = cogs / avg; return { avg: avg, turns: t, days: 365 / t }; },
    weighted: function (weights, scores) { return scores.map(function (row) { return row.reduce(function (s, v, i) { return s + v * weights[i] / 100; }, 0); }); },
    abc: function (items, aCut, bCut) {
      var rows = items.map(function (it) { return { name: it.name, units: it.units, cost: it.cost, value: it.units * it.cost }; })
        .sort(function (a, b) { return b.value - a.value; });
      var total = rows.reduce(function (s, r) { return s + r.value; }, 0), cum = 0;
      rows.forEach(function (r) {
        r.share = total ? r.value / total * 100 : 0;
        var before = cum; cum += r.share; r.cum = cum;
        // An item goes in A while the running total (before it) is still under the A cut-off, and so on.
        r.cls = before < aCut ? 'A' : before < bCut ? 'B' : 'C';
      });
      return { rows: rows, total: total };
    },
    tco: function (s) {
      var purchase = s.price * s.qty, defects = s.defectPct / 100 * s.qty * s.defectCost;
      var payBenefit = purchase * (s.ratePct / 100) * (s.payDays / 365);
      return { purchase: purchase, defects: defects, payBenefit: payBenefit,
        total: purchase + s.freight + s.fees + s.inspection + defects - payBenefit, perUnit: (purchase + s.freight + s.fees + s.inspection + defects - payBenefit) / s.qty };
    },
    landed: function (v) {
      var cif = v.goods + v.freight + v.insurance, duty = cif * v.dutyPct / 100, tax = (cif + duty) * v.taxPct / 100;
      var total = cif + duty + tax + v.fees + v.inland;
      return { cif: cif, duty: duty, tax: tax, total: total, perUnit: v.units ? total / v.units : 0 };
    },
    forecast: function (actual, n, weights, alpha) {
      var ma = [], wma = [], es = [];
      for (var t = 0; t <= actual.length; t++) {
        ma.push(t >= n ? actual.slice(t - n, t).reduce(function (a, b) { return a + b; }, 0) / n : null);
        var k = weights.length;
        wma.push(t >= k ? weights.reduce(function (s, w, i) { return s + w * actual[t - 1 - i]; }, 0) : null);
        if (t === 0) es.push(null);
        else if (t === 1) es.push(actual[0]);
        else es.push(es[t - 1] + alpha * (actual[t - 1] - es[t - 1]));
      }
      function errs(f) {
        var e = [], ape = [];
        actual.forEach(function (a, i) { if (f[i] != null) { e.push(a - f[i]); if (a) ape.push(Math.abs(a - f[i]) / a * 100); } });
        if (!e.length) return { mape: null, bias: null, mad: null, n: 0 };
        return { mape: ape.reduce(function (s, x) { return s + x; }, 0) / ape.length, bias: e.reduce(function (s, x) { return s + x; }, 0),
          mad: e.reduce(function (s, x) { return s + Math.abs(x); }, 0) / e.length, n: e.length };
      }
      return { ma: ma, wma: wma, es: es, err: { ma: errs(ma), wma: errs(wma), es: errs(es) } };
    },
    otif: function (o) {
      return { onTime: o.onTime / o.orders * 100, inFull: o.inFull / o.orders * 100, otif: o.both / o.orders * 100, accuracy: (o.orders - o.errors) / o.orders * 100 };
    },
    nps: function (p, pa, d) { var t = p + pa + d; return { total: t, pP: p / t * 100, pD: d / t * 100, nps: (p - d) / t * 100 }; },
    riskLevel: function (score) { return score >= 16 ? 'Critical' : score >= 10 ? 'High' : score >= 5 ? 'Medium' : 'Low'; }
  };

  // ------------------------------------------------------------ helpers --
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n, d) {
    if (n == null || !isFinite(n)) return '–';
    return Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: d == null ? 2 : d });
  }
  function f2(n) { return isFinite(n) ? Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '–'; }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; }
  function $(s, el) { return el.querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call(el.querySelectorAll(s)); }

  // ------------------------------------------------------- simple tools --
  // Each simple tool: fields + run(values) → { results: [[label, value, big?]], steps: [html], note? }
  var T = [];
  function add(t) { T.push(t); }

  add({ id: 'eoq', name: 'Economic order quantity (EOQ)', stage: 'Make', session: 5,
    intro: 'How much to order each time, so that ordering cost plus holding cost is as low as possible.',
    fields: [
      { id: 'D', label: 'Annual demand (D)', unit: 'units per year', value: 12000 },
      { id: 'S', label: 'Cost of one order (S)', unit: 'per order', value: 75 },
      { id: 'H', label: 'Holding cost (H)', unit: 'per unit per year', value: 2 }
    ],
    run: function (v) {
      if (!(v.D > 0 && v.S > 0 && v.H > 0)) return { error: 'All three numbers must be more than 0.' };
      var r = CALC.eoq(v.D, v.S, v.H);
      return {
        results: [['Order quantity (EOQ)', f(r.q, 0) + ' units', 1], ['Orders per year', f(r.orders, 1)], ['Days between orders', f(r.days, 0) + ' days'], ['Total yearly cost', f2(r.total)]],
        steps: [
          'Formula: <code>EOQ = √(2 × D × S ÷ H)</code>',
          'Put in the numbers: <code>√(2 × ' + f(v.D) + ' × ' + f(v.S) + ' ÷ ' + f(v.H) + ') = √' + f(2 * v.D * v.S / v.H) + '</code>',
          'Square root: <code>EOQ = ' + f2(r.q) + '</code> → order about <b>' + f(r.q, 0) + ' units</b> each time.',
          'Orders per year: <code>D ÷ EOQ = ' + f(v.D) + ' ÷ ' + f2(r.q) + ' = ' + f2(r.orders) + '</code>',
          'Days between orders: <code>365 ÷ ' + f2(r.orders) + ' = ' + f(r.days, 1) + ' days</code>',
          'Average stock: <code>EOQ ÷ 2 = ' + f2(r.avg) + ' units</code>',
          'Yearly ordering cost: <code>' + f2(r.orders) + ' × ' + f(v.S) + ' = ' + f2(r.ordering) + '</code>',
          'Yearly holding cost: <code>' + f2(r.avg) + ' × ' + f(v.H) + ' = ' + f2(r.holding) + '</code>',
          'Total: <code>' + f2(r.ordering) + ' + ' + f2(r.holding) + ' = ' + f2(r.total) + '</code>'
        ],
        note: 'At the EOQ, the ordering cost and the holding cost are equal. In real life, round to a practical pack size and check supplier discounts, space and shelf life.'
      };
    } });

  add({ id: 'rop', name: 'Reorder point', stage: 'Make', session: 5,
    intro: 'The stock level at which you place the next order, so new stock arrives before you run out.',
    fields: [
      { id: 'd', label: 'Average daily demand', unit: 'units per day', value: 80 },
      { id: 'lt', label: 'Lead time', unit: 'days', value: 7 },
      { id: 'ss', label: 'Safety stock', unit: 'units', value: 200 }
    ],
    run: function (v) {
      if (!(v.d >= 0 && v.lt >= 0 && v.ss >= 0)) return { error: 'Use numbers of 0 or more.' };
      var r = CALC.rop(v.d, v.lt, v.ss);
      return {
        results: [['Reorder point', f(r.rop) + ' units', 1], ['Demand during lead time', f(r.ltDemand) + ' units']],
        steps: [
          'Formula: <code>Reorder point = (daily demand × lead time) + safety stock</code>',
          'Demand during the lead time: <code>' + f(v.d) + ' × ' + f(v.lt) + ' = ' + f(r.ltDemand) + ' units</code>',
          'Add safety stock: <code>' + f(r.ltDemand) + ' + ' + f(v.ss) + ' = ' + f(r.rop) + ' units</code>',
          'When stock falls to <b>' + f(r.rop) + '</b> units, place a new order. If demand is normal, stock will be close to the safety stock (' + f(v.ss) + ') when the order arrives.'
        ] };
    } });

  add({ id: 'ss', name: 'Safety stock', stage: 'Make', session: 5,
    intro: 'Extra stock that protects you when demand or the supplier’s lead time changes. Three methods.',
    fields: [
      { id: 'method', label: 'Method', type: 'select', value: 'basic', options: [['basic', 'Demand varies (lead time fixed)'], ['variable', 'Demand and lead time both vary'], ['max', 'Simple: maximum minus average']] },
      { id: 'sl', label: 'Service level', type: 'select', value: '95', options: [['90', '90% (Z = 1.28)'], ['95', '95% (Z = 1.65)'], ['97.5', '97.5% (Z = 1.96)'], ['98', '98% (Z = 2.05)'], ['99', '99% (Z = 2.33)']], show: function (v) { return v.method !== 'max'; } },
      { id: 'd', label: 'Average demand per period', unit: 'units', value: 100 },
      { id: 'sd', label: 'Standard deviation of demand per period', unit: 'units', value: 20, show: function (v) { return v.method !== 'max'; } },
      { id: 'lt', label: 'Average lead time', unit: 'periods', value: 2 },
      { id: 'slt', label: 'Standard deviation of lead time', unit: 'periods', value: 0.5, show: function (v) { return v.method === 'variable'; } },
      { id: 'maxD', label: 'Maximum demand per period', unit: 'units', value: 150, show: function (v) { return v.method === 'max'; } },
      { id: 'maxLT', label: 'Maximum lead time', unit: 'periods', value: 3, show: function (v) { return v.method === 'max'; } }
    ],
    run: function (v) {
      var z = Z[v.sl], r, steps;
      if (v.method === 'max') {
        r = CALC.ssMax(v.maxD, v.maxLT, v.d, v.lt);
        steps = [
          'Formula: <code>Safety stock = (max demand × max lead time) − (average demand × average lead time)</code>',
          'Worst case: <code>' + f(v.maxD) + ' × ' + f(v.maxLT) + ' = ' + f(r.maxDemand) + '</code>',
          'Normal case: <code>' + f(v.d) + ' × ' + f(v.lt) + ' = ' + f(r.avgDemand) + '</code>',
          'Difference: <code>' + f(r.maxDemand) + ' − ' + f(r.avgDemand) + ' = ' + f(r.ss) + ' units</code>'
        ];
        return { results: [['Safety stock', f(Math.ceil(r.ss)) + ' units', 1]], steps: steps,
          note: 'This method is quick but careful: it usually gives more stock than the statistical methods.' };
      }
      if (v.method === 'variable') {
        r = CALC.ssVariable(z, v.d, v.sd, v.lt, v.slt);
        steps = [
          'Formula: <code>Safety stock = Z × √(LT × σd² + d² × σLT²)</code>',
          'Z for ' + v.sl + '% service = <code>' + z + '</code>',
          'Inside the root: <code>' + f(v.lt) + ' × ' + f(v.sd) + '² + ' + f(v.d) + '² × ' + f(v.slt) + '² = ' + f(v.lt * v.sd * v.sd + v.d * v.d * v.slt * v.slt) + '</code>',
          'Square root: <code>σ of lead-time demand = ' + f2(r.sdl) + '</code>',
          'Multiply by Z: <code>' + z + ' × ' + f2(r.sdl) + ' = ' + f2(r.ss) + '</code> → about <b>' + f(Math.ceil(r.ss)) + ' units</b>'
        ];
        return { results: [['Safety stock', f(Math.ceil(r.ss)) + ' units', 1], ['σ of lead-time demand', f2(r.sdl)]], steps: steps,
          note: 'When the supplier is unreliable (lead time varies), you need much more safety stock. Making the supplier reliable can cut stock.' };
      }
      r = CALC.ssBasic(z, v.sd, v.lt);
      steps = [
        'Formula: <code>Safety stock = Z × σd × √LT</code>',
        'Z for ' + v.sl + '% service = <code>' + z + '</code>',
        'Variation during the lead time: <code>' + f(v.sd) + ' × √' + f(v.lt) + ' = ' + f2(r.sdl) + '</code>',
        'Multiply by Z: <code>' + z + ' × ' + f2(r.sdl) + ' = ' + f2(r.ss) + '</code> → about <b>' + f(Math.ceil(r.ss)) + ' units</b>'
      ];
      return { results: [['Safety stock', f(Math.ceil(r.ss)) + ' units', 1], ['σ of lead-time demand', f2(r.sdl)]], steps: steps,
        note: 'A 95% service level means a 95% chance that safety stock covers each replenishment cycle. It does not mean 95% of customers are served.' };
    } });

  add({ id: 'turnover', name: 'Inventory turnover and days of stock', stage: 'Make', session: 5,
    intro: 'How many times stock is sold and replaced in a year, and how many days the average stock lasts.',
    fields: [
      { id: 'cogs', label: 'Cost of goods sold in the year', unit: 'money', value: 1200000 },
      { id: 'open', label: 'Stock value at the start of the year', unit: 'money', value: 180000 },
      { id: 'close', label: 'Stock value at the end of the year', unit: 'money', value: 220000 }
    ],
    run: function (v) {
      if (!(v.cogs > 0 && v.open + v.close > 0)) return { error: 'Enter cost of goods sold and stock values.' };
      var r = CALC.turnover(v.cogs, v.open, v.close);
      return {
        results: [['Inventory turnover', f(r.turns, 1) + ' times a year', 1], ['Days of stock', f(r.days, 0) + ' days']],
        steps: [
          'Average stock: <code>(' + f(v.open) + ' + ' + f(v.close) + ') ÷ 2 = ' + f(r.avg) + '</code>',
          'Turnover: <code>cost of goods sold ÷ average stock = ' + f(v.cogs) + ' ÷ ' + f(r.avg) + ' = ' + f2(r.turns) + ' times</code>',
          'Days of stock: <code>365 ÷ ' + f2(r.turns) + ' = ' + f(r.days, 1) + ' days</code>'
        ],
        note: 'Higher turnover usually means less cash tied up in stock. Too high can mean stockouts. Compare with your own history and with your industry.' };
    } });

  add({ id: 'landed', name: 'Landed cost of an import', stage: 'Source', session: 4,
    intro: 'The full cost of an imported product when it reaches your warehouse, not just the supplier’s price.',
    fields: [
      { id: 'goods', label: 'Value of the goods (supplier invoice)', unit: 'money', value: 20000 },
      { id: 'freight', label: 'International freight', unit: 'money', value: 1800 },
      { id: 'insurance', label: 'Insurance', unit: 'money', value: 150 },
      { id: 'dutyPct', label: 'Customs duty rate', unit: '%', value: 5 },
      { id: 'taxPct', label: 'Other import taxes', unit: '%', value: 0 },
      { id: 'fees', label: 'Port, clearance and broker fees', unit: 'money', value: 600 },
      { id: 'inland', label: 'Transport from port to warehouse', unit: 'money', value: 350 },
      { id: 'units', label: 'Number of units', unit: 'units', value: 1000 }
    ],
    run: function (v) {
      var r = CALC.landed(v);
      return {
        results: [['Total landed cost', f2(r.total), 1], ['Landed cost per unit', f2(r.perUnit)], ['Supplier price per unit', f2(v.units ? v.goods / v.units : 0)]],
        steps: [
          'Customs value (goods + freight + insurance, called CIF): <code>' + f(v.goods) + ' + ' + f(v.freight) + ' + ' + f(v.insurance) + ' = ' + f2(r.cif) + '</code>',
          'Duty: <code>' + f(v.dutyPct) + '% × ' + f2(r.cif) + ' = ' + f2(r.duty) + '</code>',
          'Other taxes (on customs value + duty): <code>' + f(v.taxPct) + '% × ' + f2(r.cif + r.duty) + ' = ' + f2(r.tax) + '</code>',
          'Add fees and inland transport: <code>' + f2(r.cif) + ' + ' + f2(r.duty) + ' + ' + f2(r.tax) + ' + ' + f(v.fees) + ' + ' + f(v.inland) + ' = ' + f2(r.total) + '</code>',
          'Per unit: <code>' + f2(r.total) + ' ÷ ' + f(v.units) + ' = ' + f2(r.perUnit) + '</code> (the supplier price alone was ' + f2(v.units ? v.goods / v.units : 0) + ')'
        ],
        note: 'In the GCC, customs value is normally the CIF value. The 5% here is only an example: always check the duty rate for your product’s HS code with customs or your broker.' };
    } });

  add({ id: 'delivery', name: 'Cost per delivery and vehicle use', stage: 'Deliver', session: 9,
    intro: 'Two key transport numbers: what each delivery costs, and how full your trucks are.',
    fields: [
      { id: 'cost', label: 'Total transport cost for the month', unit: 'money', value: 42500 },
      { id: 'deliveries', label: 'Deliveries completed', unit: 'deliveries', value: 1700 },
      { id: 'load', label: 'Average load carried per trip', unit: 'tonnes', value: 5 },
      { id: 'cap', label: 'Vehicle capacity', unit: 'tonnes', value: 15 }
    ],
    run: function (v) {
      if (!(v.deliveries > 0 && v.cap > 0)) return { error: 'Deliveries and capacity must be more than 0.' };
      var cpd = v.cost / v.deliveries, util = v.load / v.cap * 100;
      return {
        results: [['Cost per delivery', f2(cpd), 1], ['Vehicle use (fill rate)', f(util, 0) + '%']],
        steps: [
          'Cost per delivery: <code>' + f(v.cost) + ' ÷ ' + f(v.deliveries) + ' = ' + f2(cpd) + '</code>',
          'Vehicle use: <code>' + f(v.load) + ' ÷ ' + f(v.cap) + ' × 100 = ' + f(util, 1) + '%</code>',
          util < 70 ? 'The vehicle is ' + f(100 - util, 0) + '% empty on average: you are paying to carry air. Consider fewer, fuller trips or smaller vehicles.' : 'Good use of capacity.'
        ],
        note: 'Track cost per delivery by route, customer and vehicle type. One number for the whole fleet hides the problems.' };
    } });

  add({ id: 'fuel', name: 'Fuel saving', stage: 'Deliver', session: 9,
    intro: 'What better routes and driving save on fuel each year.',
    fields: [
      { id: 'km', label: 'Kilometres per vehicle per year', unit: 'km', value: 60000 },
      { id: 'before', label: 'Fuel use now', unit: 'litres per 100 km', value: 32 },
      { id: 'after', label: 'Fuel use after the change', unit: 'litres per 100 km', value: 29 },
      { id: 'price', label: 'Fuel price', unit: 'per litre', value: 1.6 },
      { id: 'n', label: 'Number of vehicles', unit: 'vehicles', value: 20 }
    ],
    run: function (v) {
      var litres = v.km / 100 * (v.before - v.after), per = litres * v.price, fleet = per * v.n;
      return {
        results: [['Saving for the fleet', f2(fleet) + ' a year', 1], ['Saving per vehicle', f2(per)], ['Litres saved per vehicle', f(litres, 0)]],
        steps: [
          'Litres saved per vehicle: <code>' + f(v.km) + ' ÷ 100 × (' + f(v.before) + ' − ' + f(v.after) + ') = ' + f(litres) + ' litres</code>',
          'Money per vehicle: <code>' + f(litres) + ' × ' + f(v.price) + ' = ' + f2(per) + '</code>',
          'Whole fleet: <code>' + f2(per) + ' × ' + f(v.n) + ' = ' + f2(fleet) + '</code>'
        ],
        note: 'Saving fuel also cuts emissions: about 2.7 kg of CO₂ for every litre of diesel not burned.' };
    } });

  add({ id: 'mode', name: 'Transport mode trade-off', stage: 'Deliver', session: 9,
    intro: 'A cheaper, slower mode saves freight but keeps more stock on the way. Is it worth it?',
    fields: [
      { id: 'saving', label: 'Freight saving with the slower mode', unit: 'money', value: 5000 },
      { id: 'weeks', label: 'Extra transit time', unit: 'weeks', value: 1 },
      { id: 'hold', label: 'Cost of holding the stock for one more week', unit: 'money per week', value: 4000 },
      { id: 'risk', label: 'Expected cost of stockouts (if any)', unit: 'money', value: 0 }
    ],
    run: function (v) {
      var extra = v.weeks * v.hold + v.risk, net = v.saving - extra;
      return {
        results: [['Net result of switching', (net >= 0 ? 'Save ' : 'Lose ') + f2(Math.abs(net)), 1]],
        steps: [
          'Extra holding cost: <code>' + f(v.weeks) + ' × ' + f(v.hold) + ' = ' + f2(v.weeks * v.hold) + '</code>',
          'Add expected stockout cost: <code>' + f2(v.weeks * v.hold) + ' + ' + f(v.risk) + ' = ' + f2(extra) + '</code>',
          'Net: <code>freight saving − extra cost = ' + f(v.saving) + ' − ' + f2(extra) + ' = ' + f2(net) + '</code>',
          net >= 0 ? 'The slower mode is cheaper overall, if the customer can accept the longer lead time.' : 'The slower mode costs more overall. The freight saving is not enough.'
        ] };
    } });

  add({ id: 'otif', name: 'OTIF and order accuracy', stage: 'Make', session: 7,
    intro: 'On-Time, In-Full: the main measure of delivery reliability.',
    fields: [
      { id: 'orders', label: 'Orders delivered', unit: 'orders', value: 500 },
      { id: 'onTime', label: 'Orders on time', unit: 'orders', value: 480 },
      { id: 'inFull', label: 'Orders in full', unit: 'orders', value: 470 },
      { id: 'both', label: 'Orders on time AND in full', unit: 'orders', value: 455 },
      { id: 'errors', label: 'Orders with any error (wrong item, label, invoice)', unit: 'orders', value: 12 }
    ],
    run: function (v) {
      if (!(v.orders > 0)) return { error: 'Enter the number of orders.' };
      if (v.both > Math.min(v.onTime, v.inFull)) return { error: '"On time and in full" cannot be more than "on time" or "in full".' };
      var r = CALC.otif(v);
      return {
        results: [['OTIF', f(r.otif, 1) + '%', 1], ['On time', f(r.onTime, 1) + '%'], ['In full', f(r.inFull, 1) + '%'], ['Order accuracy', f(r.accuracy, 1) + '%']],
        steps: [
          'OTIF: <code>' + f(v.both) + ' ÷ ' + f(v.orders) + ' × 100 = ' + f(r.otif, 1) + '%</code>',
          'On time: <code>' + f(v.onTime) + ' ÷ ' + f(v.orders) + ' × 100 = ' + f(r.onTime, 1) + '%</code>',
          'In full: <code>' + f(v.inFull) + ' ÷ ' + f(v.orders) + ' × 100 = ' + f(r.inFull, 1) + '%</code>',
          'Order accuracy: <code>(' + f(v.orders) + ' − ' + f(v.errors) + ') ÷ ' + f(v.orders) + ' × 100 = ' + f(r.accuracy, 1) + '%</code>'
        ],
        note: 'OTIF is always lower than on-time or in-full alone, because an order must pass both tests. Agree in writing what "on time" means (arrival at the customer, not dispatch).' };
    } });

  add({ id: 'nps', name: 'Net Promoter Score (NPS)', stage: 'Make', session: 7,
    intro: '"How likely are you to recommend us?" on a 0–10 scale.',
    fields: [
      { id: 'p', label: 'Promoters (scores 9–10)', unit: 'people', value: 60 },
      { id: 'pa', label: 'Passives (scores 7–8)', unit: 'people', value: 25 },
      { id: 'd', label: 'Detractors (scores 0–6)', unit: 'people', value: 15 }
    ],
    run: function (v) {
      var r = CALC.nps(v.p, v.pa, v.d);
      if (!r.total) return { error: 'Enter the number of answers.' };
      return {
        results: [['NPS', (r.nps > 0 ? '+' : '') + f(r.nps, 0), 1], ['Answers', f(r.total)]],
        steps: [
          'Promoters: <code>' + f(v.p) + ' ÷ ' + f(r.total) + ' = ' + f(r.pP, 1) + '%</code>',
          'Detractors: <code>' + f(v.d) + ' ÷ ' + f(r.total) + ' = ' + f(r.pD, 1) + '%</code>',
          'NPS: <code>' + f(r.pP, 1) + ' − ' + f(r.pD, 1) + ' = ' + f(r.nps, 1) + '</code> (passives are not used)'
        ],
        note: 'NPS runs from −100 to +100. It shows the trend, not the reason: read the comments and complaints to find out why.' };
    } });

  // ------------------------------------------------------- table tools --
  add({ id: 'supplier', name: 'Supplier scoring matrix', stage: 'Source', session: 3, custom: true,
    intro: 'Compare suppliers fairly: give each criterion a weight, score each supplier from 1 to 5, and multiply.' });
  add({ id: 'tco', name: 'Total cost of ownership', stage: 'Source', session: 3, custom: true,
    intro: 'The cheapest price is not always the cheapest supplier. Compare the full cost of buying from each one.' });
  add({ id: 'abc', name: 'ABC analysis', stage: 'Make', session: 5, custom: true,
    intro: 'Sort stock items by yearly value so you control the most important ones most closely.' });
  add({ id: 'forecast', name: 'Forecasting and forecast error', stage: 'Plan', session: 2, custom: true,
    intro: 'Three forecasting methods side by side, with the error of each one (MAPE, bias, MAD).' });
  add({ id: 'risk', name: 'Risk score and heat map', stage: 'Return', session: 10, custom: true,
    intro: 'Score each risk for probability and impact (1–5). The heat map shows which ones to act on first.' });

  // ------------------------------------------------------------ render --
  function fieldHtml(fd, v) {
    if (fd.show && !fd.show(v)) return '';
    if (fd.type === 'select') {
      return '<label class="field"><span>' + esc(fd.label) + '</span><select class="input" data-f="' + fd.id + '">' +
        fd.options.map(function (o) { return '<option value="' + o[0] + '"' + (String(v[fd.id]) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    }
    return '<label class="field"><span>' + esc(fd.label) + '</span><div class="unit-wrap"><input class="input" inputmode="decimal" data-f="' + fd.id + '" value="' + esc(v[fd.id]) + '">' +
      (fd.unit ? '<small>' + esc(fd.unit) + '</small>' : '') + '</div></label>';
  }
  function resultHtml(out) {
    if (out.error) return '<p class="note err">' + esc(out.error) + '</p>';
    return '<div class="results">' + out.results.map(function (r) {
      return '<div class="res-row' + (r[2] ? ' main' : '') + '"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>';
    }).join('') + '</div>' +
      '<h3 class="steps-h">The working, step by step</h3><ol class="steps work">' + out.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
      (out.note ? '<div class="callout"><b>Remember</b>' + out.note + '</div>' : '');
  }
  function simple(el, t) {
    var v = {};
    t.fields.forEach(function (fd) { v[fd.id] = fd.value; });
    function draw() {
      el.innerHTML = '<div class="tool-grid"><form class="card pad tool-in" onsubmit="return false"><h2 class="h2" style="font-size:1.05rem;margin-bottom:10px">Your numbers</h2>' +
        t.fields.map(function (fd) { return fieldHtml(fd, v); }).join('') +
        '<button class="btn ghost" type="button" data-reset>Reset to the example</button></form>' +
        '<div class="card pad tool-out" aria-live="polite" id="toolOut"></div></div>';
      update();
      $$('[data-f]', el).forEach(function (inp) {
        inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', function () {
          var fd = t.fields.filter(function (x) { return x.id === inp.getAttribute('data-f'); })[0];
          v[fd.id] = fd.type === 'select' ? inp.value : inp.value;
          if (fd.type === 'select') draw(); else update();
        });
      });
      $('[data-reset]', el).onclick = function () { t.fields.forEach(function (fd) { v[fd.id] = fd.value; }); draw(); };
    }
    function update() {
      var vals = {}, bad = false;
      t.fields.forEach(function (fd) {
        if (fd.type === 'select') { vals[fd.id] = v[fd.id]; return; }
        if (fd.show && !fd.show(v)) { vals[fd.id] = num(fd.value); return; }
        var n = num(v[fd.id]); if (isNaN(n)) bad = true; vals[fd.id] = n;
      });
      $('#toolOut', el).innerHTML = bad ? '<p class="note err">Type a number in every box.</p>' : resultHtml(t.run(vals));
    }
    draw();
  }

  // supplier scoring --------------------------------------------------
  function supplierTool(el) {
    var crit = [['Quality', 40], ['Price', 25], ['Reliability', 20], ['Compliance', 15]];
    var sup = ['Supplier A', 'Supplier B', 'Supplier C'];
    var sc = [[4.5, 3.0, 4.0, 5.0], [3.5, 4.5, 3.5, 4.0], [4.0, 3.5, 3.0, 4.5]];
    function draw() {
      el.innerHTML = '<div class="card pad"><div class="tbl"><table class="edit"><thead><tr><th>Criterion</th><th>Weight %</th>' +
        sup.map(function (s, j) { return '<th><input class="input sm" data-sup="' + j + '" value="' + esc(s) + '" aria-label="Supplier name"></th>'; }).join('') + '</tr></thead><tbody>' +
        crit.map(function (c, i) {
          return '<tr><td><input class="input sm" data-cn="' + i + '" value="' + esc(c[0]) + '" aria-label="Criterion"></td><td><input class="input sm num" data-w="' + i + '" value="' + c[1] + '" inputmode="decimal" aria-label="Weight"></td>' +
            sup.map(function (s, j) { return '<td><input class="input sm num" data-s="' + j + ':' + i + '" value="' + sc[j][i] + '" inputmode="decimal" aria-label="Score"></td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="btns noprint"><button class="btn ghost" data-addc>+ Criterion</button><button class="btn ghost" data-adds>+ Supplier</button><button class="btn ghost" data-delc>− Criterion</button><button class="btn ghost" data-dels>− Supplier</button></div></div>' +
        '<div class="card pad sec" id="toolOut" aria-live="polite"></div>';
      $$('input', el).forEach(function (inp) { inp.addEventListener('input', read); });
      $('[data-addc]', el).onclick = function () { crit.push(['New criterion', 0]); sc.forEach(function (r) { r.push(3); }); draw(); };
      $('[data-adds]', el).onclick = function () { sup.push('Supplier ' + String.fromCharCode(65 + sup.length)); sc.push(crit.map(function () { return 3; })); draw(); };
      $('[data-delc]', el).onclick = function () { if (crit.length > 1) { crit.pop(); sc.forEach(function (r) { r.pop(); }); draw(); } };
      $('[data-dels]', el).onclick = function () { if (sup.length > 1) { sup.pop(); sc.pop(); draw(); } };
      out();
    }
    function read() {
      $$('[data-cn]', el).forEach(function (x) { crit[+x.getAttribute('data-cn')][0] = x.value; });
      $$('[data-w]', el).forEach(function (x) { crit[+x.getAttribute('data-w')][1] = num(x.value); });
      $$('[data-sup]', el).forEach(function (x) { sup[+x.getAttribute('data-sup')] = x.value; });
      $$('[data-s]', el).forEach(function (x) { var p = x.getAttribute('data-s').split(':'); sc[+p[0]][+p[1]] = num(x.value); });
      out();
    }
    function out() {
      var o = $('#toolOut', el), w = crit.map(function (c) { return c[1]; });
      var tw = w.reduce(function (a, b) { return a + b; }, 0);
      if (w.some(isNaN) || sc.some(function (r) { return r.some(isNaN); })) { o.innerHTML = '<p class="note err">Type a number in every box.</p>'; return; }
      if (Math.abs(tw - 100) > 0.001) { o.innerHTML = '<p class="note err">The weights add up to ' + f(tw) + '%. They must add up to 100%.</p>'; return; }
      if (sc.some(function (r) { return r.some(function (x) { return x < 1 || x > 5; }); })) { o.innerHTML = '<p class="note err">Scores must be from 1 to 5.</p>'; return; }
      var tot = CALC.weighted(w, sc), best = tot.indexOf(Math.max.apply(null, tot));
      var order = tot.map(function (t, j) { return j; }).sort(function (a, b) { return tot[b] - tot[a]; });
      o.innerHTML = '<div class="results">' + order.map(function (j, k) {
        return '<div class="res-row' + (k === 0 ? ' main' : '') + '"><span>' + (k + 1) + '. ' + esc(sup[j]) + '</span><b>' + f2(tot[j]) + ' / 5</b></div>';
      }).join('') + '</div><h3 class="steps-h">The working, step by step</h3><ol class="steps work">' +
        '<li>Multiply each score by its weight, then add: <code>total = Σ (score × weight ÷ 100)</code></li>' +
        sup.map(function (s, j) {
          return '<li>' + esc(s) + ': <code>' + crit.map(function (c, i) { return f(sc[j][i]) + '×' + f(c[1] / 100); }).join(' + ') + ' = ' + f2(tot[j]) + '</code></li>';
        }).join('') + '<li><b>' + esc(sup[best]) + '</b> has the highest weighted score.</li></ol>' +
        '<div class="callout"><b>Remember</b>The matrix supports your judgement; it does not replace it. Check what the numbers cannot show: the supplier’s financial health, willingness to work long term, and route risk.</div>';
    }
    draw();
  }

  // total cost of ownership ------------------------------------------------
  function tcoTool(el) {
    var rows = [['price', 'Unit price'], ['qty', 'Quantity'], ['freight', 'Freight'], ['fees', 'Other fees'], ['inspection', 'Inspection cost'],
      ['defectPct', 'Defect rate %'], ['defectCost', 'Cost per defective unit'], ['payDays', 'Payment terms (days)'], ['ratePct', 'Cost of money % per year']];
    var sup = [
      { name: 'Supplier A (local)', price: 2.5, qty: 10000, freight: 0, fees: 0, inspection: 200, defectPct: 0.5, defectCost: 4, payDays: 60, ratePct: 8 },
      { name: 'Supplier B (overseas)', price: 2.1, qty: 10000, freight: 2600, fees: 450, inspection: 600, defectPct: 3, defectCost: 4, payDays: 0, ratePct: 8 }
    ];
    function draw() {
      el.innerHTML = '<div class="card pad"><div class="tbl"><table class="edit"><thead><tr><th></th>' +
        sup.map(function (s, j) { return '<th><input class="input sm" data-n="' + j + '" value="' + esc(s.name) + '" aria-label="Supplier name"></th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr><th scope="row">' + esc(r[1]) + '</th>' + sup.map(function (s, j) { return '<td><input class="input sm num" data-k="' + j + ':' + r[0] + '" value="' + s[r[0]] + '" inputmode="decimal" aria-label="' + esc(r[1]) + '"></td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div><div class="btns noprint"><button class="btn ghost" data-add>+ Supplier</button><button class="btn ghost" data-del>− Supplier</button></div></div>' +
        '<div class="card pad sec" id="toolOut" aria-live="polite"></div>';
      $$('input', el).forEach(function (inp) { inp.addEventListener('input', read); });
      $('[data-add]', el).onclick = function () { var c = JSON.parse(JSON.stringify(sup[sup.length - 1])); c.name = 'Supplier ' + String.fromCharCode(65 + sup.length); sup.push(c); draw(); };
      $('[data-del]', el).onclick = function () { if (sup.length > 1) { sup.pop(); draw(); } };
      out();
    }
    function read() {
      $$('[data-n]', el).forEach(function (x) { sup[+x.getAttribute('data-n')].name = x.value; });
      $$('[data-k]', el).forEach(function (x) { var p = x.getAttribute('data-k').split(':'); sup[+p[0]][p[1]] = num(x.value); });
      out();
    }
    function out() {
      var o = $('#toolOut', el);
      if (sup.some(function (s) { return rows.some(function (r) { return isNaN(s[r[0]]); }) || !(s.qty > 0); })) { o.innerHTML = '<p class="note err">Type a number in every box. Quantity must be more than 0.</p>'; return; }
      var res = sup.map(function (s) { return CALC.tco(s); });
      var best = 0; res.forEach(function (r, j) { if (r.total < res[best].total) best = j; });
      var cheapest = 0; sup.forEach(function (s, j) { if (s.price < sup[cheapest].price) cheapest = j; });
      o.innerHTML = '<div class="results">' + sup.map(function (s, j) {
        return '<div class="res-row' + (j === best ? ' main' : '') + '"><span>' + esc(s.name) + '</span><b>' + f2(res[j].total) + ' (' + f(res[j].perUnit, 3) + ' per unit)</b></div>';
      }).join('') + '</div><h3 class="steps-h">The working, step by step</h3><ol class="steps work">' +
        '<li>Total = purchase + freight + fees + inspection + cost of defects − value of paying later</li>' +
        sup.map(function (s, j) {
          var r = res[j];
          return '<li>' + esc(s.name) + ': purchase <code>' + f(s.price) + ' × ' + f(s.qty) + ' = ' + f2(r.purchase) + '</code>; defects <code>' + f(s.defectPct) + '% × ' + f(s.qty) + ' × ' + f(s.defectCost) + ' = ' + f2(r.defects) +
            '</code>; paying later saves <code>' + f2(r.purchase) + ' × ' + f(s.ratePct) + '% × ' + f(s.payDays) + '/365 = ' + f2(r.payBenefit) + '</code>; total <code>' + f2(r.total) + '</code></li>';
        }).join('') +
        '<li><b>' + esc(sup[best].name) + '</b> has the lowest total cost' + (best !== cheapest ? ', even though <b>' + esc(sup[cheapest].name) + '</b> has the lowest price.' : '.') + '</li></ol>' +
        '<div class="callout"><b>Remember</b>Also think about lead time: a slow supplier means more stock in your warehouse. Note things that money cannot show, like innovation or risk on the shipping route.</div>';
    }
    draw();
  }

  // ABC analysis --------------------------------------------------------
  function abcTool(el) {
    var items = [['Insulin pens', 1200, 95], ['Blood test strips', 9000, 6], ['Antibiotic X', 4000, 12], ['Paracetamol 500mg', 30000, 0.4], ['Vitamin D', 6000, 2.5],
      ['Bandages', 15000, 0.8], ['Face masks', 40000, 0.15], ['Inhalers', 900, 28], ['Syringes', 20000, 0.3], ['Hand gel', 5000, 1.2]];
    var aCut = 80, bCut = 95;
    function draw() {
      el.innerHTML = '<div class="card pad"><div class="tbl"><table class="edit"><thead><tr><th>Item</th><th>Units per year</th><th>Unit cost</th></tr></thead><tbody>' +
        items.map(function (it, i) {
          return '<tr><td><input class="input sm" data-i="' + i + ':0" value="' + esc(it[0]) + '" aria-label="Item"></td><td><input class="input sm num" data-i="' + i + ':1" value="' + it[1] + '" inputmode="decimal" aria-label="Units per year"></td><td><input class="input sm num" data-i="' + i + ':2" value="' + it[2] + '" inputmode="decimal" aria-label="Unit cost"></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="btns noprint"><button class="btn ghost" data-add>+ Item</button><button class="btn ghost" data-del>− Item</button>' +
        '<label class="field inline"><span>A up to</span><input class="input sm num" data-a value="' + aCut + '">%</label><label class="field inline"><span>B up to</span><input class="input sm num" data-b value="' + bCut + '">%</label></div></div>' +
        '<div class="card pad sec" id="toolOut" aria-live="polite"></div>';
      $$('input', el).forEach(function (inp) { inp.addEventListener('input', read); });
      $('[data-add]', el).onclick = function () { items.push(['New item', 100, 1]); draw(); };
      $('[data-del]', el).onclick = function () { if (items.length > 2) { items.pop(); draw(); } };
      out();
    }
    function read() {
      $$('[data-i]', el).forEach(function (x) { var p = x.getAttribute('data-i').split(':'); items[+p[0]][+p[1]] = p[1] === '0' ? x.value : num(x.value); });
      aCut = num($('[data-a]', el).value); bCut = num($('[data-b]', el).value);
      out();
    }
    function out() {
      var o = $('#toolOut', el);
      if (items.some(function (it) { return isNaN(it[1]) || isNaN(it[2]); }) || isNaN(aCut) || isNaN(bCut) || aCut >= bCut) { o.innerHTML = '<p class="note err">Type a number in every box. "A up to" must be less than "B up to".</p>'; return; }
      var r = CALC.abc(items.map(function (it) { return { name: it[0], units: it[1], cost: it[2] }; }), aCut, bCut);
      var count = { A: 0, B: 0, C: 0 }; r.rows.forEach(function (x) { count[x.cls]++; });
      o.innerHTML = '<div class="tbl"><table><thead><tr><th>Item</th><th>Yearly value</th><th>Share</th><th>Running total</th><th>Class</th></tr></thead><tbody>' +
        r.rows.map(function (x) { return '<tr><th scope="row">' + esc(x.name) + '</th><td>' + f2(x.value) + '</td><td>' + f(x.share, 1) + '%</td><td>' + f(x.cum, 1) + '%</td><td><span class="cls cls-' + x.cls + '">' + x.cls + '</span></td></tr>'; }).join('') +
        '</tbody></table></div><h3 class="steps-h">The working, step by step</h3><ol class="steps work">' +
        '<li>Yearly value of each item: <code>units per year × unit cost</code>. Total of all items: <code>' + f2(r.total) + '</code></li>' +
        '<li>Sort from the highest value to the lowest, and work out each item’s share of the total.</li>' +
        '<li>Add the shares one by one (running total). Items within the first ' + f(aCut) + '% are <b>A</b>, up to ' + f(bCut) + '% are <b>B</b>, the rest are <b>C</b>.</li>' +
        '<li>Result: ' + count.A + ' A items, ' + count.B + ' B items, ' + count.C + ' C items.</li></ol>' +
        '<div class="callout"><b>What to do</b><b>A</b>: tight control, frequent review, count monthly. <b>B</b>: normal control, count each quarter. <b>C</b>: simple rules, count once or twice a year. Value is not everything: a cheap item can still be critical.</div>';
    }
    draw();
  }

  // forecasting -----------------------------------------------------------
  function forecastTool(el) {
    var st = { data: '420, 445, 410, 460, 480, 455, 500, 520, 490, 540, 560, 535', n: 3, w: '0.5, 0.3, 0.2', a: 0.3 };
    el.innerHTML = '<div class="card pad"><div class="grid g2"><label class="field"><span>Past demand, oldest first (comma between numbers)</span><textarea class="input" data-d style="min-height:90px">' + esc(st.data) + '</textarea></label>' +
      '<div><label class="field"><span>Moving average: number of periods (n)</span><input class="input" data-n value="' + st.n + '" inputmode="numeric"></label>' +
      '<label class="field"><span>Weighted average: weights, newest first (must add up to 1)</span><input class="input" data-w value="' + st.w + '"></label>' +
      '<label class="field"><span>Exponential smoothing: α (0 to 1)</span><input class="input" data-a value="' + st.a + '" inputmode="decimal"></label></div></div></div>' +
      '<div class="card pad sec" id="toolOut" aria-live="polite"></div>';
    $$('input, textarea', el).forEach(function (inp) { inp.addEventListener('input', out); });
    function out() {
      var o = $('#toolOut', el);
      var data = $('[data-d]', el).value.split(/[,\s;]+/).filter(Boolean).map(num);
      var n = Math.round(num($('[data-n]', el).value)), w = $('[data-w]', el).value.split(/[,\s;]+/).filter(Boolean).map(num), a = num($('[data-a]', el).value);
      var ws = w.reduce(function (s, x) { return s + x; }, 0);
      if (data.length < 4 || data.some(isNaN)) { o.innerHTML = '<p class="note err">Enter at least 4 past numbers, separated by commas.</p>'; return; }
      if (!(n >= 1 && n < data.length)) { o.innerHTML = '<p class="note err">n must be at least 1 and less than the number of past periods.</p>'; return; }
      if (w.some(isNaN) || Math.abs(ws - 1) > 0.001 || w.length >= data.length) { o.innerHTML = '<p class="note err">The weights must add up to 1 (they add up to ' + f(ws, 3) + ').</p>'; return; }
      if (!(a > 0 && a <= 1)) { o.innerHTML = '<p class="note err">α must be more than 0 and not more than 1.</p>'; return; }
      var r = CALC.forecast(data, n, w, a), L = data.length;
      function cell(x) { return x == null ? '<td class="muted">–</td>' : '<td>' + f(x, 1) + '</td>'; }
      var best = ['ma', 'wma', 'es'].filter(function (k) { return r.err[k].mape != null; }).sort(function (p, q) { return r.err[p].mape - r.err[q].mape; })[0];
      var names = { ma: n + '-period moving average', wma: 'Weighted moving average', es: 'Exponential smoothing (α = ' + a + ')' };
      o.innerHTML = '<div class="results">' + ['ma', 'wma', 'es'].map(function (k) {
        var fc = r[k][L];
        return '<div class="res-row' + (k === best ? ' main' : '') + '"><span>' + names[k] + '<br><small>MAPE ' + f(r.err[k].mape, 1) + '% · bias ' + f(r.err[k].bias, 0) + ' · MAD ' + f(r.err[k].mad, 1) + '</small></span><b>Next: ' + f(fc, 0) + '</b></div>';
      }).join('') + '</div>' + chart(data, r) +
        '<div class="tbl"><table><thead><tr><th>Period</th><th>Actual</th><th>Moving avg</th><th>Weighted</th><th>Exp. smoothing</th></tr></thead><tbody>' +
        data.map(function (x, i) { return '<tr><th scope="row">' + (i + 1) + '</th><td>' + f(x) + '</td>' + cell(r.ma[i]) + cell(r.wma[i]) + cell(r.es[i]) + '</tr>'; }).join('') +
        '<tr><th scope="row">' + (L + 1) + ' (next)</th><td class="muted">?</td>' + cell(r.ma[L]) + cell(r.wma[L]) + cell(r.es[L]) + '</tr></tbody></table></div>' +
        '<h3 class="steps-h">The working, step by step</h3><ol class="steps work">' +
        '<li>Moving average: the average of the last ' + n + ' actuals. Next = <code>(' + data.slice(L - n).map(function (x) { return f(x); }).join(' + ') + ') ÷ ' + n + ' = ' + f(r.ma[L], 1) + '</code></li>' +
        '<li>Weighted average: newest × ' + w[0] + ', and so on. Next = <code>' + w.map(function (x, i) { return f(x) + '×' + f(data[L - 1 - i]); }).join(' + ') + ' = ' + f(r.wma[L], 1) + '</code></li>' +
        '<li>Exponential smoothing: <code>new forecast = old forecast + α × (actual − old forecast)</code>. Next = <code>' + f(r.es[L - 1], 1) + ' + ' + a + ' × (' + f(data[L - 1]) + ' − ' + f(r.es[L - 1], 1) + ') = ' + f(r.es[L], 1) + '</code></li>' +
        '<li>Error for each period = actual − forecast. <b>MAPE</b> = average of |error| ÷ actual × 100. <b>Bias</b> = sum of errors (positive means the forecast was too low). <b>MAD</b> = average of |error|.</li>' +
        '<li>The method with the lowest MAPE here is <b>' + names[best] + '</b>.</li></ol>' +
        '<div class="callout"><b>Remember</b>If demand has a clear trend, all three methods lag behind it, and the bias shows it. Add trend or seasonality, and use people’s knowledge (promotions, Ramadan, new customers) on top of the numbers.</div>';
    }
    out();
  }
  function chart(data, r) {
    var W = 640, H = 220, p = 30, all = data.concat(r.es.filter(function (x) { return x != null; }));
    var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all); if (mx === mn) mx = mn + 1;
    var n = data.length + 1;
    function X(i) { return p + i * (W - 2 * p) / (n - 1); }
    function Y(v) { return H - p - (v - mn) / (mx - mn) * (H - 2 * p); }
    function line(arr, col, dash) {
      var pts = arr.map(function (v, i) { return v == null ? null : X(i) + ',' + Y(v); }).filter(Boolean);
      return '<polyline fill="none" stroke="' + col + '" stroke-width="3" ' + (dash ? 'stroke-dasharray="6 5" ' : '') + 'points="' + pts.join(' ') + '"/>';
    }
    return '<figure class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Actual demand and exponential smoothing forecast">' +
      '<line x1="' + p + '" y1="' + (H - p) + '" x2="' + (W - p) + '" y2="' + (H - p) + '" stroke="#DFE4EE"/>' +
      line(data, '#14213D') + line(r.es, '#00B4B4', true) + line(r.ma, '#8338EC', true) +
      '</svg><figcaption><span><i style="background:#14213D"></i>Actual</span><span><i style="background:#00B4B4"></i>Exponential smoothing</span><span><i style="background:#8338EC"></i>Moving average</span></figcaption></figure>';
  }

  // risk heat map ------------------------------------------------------------
  function riskTool(el) {
    var risks = [['Main supplier uses one shipping route (Red Sea)', 4, 4], ['Port strike at destination', 3, 4], ['Key IT system down for a day', 2, 3], ['Customs document error', 3, 2], ['Warehouse power cut', 1, 3]];
    function draw() {
      el.innerHTML = '<div class="card pad"><div class="tbl"><table class="edit"><thead><tr><th>Risk</th><th>Probability 1–5</th><th>Impact 1–5</th></tr></thead><tbody>' +
        risks.map(function (r, i) {
          return '<tr><td><input class="input sm" data-r="' + i + ':0" value="' + esc(r[0]) + '" aria-label="Risk"></td><td><input class="input sm num" data-r="' + i + ':1" value="' + r[1] + '" inputmode="numeric" aria-label="Probability"></td><td><input class="input sm num" data-r="' + i + ':2" value="' + r[2] + '" inputmode="numeric" aria-label="Impact"></td></tr>';
        }).join('') + '</tbody></table></div><div class="btns noprint"><button class="btn ghost" data-add>+ Risk</button><button class="btn ghost" data-del>− Risk</button></div></div>' +
        '<div class="card pad sec" id="toolOut" aria-live="polite"></div>';
      $$('input', el).forEach(function (inp) { inp.addEventListener('input', read); });
      $('[data-add]', el).onclick = function () { risks.push(['New risk', 3, 3]); draw(); };
      $('[data-del]', el).onclick = function () { if (risks.length > 1) { risks.pop(); draw(); } };
      out();
    }
    function read() {
      $$('[data-r]', el).forEach(function (x) { var p = x.getAttribute('data-r').split(':'); risks[+p[0]][+p[1]] = p[1] === '0' ? x.value : num(x.value); });
      out();
    }
    function out() {
      var o = $('#toolOut', el);
      if (risks.some(function (r) { return !(r[1] >= 1 && r[1] <= 5 && r[2] >= 1 && r[2] <= 5); })) { o.innerHTML = '<p class="note err">Probability and impact must be from 1 to 5.</p>'; return; }
      var list = risks.map(function (r, i) { var s = r[1] * r[2]; return { i: i + 1, name: r[0], p: r[1], im: r[2], s: s, lvl: CALC.riskLevel(s) }; })
        .sort(function (a, b) { return b.s - a.s; });
      var grid = '<div class="heat" role="img" aria-label="Risk heat map"><div class="heat-y">Impact →</div><div class="heat-g">';
      for (var im = 5; im >= 1; im--) for (var p = 1; p <= 5; p++) {
        var lv = CALC.riskLevel(p * im), here = list.filter(function (x) { return Math.round(x.p) === p && Math.round(x.im) === im; });
        grid += '<div class="hc hc-' + lv + '">' + here.map(function (x) { return '<span>' + x.i + '</span>'; }).join('') + '</div>';
      }
      grid += '</div><div class="heat-x">Probability →</div></div>';
      var act = { Critical: 'Act now: reduce or avoid. Name an owner and a trigger.', High: 'Reduce soon: backup supplier, buffer stock or another route.', Medium: 'Reduce or prepare a contingency plan.', Low: 'Accept and monitor.' };
      o.innerHTML = '<div class="grid g2"><div>' + grid + '<p class="small muted" style="margin-top:8px">Numbers in the squares are the risk numbers in your list.</p></div><div><div class="results">' +
        list.map(function (x) { return '<div class="res-row' + (x.lvl === 'Critical' || x.lvl === 'High' ? ' main' : '') + '"><span>' + x.i + '. ' + esc(x.name) + '<br><small>' + act[x.lvl] + '</small></span><b>' + f(x.s) + ' · ' + x.lvl + '</b></div>'; }).join('') +
        '</div></div></div><h3 class="steps-h">The working, step by step</h3><ol class="steps work"><li>Risk score = <code>probability × impact</code> (each from 1 to 5, so the score is 1–25).</li>' +
        '<li>Levels: <b>1–4 Low</b>, <b>5–9 Medium</b>, <b>10–15 High</b>, <b>16–25 Critical</b>.</li><li>Top risk: <b>' + esc(list[0].name) + '</b> (' + f(list[0].p) + ' × ' + f(list[0].im) + ' = ' + f(list[0].s) + ').</li></ol>' +
        '<div class="callout"><b>Four strategies</b><b>Avoid</b> (remove the risk), <b>reduce</b> (lower probability or impact), <b>transfer</b> (insurance, contract) or <b>accept</b> (and monitor). Every risk needs a named owner.</div>';
    }
    draw();
  }

  var CUSTOM = { supplier: supplierTool, tco: tcoTool, abc: abcTool, forecast: forecastTool, risk: riskTool };

  function mount(el, id) {
    var t = T.filter(function (x) { return x.id === id; })[0];
    if (!t) return false;
    if (t.custom) CUSTOM[id](el); else simple(el, t);
    return true;
  }

  root.LSCM_TOOLS = { list: T, mount: mount, CALC: CALC, Z: Z };
  if (typeof module !== 'undefined') module.exports = root.LSCM_TOOLS;
})(typeof window !== 'undefined' ? window : globalThis);
