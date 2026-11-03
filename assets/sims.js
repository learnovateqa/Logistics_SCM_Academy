/* My Supply Chain: company templates and the four simulations.
 * Pure models (COMPANIES, MODEL) are separate from the page code so they can be tested.
 * All company figures are examples for teaching.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------- companies --
  var PESTEL = [['political', 'Political stability'], ['tariff', 'Tariffs and trade rules'], ['route', 'Shipping route disruption'], ['environment', 'Climate and environment']];
  var COMPANIES = {
    food: {
      id: 'food', type: 'Food importer', name: 'Doha Fresh Imports',
      about: 'Imports chilled and dry food and supplies supermarkets and cafés in Qatar.',
      product: 'Yoghurt (case of 24)', unitCost: 18, price: 26,
      demand: [420, 445, 410, 460, 480, 455, 500, 520, 490, 540, 560, 535],
      weeklyDemand: 120, weeklySd: 22, orderCost: 180, holdingPct: 25,
      cogs: 2400000, stockOpen: 260000, stockClose: 300000,
      deliveriesMonth: 1500, transportMonth: 39000,
      suppliers: [
        { name: 'Local dairy (Qatar)', kind: 'Local', cost: 19.5, lead: 2, defect: 0.4, route: 'Road', risk: { political: 1, tariff: 1, route: 1, environment: 2 } },
        { name: 'Regional dairy (GCC)', kind: 'Regional', cost: 17.6, lead: 5, defect: 0.8, route: 'Road, border crossing', risk: { political: 2, tariff: 2, route: 2, environment: 2 } },
        { name: 'Overseas dairy (Europe)', kind: 'Global', cost: 15.4, lead: 21, defect: 1.2, route: 'Sea via Suez and the Red Sea', redSea: true, risk: { political: 2, tariff: 3, route: 5, environment: 3 } }
      ]
    },
    pharma: {
      id: 'pharma', type: 'Pharmacy distributor', name: 'Gulf Care Pharma',
      about: 'Distributes medicines and medical supplies to pharmacies and clinics.',
      product: 'Blood-test strips (box of 50)', unitCost: 42, price: 60,
      demand: [300, 310, 295, 320, 330, 315, 340, 335, 350, 360, 345, 370],
      weeklyDemand: 80, weeklySd: 12, orderCost: 250, holdingPct: 22,
      cogs: 5200000, stockOpen: 720000, stockClose: 680000,
      deliveriesMonth: 900, transportMonth: 31500,
      suppliers: [
        { name: 'Local wholesaler (Qatar)', kind: 'Local', cost: 47, lead: 2, defect: 0.1, route: 'Road', risk: { political: 1, tariff: 1, route: 1, environment: 1 } },
        { name: 'Maker in India', kind: 'Global', cost: 38, lead: 18, defect: 0.6, route: 'Sea to Hamad Port', risk: { political: 2, tariff: 2, route: 3, environment: 3 } },
        { name: 'Maker in Germany', kind: 'Global', cost: 41, lead: 6, defect: 0.1, route: 'Air to Hamad International Airport', risk: { political: 1, tariff: 2, route: 2, environment: 1 } }
      ]
    },
    online: {
      id: 'online', type: 'Online shop', name: 'Souq Click',
      about: 'Sells phone accessories and small electronics online, with home delivery in Qatar.',
      product: 'Wireless earbuds', unitCost: 55, price: 99,
      demand: [210, 230, 205, 260, 240, 290, 270, 310, 330, 300, 360, 420],
      weeklyDemand: 70, weeklySd: 18, orderCost: 300, holdingPct: 30,
      cogs: 1900000, stockOpen: 240000, stockClose: 320000,
      deliveriesMonth: 2800, transportMonth: 56000,
      suppliers: [
        { name: 'Regional distributor (UAE)', kind: 'Regional', cost: 61, lead: 4, defect: 1.0, route: 'Road, border crossing', risk: { political: 2, tariff: 1, route: 2, environment: 1 } },
        { name: 'Factory in China (sea)', kind: 'Global', cost: 44, lead: 30, defect: 2.5, route: 'Sea via the Strait of Malacca and the Gulf', risk: { political: 2, tariff: 3, route: 3, environment: 3 } },
        { name: 'Factory in China (air)', kind: 'Global', cost: 49, lead: 7, defect: 2.5, route: 'Air freight', risk: { political: 2, tariff: 3, route: 2, environment: 2 } }
      ]
    },
    build: {
      id: 'build', type: 'Building-materials supplier', name: 'Al Bina Supplies',
      about: 'Supplies cement, tiles and steel fixings to contractors across Qatar.',
      product: 'Ceramic floor tiles (box)', unitCost: 24, price: 35,
      demand: [900, 950, 880, 1000, 1050, 980, 900, 870, 1100, 1150, 1080, 1200],
      weeklyDemand: 240, weeklySd: 45, orderCost: 400, holdingPct: 18,
      cogs: 6300000, stockOpen: 900000, stockClose: 1100000,
      deliveriesMonth: 650, transportMonth: 52000,
      suppliers: [
        { name: 'Local factory (Qatar)', kind: 'Local', cost: 27, lead: 5, defect: 1.5, route: 'Road', risk: { political: 1, tariff: 1, route: 1, environment: 2 } },
        { name: 'Factory in Spain', kind: 'Global', cost: 20, lead: 28, defect: 0.8, route: 'Sea via Suez and the Red Sea', redSea: true, risk: { political: 1, tariff: 3, route: 5, environment: 2 } },
        { name: 'Factory in Turkey', kind: 'Global', cost: 21.5, lead: 18, defect: 1.0, route: 'Sea via Suez', redSea: true, risk: { political: 2, tariff: 2, route: 4, environment: 2 } }
      ]
    }
  };

  // ------------------------------------------------------------- maths --
  function erf(x) { // Abramowitz and Stegun 7.1.26
    var s = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function Phi(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
  function phi(z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); }
  function invPhi(p) { var lo = -6, hi = 6; for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
  function sd(a) { var m = a.reduce(function (s, x) { return s + x; }, 0) / a.length; return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / a.length); }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  var MODEL = {
    // 1. Multi-tier flow ----------------------------------------------
    customerDemand: function (base, weeks, seed) {
      var r = rng(seed || 7), out = [];
      for (var t = 0; t < weeks; t++) {
        var lvl = t >= 6 && t < 12 ? 1.35 : 1; // a festival / Ramadan peak in weeks 7–12
        out.push(Math.round(base * lvl * (1 + (r() - 0.5) * 0.16)));
      }
      return out;
    },
    // stages: 0 = Retail/Distribution (learner), 1 = Internal Production, 2 = Supplier
    bullwhipStart: function (o) {
      var L = o.lead || 2, base = o.base;
      var st = { week: 0, weeks: o.weeks || 20, lead: L, share: !!o.share, demand: o.demand, base: base,
        stages: [0, 1, 2].map(function () { return { stock: base * (L + 1), backlog: 0, pipe: [], orders: [], stockHist: [], fc: base, cost: 0 }; }),
        lostUnits: 0, holdCost: 1, lostCost: 3, backlogCost: 1.5 };
      st.stages.forEach(function (s) { for (var i = 0; i < L; i++) s.pipe.push(base); });
      return st;
    },
    // suggested retail order: forecast + close half the gap to the target stock position
    suggest: function (st) {
      var s = st.stages[0], last = st.week ? st.demand[st.week - 1] : st.base;
      var fc = 0.6 * last + 0.4 * s.fc, target = fc * (st.lead + 1) + fc * 0.5;
      var pos = s.stock - s.backlog + s.pipe.reduce(function (a, b) { return a + b; }, 0);
      return Math.max(0, Math.round(fc + (target - pos) / 2));
    },
    bullwhipStep: function (st, retailOrder) {
      var t = st.week, d = st.demand[t], S = st.stages, L = st.lead;
      // arrivals
      S.forEach(function (s) { s.stock += s.pipe.shift() || 0; });
      // retail sells to customers; unmet demand is lost revenue
      var sold = Math.min(S[0].stock, d); S[0].stock -= sold; var lost = d - sold; st.lostUnits += lost;
      S[0].fc = 0.6 * d + 0.4 * S[0].fc;
      var orders = [Math.max(0, Math.round(retailOrder))];
      // upstream stages: fill the order from stock (backlog if short), then reorder
      for (var i = 1; i <= 2; i++) {
        var inc = orders[i - 1] + S[i].backlog;
        var ship = Math.min(S[i].stock, inc); S[i].stock -= ship; S[i].backlog = inc - ship;
        S[i - 1].pipe.push(ship);
        var signal = st.share ? d : orders[i - 1];
        S[i].fc = 0.5 * signal + 0.5 * S[i].fc;
        var target = S[i].fc * (L + 1) + S[i].fc * 0.5;
        var pos = S[i].stock - S[i].backlog + S[i].pipe.reduce(function (a, b) { return a + b; }, 0);
        orders.push(Math.max(0, Math.round(S[i].fc + (target - pos))));
      }
      S[2].pipe.push(orders[2]); // the supplier's own production always arrives after the lead time
      S.forEach(function (s, i) {
        s.orders.push(orders[i]); s.stockHist.push(s.stock);
        s.cost += s.stock * st.holdCost + (i ? s.backlog * st.backlogCost : 0);
      });
      S[0].cost += lost * st.lostCost;
      st.week++;
      return st;
    },
    bullwhipResult: function (st) {
      var sdD = sd(st.demand.slice(0, st.week)) || 1;
      var amp = st.stages.map(function (s) { return sd(s.orders) / sdD; });
      var total = st.stages.reduce(function (a, s) { return a + s.cost; }, 0);
      var served = 1 - st.lostUnits / st.demand.slice(0, st.week).reduce(function (a, b) { return a + b; }, 0);
      return { amp: amp, total: Math.round(total), retailCost: Math.round(st.stages[0].cost), service: served };
    },
    runBullwhip: function (o) { // whole run with suggested orders (used by tests and "auto-finish")
      var st = MODEL.bullwhipStart(o);
      while (st.week < st.weeks) MODEL.bullwhipStep(st, o.policy ? o.policy(st) : MODEL.suggest(st));
      return { st: st, res: MODEL.bullwhipResult(st) };
    },

    // 2. Supplier risk matrix -------------------------------------------
    supplierScores: function (sup, w) {
      var minCost = Math.min.apply(null, sup.map(function (s) { return s.cost; }));
      var minLead = Math.min.apply(null, sup.map(function (s) { return s.lead; }));
      var tw = w.cost + w.lead + w.quality + w.risk || 1;
      return sup.map(function (s) {
        var riskAvg = PESTEL.reduce(function (a, p) { return a + s.risk[p[0]]; }, 0) / PESTEL.length;
        var sc = { cost: 5 * minCost / s.cost, lead: 5 * minLead / s.lead, quality: Math.max(1, 5 - s.defect), risk: 6 - riskAvg };
        sc.total = (sc.cost * w.cost + sc.lead * w.lead + sc.quality * w.quality + sc.risk * w.risk) / tw;
        sc.riskAvg = riskAvg;
        return sc;
      });
    },
    portfolio: function (sup, alloc, redSea) {
      var tot = alloc.reduce(function (a, b) { return a + b; }, 0) || 1;
      var p = { cost: 0, lead: 0, defect: 0, risk: 0, maxShare: 0 };
      sup.forEach(function (s, i) {
        var share = alloc[i] / tot, lead = s.lead + (redSea && s.redSea ? 14 : 0), cost = s.cost * (redSea && s.redSea ? 1.08 : 1);
        var riskAvg = PESTEL.reduce(function (a, k) { return a + s.risk[k[0]]; }, 0) / PESTEL.length;
        p.cost += share * cost; p.lead += share * lead; p.defect += share * s.defect; p.risk += share * riskAvg;
        p.maxShare = Math.max(p.maxShare, share);
      });
      return p;
    },

    // 3. Working capital balancer ------------------------------------------
    balance: function (c, serviceLevel, q, leadWeeks) {
      var D = c.weeklyDemand * 52, H = c.unitCost * c.holdingPct / 100, L = leadWeeks;
      var z = invPhi(serviceLevel), sdL = c.weeklySd * Math.sqrt(L);
      var ss = z * sdL, rop = c.weeklyDemand * L + ss;
      var avgInv = q / 2 + ss, cash = avgInv * c.unitCost;
      var holding = avgInv * H, ordering = D / q * c.orderCost;
      var short = (D / q) * sdL * (phi(z) - z * (1 - Phi(z))); // expected units short per year
      var lostProfit = short * (c.price - c.unitCost);
      var eoq = Math.sqrt(2 * D * c.orderCost / H);
      return { z: z, ss: ss, rop: rop, avgInv: avgInv, cash: cash, holding: holding, ordering: ordering, short: short,
        stockoutCycles: (D / q) * (1 - serviceLevel), lostProfit: lostProfit, total: holding + ordering + lostProfit,
        days: avgInv / (D / 365), eoq: eoq, orders: D / q };
    },

    // 4. Disruption shock test -----------------------------------------------
    EVENTS: {
      canal: { title: 'The main shipping canal is blocked', text: 'A large ship is stuck across the canal. Ships on your route are waiting. Your next sea deliveries will be late.', cover: [1, 0.55, 0.35, 0.35, 0.6, 0.9] },
      shortage: { title: 'Raw-material shortage at your main supplier', text: 'Your main supplier can only make about half of your order for the next weeks.', cover: [1, 0.6, 0.5, 0.5, 0.7, 0.9] },
      fuel: { title: 'Sudden fuel-price rise', text: 'Fuel prices jump 40%. Every delivery costs more, and carriers add surcharges.', cover: [1, 1, 1, 1, 1, 1], costPerWeek: 9000 },
      strike: { title: 'Strike at the destination port', text: 'Dock workers stop work. Containers cannot be unloaded for about two weeks.', cover: [1, 0.4, 0.3, 0.7, 1, 1] }
    },
    ACTIONS: {
      wait: { label: 'Wait and watch', cost: 0, add: 0, note: 'No cost now, but customers wait too.' },
      safety: { label: 'Use safety stock', cost: 0, add: 0.2, once: true, note: 'Free, but you can only do it once.' },
      backup: { label: 'Order from the backup supplier', cost: 14000, add: 0.3, note: 'Higher unit price, arrives in a week.' },
      air: { label: 'Air-freight the most urgent items', cost: 26000, add: 0.45, note: 'Fast, but very expensive.' },
      reroute: { label: 'Reroute shipments (other port or route)', cost: 11000, add: 0.25, note: 'Longer route, extra freight cost.' },
      price: { label: 'Raise prices by 5% for a short time', cost: 0, price: 0.05, demand: -0.08, note: 'Protects margin, but some customers buy less.' },
      negotiate: { label: 'Negotiate with carriers and suppliers', cost: 2000, saveFuel: 0.5, add: 0.05, note: 'Shares the extra cost with partners.' }
    },
    shockRun: function (eventId, choices, opts) {
      var ev = MODEL.EVENTS[eventId], o = opts || {};
      var weeks = ev.cover.length, revenue = o.revenue || 100000, margin = o.margin || 0.2, budget = o.budget || 40000;
      var extra = [0, 0, 0, 0, 0, 0], price = 0, demand = 0, spent = 0, fuelSave = 0, usedSafety = false;
      choices.forEach(function (id, round) {
        var a = MODEL.ACTIONS[id] || MODEL.ACTIONS.wait;
        if (a.once && usedSafety) a = MODEL.ACTIONS.wait;
        if (a.once) usedSafety = true;
        if (spent + a.cost > budget) a = MODEL.ACTIONS.wait;
        spent += a.cost;
        var from = round + 1; // decisions are made in weeks 2, 3, 4 and help from that week on
        for (var w = from; w < weeks; w++) extra[w] += (a.add || 0) * (w === from ? 1 : 0.6);
        price += a.price || 0; demand += a.demand || 0; fuelSave += a.saveFuel || 0;
      });
      var profit = 0, lostSales = 0, normal = revenue * margin * weeks, served = 0;
      for (var w = 0; w < weeks; w++) {
        var cover = Math.min(1, ev.cover[w] + extra[w]);
        var sales = revenue * (1 + demand) * (1 + price) * cover;
        lostSales += revenue * (1 + demand) * (1 - cover);
        served += cover;
        var cost = revenue * (1 + demand) * cover * (1 - margin) + (ev.costPerWeek || 0) * (w ? 1 - Math.min(1, fuelSave) : 0);
        profit += sales - cost;
      }
      profit -= spent;
      var service = served / weeks, marginPct = profit / (revenue * weeks);
      var score = Math.max(0, Math.min(100, Math.round(service * 60 + Math.max(0, marginPct / margin) * 40)));
      return { profit: Math.round(profit), normal: Math.round(normal), spent: spent, budget: budget, service: service, lostSales: Math.round(lostSales), marginPct: marginPct, score: score };
    }
  };

  // -------------------------------------------------------------- page ---
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n, d) { return isFinite(n) ? Number(n).toLocaleString('en-GB', { maximumFractionDigits: d == null ? 0 : d }) : '–'; }
  function $(s, el) { return el.querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call(el.querySelectorAll(s)); }
  function lineChart(series, opts) {
    var W = 640, H = opts.h || 230, p = 34, all = [];
    series.forEach(function (s) { all = all.concat(s.data.filter(function (x) { return x != null; })); });
    var mn = Math.min(0, Math.min.apply(null, all)), mx = Math.max.apply(null, all) || 1, n = opts.n || series[0].data.length;
    function X(i) { return p + i * (W - 2 * p) / Math.max(1, n - 1); }
    function Y(v) { return H - p - (v - mn) / (mx - mn) * (H - 2 * p); }
    var grid = '';
    for (var g = 0; g <= 4; g++) { var v = mn + (mx - mn) * g / 4; grid += '<line x1="' + p + '" x2="' + (W - p) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#EEF1F6"/><text x="4" y="' + (Y(v) + 4) + '" font-size="11" fill="#7a849c">' + f(v) + '</text>'; }
    return '<figure class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Chart') + '">' + grid +
      series.map(function (s) {
        var pts = s.data.map(function (v, i) { return v == null ? null : X(i) + ',' + Y(v); }).filter(Boolean).join(' ');
        return '<polyline fill="none" stroke="' + s.color + '" stroke-width="' + (s.width || 3) + '" ' + (s.dash ? 'stroke-dasharray="6 5" ' : '') + 'stroke-linejoin="round" points="' + pts + '"/>';
      }).join('') + '</svg><figcaption>' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</figcaption></figure>';
  }
  function resRow(label, val, main) { return '<div class="res-row' + (main ? ' main' : '') + '"><span>' + label + '</span><b>' + val + '</b></div>'; }

  // 1. Multi-tier flow page ----------------------------------------------
  function bullwhipPage(el, ctx) {
    var c = ctx.company, st, share = false;
    function start() {
      st = MODEL.bullwhipStart({ base: c.weeklyDemand, weeks: 20, lead: 2, share: share, demand: MODEL.customerDemand(c.weeklyDemand, 20, 11) });
      draw();
    }
    function draw() {
      var done = st.week >= st.weeks, s0 = st.stages[0];
      var onOrder = s0.pipe.reduce(function (a, b) { return a + b; }, 0);
      var head = '<div class="card pad sim-ctl"><div class="sim-top"><div><div class="eyebrow muted">Week ' + Math.min(st.week + 1, st.weeks) + ' of ' + st.weeks + '</div>' +
        '<h3 class="h3" style="margin:4px 0 0">' + esc(c.product) + '</h3></div>' +
        '<label class="check"><input type="checkbox" id="bwShare"' + (share ? ' checked' : '') + '> Share real customer sales with Production and Supplier</label></div>' +
        '<div class="sim-flow">' + ['Supplier', 'Internal Production', 'Retail / Distribution (you)'].map(function (n, i) {
          var s = st.stages[2 - i];
          return '<div class="sim-node st-' + ['Source', 'Make', 'Deliver'][i] + '"><b>' + n + '</b><span>Stock ' + f(s.stock) + '</span>' + (i < 2 ? '<span>Backlog ' + f(s.backlog) + '</span>' : '') + '</div>' + (i < 2 ? '<span class="sim-arrow">→</span>' : '');
        }).join('') + '<span class="sim-arrow">→</span><div class="sim-node st-Plan"><b>Customers</b><span>Last week ' + (st.week ? f(st.demand[st.week - 1]) : '–') + '</span></div></div>';
      var play = done ? '<div class="note ok" style="margin-top:12px">20 weeks finished. See your results below.</div>' :
        '<div class="sim-play"><label class="field" style="margin:0"><span>Your order to Production this week</span><input class="input" id="bwOrder" inputmode="numeric" value="' + MODEL.suggest(st) + '"></label>' +
        '<div class="small muted">Your stock: <b>' + f(s0.stock) + '</b> · on the way: <b>' + f(onOrder) + '</b> · lead time 2 weeks · suggested order is already filled in</div>' +
        '<div class="btns"><button class="btn" id="bwNext">Place order · next week</button><button class="btn ghost" id="bwAuto">Finish with suggested orders</button><button class="btn ghost" id="bwReset">Restart</button></div></div>';
      var res = '';
      if (st.week > 0) {
        var r = MODEL.bullwhipResult(st), wk = st.week;
        res = '<div class="grid g2 sec"><div class="card pad">' + lineChart([
          { name: 'Customer demand', color: '#14213D', data: st.demand.slice(0, wk) },
          { name: 'Your orders', color: '#1F7BFF', data: st.stages[0].orders },
          { name: 'Production orders', color: '#8338EC', data: st.stages[1].orders },
          { name: 'Supplier production', color: '#FF5A36', data: st.stages[2].orders }], { n: st.weeks, label: 'Orders at each stage' }) + '</div>' +
          '<div class="card pad"><h3 class="h3">Results so far</h3><div class="results">' +
          resRow('Swing in your orders', '× ' + f(r.amp[0], 1)) + resRow('Swing at Production', '× ' + f(r.amp[1], 1)) + resRow('Swing at Supplier', '× ' + f(r.amp[2], 1), true) +
          resRow('Customers served', f(r.service * 100, 1) + '%') + resRow('Total chain cost', 'QAR ' + f(r.total)) + '</div>' +
          '<p class="small muted" style="margin-top:10px">“Swing” compares how much orders move up and down with how much customer demand moves. × 1 means no bullwhip. Holding stock costs QAR 1 per unit per week; a lost sale costs QAR 3.</p>' +
          (done ? '<div class="callout"><b>What happened?</b>' + (share ? 'With real sales data shared, upstream stages reacted to true demand, so the swings stayed smaller. ' : 'Each stage reacted to the orders it saw, not to real customers, so the swings grew upstream. Tick “Share real customer sales” and play again to compare. ') + '</div>' +
            '<button class="btn" id="bwSave">Save result to My Supply Chain</button>' : '') + '</div></div>';
      }
      el.innerHTML = head + play + '</div>' + res;
      $('#bwShare', el).onchange = function () { share = this.checked; start(); };
      if (!done) {
        $('#bwNext', el).onclick = function () { var v = Number($('#bwOrder', el).value); if (!(v >= 0)) { ctx.toast('Type an order of 0 or more.'); return; } MODEL.bullwhipStep(st, v); draw(); };
        $('#bwAuto', el).onclick = function () { while (st.week < st.weeks) MODEL.bullwhipStep(st, MODEL.suggest(st)); draw(); };
        $('#bwReset', el).onclick = start;
      } else {
        $('#bwSave', el).onclick = function () { var r = MODEL.bullwhipResult(st); ctx.saveSim('bullwhip', { supplierSwing: +r.amp[2].toFixed(2), service: +(r.service * 100).toFixed(1), cost: r.total, shared: share }); };
      }
    }
    start();
  }

  // 2. Supplier risk matrix page ------------------------------------------
  function supplierPage(el, ctx) {
    var sup = JSON.parse(JSON.stringify(ctx.company.suppliers)), w = { cost: 35, lead: 20, quality: 25, risk: 20 }, alloc = [50, 30, 20], redSea = false;
    function draw() {
      var sc = MODEL.supplierScores(sup, w), pf = MODEL.portfolio(sup, alloc, redSea), base = MODEL.portfolio(sup, alloc, false);
      var tot = alloc.reduce(function (a, b) { return a + b; }, 0);
      el.innerHTML = '<div class="card pad"><h3 class="h3">Your suppliers</h3><p class="small muted">Example figures. Change any number. Risk factors: 1 = low risk, 5 = high risk.</p><div class="tbl"><table class="edit"><thead><tr><th>Supplier</th>' +
        sup.map(function (s, i) { return '<th>' + esc(s.name) + '<small class="muted" style="display:block;font-weight:400">' + esc(s.kind) + ' · ' + esc(s.route) + '</small></th>'; }).join('') + '</tr></thead><tbody>' +
        [['cost', 'Cost per unit (QAR)'], ['lead', 'Lead time (days)'], ['defect', 'Defect rate (%)']].map(function (r) {
          return '<tr><th scope="row">' + r[1] + '</th>' + sup.map(function (s, i) { return '<td><input class="input sm num" data-s="' + i + ':' + r[0] + '" value="' + s[r[0]] + '" inputmode="decimal"></td>'; }).join('') + '</tr>';
        }).join('') +
        PESTEL.map(function (p) {
          return '<tr><th scope="row">' + p[1] + '</th>' + sup.map(function (s, i) { return '<td><input class="input sm num" data-r="' + i + ':' + p[0] + '" value="' + s.risk[p[0]] + '" inputmode="numeric"></td>'; }).join('') + '</tr>';
        }).join('') +
        '<tr><th scope="row">Weighted score (out of 5)</th>' + sc.map(function (x) { return '<td><b>' + f(x.total, 2) + '</b></td>'; }).join('') + '</tr>' +
        '<tr><th scope="row">Your share of orders (%)</th>' + alloc.map(function (a, i) { return '<td><input class="input sm num" data-a="' + i + '" value="' + a + '" inputmode="numeric"></td>'; }).join('') + '</tr>' +
        '</tbody></table></div></div>' +
        '<div class="grid g2 sec"><div class="card pad"><h3 class="h3">What matters most? (weights %)</h3><div class="w-grid">' +
        [['cost', 'Cost'], ['lead', 'Lead time'], ['quality', 'Quality'], ['risk', 'Low risk']].map(function (k) { return '<label class="field"><span>' + k[1] + '</span><input class="input sm" data-w="' + k[0] + '" value="' + w[k[0]] + '" inputmode="numeric"></label>'; }).join('') + '</div>' +
        '<label class="check"><input type="checkbox" id="rs"' + (redSea ? ' checked' : '') + '> What if the Red Sea route closes? (+14 days and +8% cost on that route)</label></div>' +
        '<div class="card pad"><h3 class="h3">Your portfolio</h3><div class="results">' +
        resRow('Average cost per unit', 'QAR ' + f(pf.cost, 2) + (redSea ? ' <small>(was ' + f(base.cost, 2) + ')</small>' : '')) +
        resRow('Average lead time', f(pf.lead, 1) + ' days' + (redSea ? ' <small>(was ' + f(base.lead, 1) + ')</small>' : '')) +
        resRow('Average defect rate', f(pf.defect, 2) + '%') + resRow('Average risk (1–5)', f(pf.risk, 2), true) + '</div>' +
        (tot !== 100 ? '<p class="note err">Your shares add up to ' + tot + '%. Make them 100%.</p>' : '') +
        (pf.maxShare >= 0.8 ? '<p class="note err">One supplier has ' + Math.round(pf.maxShare * 100) + '% of your orders: a single point of failure.</p>' : '') +
        '<div class="callout"><b>Think about it</b>The cheapest supplier is not always the best. A mix of a low-cost overseas supplier and a reliable local one often gives the best balance of cost, speed and risk.</div>' +
        '<button class="btn" id="spSave"' + (tot !== 100 ? ' disabled' : '') + '>Save portfolio to My Supply Chain</button></div></div>' +
        '<div class="card pad sec">' + scatter(sup, sc) + '</div>';
      $$('[data-s]', el).forEach(function (i) { i.onchange = function () { var p = i.getAttribute('data-s').split(':'); var v = Number(i.value); if (v >= 0) sup[+p[0]][p[1]] = v; draw(); }; });
      $$('[data-r]', el).forEach(function (i) { i.onchange = function () { var p = i.getAttribute('data-r').split(':'); var v = Math.round(Number(i.value)); if (v >= 1 && v <= 5) sup[+p[0]].risk[p[1]] = v; draw(); }; });
      $$('[data-a]', el).forEach(function (i) { i.onchange = function () { var v = Number(i.value); if (v >= 0) alloc[+i.getAttribute('data-a')] = v; draw(); }; });
      $$('[data-w]', el).forEach(function (i) { i.onchange = function () { var v = Number(i.value); if (v >= 0) w[i.getAttribute('data-w')] = v; draw(); }; });
      $('#rs', el).onchange = function () { redSea = this.checked; draw(); };
      $('#spSave', el).onclick = function () {
        var best = sc.map(function (x, i) { return [x.total, i]; }).sort(function (a, b) { return b[0] - a[0]; })[0][1];
        ctx.saveSim('supplier', { bestSupplier: sup[best].name, bestScore: +sc[best].total.toFixed(2), mix: sup.map(function (s, i) { return s.name + ' ' + alloc[i] + '%'; }).join(', '), avgCost: +pf.cost.toFixed(2), avgLead: +pf.lead.toFixed(1), avgRisk: +pf.risk.toFixed(2) });
      };
    }
    function scatter(sup, sc) {
      var W = 640, H = 260, p = 44, maxC = Math.max.apply(null, sup.map(function (s) { return s.cost; })) * 1.1;
      function X(r) { return p + (r - 1) / 4 * (W - 2 * p); }
      function Y(c) { return H - p - c / maxC * (H - 2 * p); }
      var cols = ['#00B4B4', '#FF5A36', '#8338EC', '#1F7BFF'];
      return '<h3 class="h3">Cost vs risk</h3><figure class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Suppliers by cost and risk">' +
        '<line x1="' + p + '" y1="' + (H - p) + '" x2="' + (W - p) + '" y2="' + (H - p) + '" stroke="#DFE4EE"/><line x1="' + p + '" y1="' + p / 2 + '" x2="' + p + '" y2="' + (H - p) + '" stroke="#DFE4EE"/>' +
        '<text x="' + (W / 2) + '" y="' + (H - 8) + '" font-size="12" fill="#4a5675" text-anchor="middle">Risk (1 low → 5 high)</text><text x="12" y="' + (H / 2) + '" font-size="12" fill="#4a5675" transform="rotate(-90 12 ' + (H / 2) + ')" text-anchor="middle">Cost per unit</text>' +
        sup.map(function (s, i) { return '<circle cx="' + X(sc[i].riskAvg) + '" cy="' + Y(s.cost) + '" r="12" fill="' + cols[i % 4] + '"/><text x="' + (X(sc[i].riskAvg) + 16) + '" y="' + (Y(s.cost) + 4) + '" font-size="12" fill="#14213D">' + esc(s.name) + '</text>'; }).join('') +
        '</svg><figcaption><span>Bottom-left is best: low cost and low risk.</span></figcaption></figure>';
    }
    draw();
  }

  // 3. Working capital balancer page ----------------------------------------
  function balancerPage(el, ctx) {
    var c = ctx.company, lead = ctx.leadWeeks || 2, base = MODEL.balance(c, 0.95, 100, lead), q = Math.round(base.eoq), sl = 0.95;
    function draw() {
      var r = MODEL.balance(c, sl, q, lead);
      var curve = [], qs = [];
      for (var k = 0.3; k <= 3.01; k += 0.15) { var qq = Math.round(r.eoq * k); qs.push(qq); curve.push(MODEL.balance(c, sl, qq, lead).total); }
      el.innerHTML = '<div class="tool-grid"><div class="card pad tool-in"><h3 class="h3">' + esc(c.product) + '</h3>' +
        '<p class="small muted">' + f(c.weeklyDemand) + ' a week · QAR ' + f(c.unitCost) + ' each · lead time ' + lead + ' weeks · order cost QAR ' + f(c.orderCost) + ' · holding ' + c.holdingPct + '% a year</p>' +
        '<label class="field"><span>Service level (safety stock): <b>' + f(sl * 100, 1) + '%</b></span><input type="range" id="sl" min="80" max="99.5" step="0.5" value="' + sl * 100 + '"></label>' +
        '<label class="field"><span>Batch size (order quantity): <b>' + f(q) + ' units</b></span><input type="range" id="q" min="' + Math.round(r.eoq * 0.3) + '" max="' + Math.round(r.eoq * 3) + '" step="1" value="' + q + '"></label>' +
        '<label class="field"><span>Supplier lead time: <b>' + lead + ' weeks</b></span><input type="range" id="lt" min="1" max="8" step="1" value="' + lead + '"></label>' +
        '<div class="btns"><button class="btn ghost" id="toEoq">Set batch to EOQ (' + f(r.eoq) + ')</button></div></div>' +
        '<div class="card pad tool-out"><div class="results">' +
        resRow('Safety stock', f(r.ss) + ' units') + resRow('Reorder point', f(r.rop) + ' units') +
        resRow('Cash tied up in stock (average)', 'QAR ' + f(r.cash), true) + resRow('Days of stock', f(r.days, 1) + ' days') +
        resRow('Stockout risk', f(r.stockoutCycles, 1) + ' of ' + f(r.orders, 1) + ' order cycles a year') +
        resRow('Yearly cost: holding + ordering + lost sales', 'QAR ' + f(r.holding) + ' + ' + f(r.ordering) + ' + ' + f(r.lostProfit) + ' = <b>' + f(r.total) + '</b>') + '</div>' +
        lineChart([{ name: 'Total yearly cost at this service level, by batch size', color: '#8338EC', data: curve }], { label: 'Total cost by batch size', h: 200 }) +
        '<p class="small muted">Left of the chart: small batches (low stock, many orders). Right: big batches (more cash tied up). The lowest point is near the EOQ.</p>' +
        '<div class="callout"><b>The trade-off</b>More safety stock and bigger batches tie up more cash. Less stock means more stockouts and stopped sales. Find the balance your business can afford.</div>' +
        '<button class="btn" id="wcSave">Save to My Supply Chain</button></div></div>';
      $('#sl', el).oninput = function () { sl = Number(this.value) / 100; draw(); };
      $('#q', el).oninput = function () { q = Number(this.value); draw(); };
      $('#lt', el).oninput = function () { lead = Number(this.value); draw(); };
      $('#toEoq', el).onclick = function () { q = Math.round(r.eoq); draw(); };
      $('#wcSave', el).onclick = function () { ctx.saveSim('balancer', { serviceLevel: +(sl * 100).toFixed(1), batch: q, safetyStock: Math.round(r.ss), reorderPoint: Math.round(r.rop), cash: Math.round(r.cash), totalCost: Math.round(r.total), days: +r.days.toFixed(1) }); };
    }
    draw();
  }

  // 4. Shock test page ---------------------------------------------------------
  function shockPage(el, ctx) {
    var ids = Object.keys(MODEL.EVENTS), ev, choices, round, timer, left, budget = 40000;
    function start() { ev = ids[Math.floor(Math.random() * ids.length)]; choices = []; round = -1; clearInterval(timer); intro(); }
    function intro() {
      el.innerHTML = '<div class="card pad shock"><div class="eyebrow muted">Shock test</div><h3 class="h3">Weeks 1–2: business as usual</h3>' +
        '<p>Sales are about <b>QAR 100,000 a week</b> with a <b>20% margin</b>. You have an emergency budget of <b>QAR ' + f(budget) + '</b>.</p>' +
        '<p>Somewhere in the next weeks, something will go wrong. You will have <b>three decisions</b> and <b>45 seconds</b> for each one. If time runs out, you “wait”.</p>' +
        '<button class="btn" id="go">Start the run</button></div>';
      $('#go', el).onclick = next;
    }
    function next() {
      round++;
      if (round >= 3) return finish();
      left = 45; clearInterval(timer);
      timer = setInterval(function () { left--; var t = $('#tleft', el); if (t) t.textContent = left + 's'; if (left <= 0) { pick('wait'); } }, 1000);
      var e = MODEL.EVENTS[ev], spent = choices.reduce(function (a, id) { return a + (MODEL.ACTIONS[id].cost || 0); }, 0);
      var usedSafety = choices.indexOf('safety') !== -1;
      el.innerHTML = '<div class="card pad shock"><div class="shock-h"><div><div class="eyebrow muted">Week ' + (round + 2) + ' · decision ' + (round + 1) + ' of 3</div><h3 class="h3" style="margin:4px 0">' + esc(e.title) + '</h3></div><span class="timer" id="tleft">45s</span></div>' +
        '<p>' + esc(e.text) + '</p><p class="small muted">Budget left: <b>QAR ' + f(budget - spent) + '</b></p><div class="shock-acts">' +
        Object.keys(MODEL.ACTIONS).map(function (id) {
          var a = MODEL.ACTIONS[id], dis = (a.once && usedSafety) || spent + a.cost > budget;
          return '<button class="shock-act" data-act="' + id + '"' + (dis ? ' disabled' : '') + '><b>' + esc(a.label) + '</b><small>' + (a.cost ? 'QAR ' + f(a.cost) + ' · ' : 'No cost · ') + esc(a.note) + '</small></button>';
        }).join('') + '</div></div>';
      $$('[data-act]', el).forEach(function (b) { b.onclick = function () { pick(b.getAttribute('data-act')); }; });
    }
    function pick(id) { clearInterval(timer); choices.push(id); next(); }
    function finish() {
      var r = MODEL.shockRun(ev, choices, { budget: budget }), e = MODEL.EVENTS[ev];
      el.innerHTML = '<div class="grid g2"><div class="card pad"><div class="eyebrow muted">Result</div><h3 class="h3">' + esc(e.title) + '</h3><div class="results">' +
        resRow('Your decisions', choices.map(function (id) { return esc(MODEL.ACTIONS[id].label); }).join(' → ')) +
        resRow('Customers served', f(r.service * 100, 0) + '%') + resRow('Profit over 6 weeks', 'QAR ' + f(r.profit) + ' <small>(normal ' + f(r.normal) + ')</small>') +
        resRow('Emergency budget used', 'QAR ' + f(r.spent) + ' of ' + f(r.budget)) + resRow('Resilience score', r.score + ' / 100', true) + '</div></div>' +
        '<div class="card pad"><h3 class="h3">Review</h3><ul class="goals"><li>Which decision helped most, and why?</li><li>What could you have prepared <b>before</b> the event (backup supplier, safety stock, trigger)?</li><li>Would a different event need a different plan?</li></ul>' +
        '<div class="btns"><button class="btn" id="shSave">Save to My Supply Chain</button><button class="btn ghost" id="again">Try another event</button></div></div></div>';
      $('#again', el).onclick = start;
      $('#shSave', el).onclick = function () { ctx.saveSim('shock', { event: e.title, decisions: choices.map(function (id) { return MODEL.ACTIONS[id].label; }).join(' → '), service: Math.round(r.service * 100), profit: r.profit, score: r.score }); };
    }
    start();
    return function stop() { clearInterval(timer); };
  }

  var SIMS = [
    { id: 'bullwhip', name: 'Multi-Tier Flow Simulator', short: 'Bullwhip Challenge', stage: 'Plan', session: 2, page: bullwhipPage,
      intro: 'Run the pipeline from Supplier to Internal Production to Retail for 20 weeks. Watch small changes in customer demand grow into big swings upstream.' },
    { id: 'supplier', name: 'Supplier Selection Risk Matrix', short: 'Supplier risk', stage: 'Source', session: 3, page: supplierPage,
      intro: 'Compare local and global suppliers on cost, lead time, quality and PESTEL risks, then build a balanced supplier portfolio.' },
    { id: 'balancer', name: 'Inventory & Working Capital Balancer', short: 'Working capital', stage: 'Make', session: 5, page: balancerPage,
      intro: 'Move the sliders for safety stock, batch size and lead time. See cash tied up in stock against the risk of stockouts.' },
    { id: 'shock', name: 'Supply Chain Disruption Shock Test', short: 'Shock test', stage: 'Return', session: 10, page: shockPage,
      intro: 'A random crisis hits mid-run. With a limited budget and 45 seconds per decision, protect your customers and your margin.' }
  ];

  root.LSCM_SIMS = { COMPANIES: COMPANIES, MODEL: MODEL, SIMS: SIMS, PESTEL: PESTEL, lineChart: lineChart };
  if (typeof module !== 'undefined') module.exports = root.LSCM_SIMS;
})(typeof window !== 'undefined' ? window : globalThis);
