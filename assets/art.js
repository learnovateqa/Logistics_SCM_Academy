/* Flat supply-chain illustrations (inline SVG). Colours: navy base, stage colours for objects only. */
(function (root) {
  'use strict';
  var C = { navy: '#14213D', navy2: '#1d2f57', plan: '#00B4B4', source: '#FF5A36', make: '#8338EC', deliver: '#1F7BFF', ret: '#00B86B', gold: '#FFC300', white: '#ffffff', line: '#DFE4EE' };
  var STAGE = { Plan: C.plan, Source: C.source, Make: C.make, Deliver: C.deliver, Return: C.ret };

  // small logo for the navy top bar (no background tile)
  var logo = '<svg viewBox="4 5 56 54" width="30" height="30" aria-hidden="true"><rect x="11" y="9" width="27" height="23" rx="2.5" fill="#C98B4E"/> <rect x="11" y="9" width="27" height="6" rx="2.5" fill="#B4763C"/> <rect x="22" y="9" width="5" height="23" fill="#E9C48E"/> <rect x="14" y="25" width="6" height="3" rx="1" fill="#8E5A2B"/> <rect x="7" y="32" width="36" height="7" rx="2" fill="#ffffff"/> <path d="M43 22 h7.5 a3 3 0 0 1 2.4 1.2 l4.6 6.2 a3 3 0 0 1 .5 1.7 V39 H43 Z" fill="#ffffff"/> <path d="M46 25 h4.4 l3.6 5 H46 Z" fill="#14213D"/> <circle cx="16" cy="41" r="4.6" fill="#14213D" stroke="#ffffff" stroke-width="2.4"/> <circle cx="49" cy="41" r="4.6" fill="#14213D" stroke="#ffffff" stroke-width="2.4"/> <g stroke-width="5" stroke-linecap="round"> <line x1="8" y1="54" x2="17" y2="54" stroke="#00B4B4"/> <line x1="17" y1="54" x2="26" y2="54" stroke="#FF5A36"/> <line x1="26" y1="54" x2="35" y2="54" stroke="#8338EC"/> <line x1="35" y1="54" x2="44" y2="54" stroke="#1F7BFF"/> <line x1="44" y1="54" x2="50" y2="54" stroke="#00B86B"/> </g> <circle cx="54" cy="54" r="4.4" fill="#FFC300" stroke="#14213D" stroke-width="1.6"/></svg>';

  function containers(x, y, cols, rows, w, h, palette) {
    var out = '';
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var col = palette[(r * cols + c + r) % palette.length];
      out += '<rect x="' + (x + c * (w + 2)) + '" y="' + (y - (r + 1) * (h + 2)) + '" width="' + w + '" height="' + h + '" rx="1.5" fill="' + col + '"/>' +
        '<g stroke="rgba(20,33,61,.25)" stroke-width="1"><line x1="' + (x + c * (w + 2) + w * .33) + '" y1="' + (y - (r + 1) * (h + 2) + 2) + '" x2="' + (x + c * (w + 2) + w * .33) + '" y2="' + (y - (r + 1) * (h + 2) + h - 2) + '"/>' +
        '<line x1="' + (x + c * (w + 2) + w * .66) + '" y1="' + (y - (r + 1) * (h + 2) + 2) + '" x2="' + (x + c * (w + 2) + w * .66) + '" y2="' + (y - (r + 1) * (h + 2) + h - 2) + '"/></g>';
    }
    return out;
  }

  // Port scene for the navy home hero: ship, crane, truck and the colour route
  function scene() {
    var pal = [C.plan, C.source, C.make, C.deliver, C.ret, C.gold];
    return '<svg class="scene" viewBox="0 0 420 240" role="img" aria-label="A container ship at a port, a crane and a truck on the coloured route">' +
      // sky dots
      '<g fill="rgba(255,255,255,.18)"><circle cx="40" cy="30" r="2"/><circle cx="120" cy="18" r="1.5"/><circle cx="300" cy="26" r="2"/><circle cx="380" cy="44" r="1.5"/></g>' +
      // quay
      '<rect x="250" y="168" width="170" height="10" fill="rgba(255,255,255,.14)"/>' +
      // crane
      '<g stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"><line x1="276" y1="168" x2="276" y2="62"/><line x1="312" y1="168" x2="312" y2="62"/>' +
      '<line x1="270" y1="62" x2="318" y2="62"/><line x1="276" y1="110" x2="312" y2="110"/><line x1="200" y1="56" x2="350" y2="56"/><line x1="276" y1="62" x2="312" y2="110" stroke-width="2.5"/></g>' +
      '<line x1="226" y1="58" x2="226" y2="104" stroke="#fff" stroke-width="2"/><rect x="214" y="104" width="24" height="12" rx="1.5" fill="' + C.gold + '"/>' +
      // ship
      containers(52, 150, 6, 3, 22, 12, pal) +
      '<path d="M30 150 L 206 150 L 192 182 L 46 182 Z" fill="' + C.white + '"/>' +
      '<path d="M30 150 L 206 150 L 203 158 L 33 158 Z" fill="' + C.source + '"/>' +
      '<rect x="182" y="120" width="18" height="30" rx="2" fill="#DCE3F0"/><rect x="186" y="126" width="10" height="5" rx="1" fill="' + C.navy + '"/>' +
      // water
      '<g stroke="rgba(255,255,255,.25)" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M10 196 q 15 -7 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0"/><path d="M40 212 q 15 -7 30 0 t 30 0 t 30 0 t 30 0 t 30 0"/></g>' +
      // truck on the road
      '<rect x="330" y="140" width="56" height="22" rx="2" fill="' + C.deliver + '"/><g stroke="rgba(20,33,61,.25)"><line x1="348" y1="143" x2="348" y2="159"/><line x1="366" y1="143" x2="366" y2="159"/></g>' +
      '<path d="M388 146 h12 l8 9 v7 h-20 z" fill="#fff"/><rect x="392" y="149" width="7" height="5" rx="1" fill="' + C.navy + '"/>' +
      '<circle cx="342" cy="164" r="5" fill="' + C.navy + '" stroke="#fff" stroke-width="2.5"/><circle cx="398" cy="164" r="5" fill="' + C.navy + '" stroke="#fff" stroke-width="2.5"/>' +
      // the route (5 colours) along the bottom
      '<g stroke-width="6" stroke-linecap="round"><line x1="20" y1="226" x2="96" y2="226" stroke="' + C.plan + '"/><line x1="96" y1="226" x2="172" y2="226" stroke="' + C.source + '"/>' +
      '<line x1="172" y1="226" x2="248" y2="226" stroke="' + C.make + '"/><line x1="248" y1="226" x2="324" y2="226" stroke="' + C.deliver + '"/><line x1="324" y1="226" x2="392" y2="226" stroke="' + C.ret + '"/></g>' +
      '<circle cx="398" cy="226" r="8" fill="' + C.gold + '" stroke="' + C.navy + '" stroke-width="3"/>' +
      '</svg>';
  }

  // One small picture per stage (used on stage cards and session headers)
  var STAGE_ART = {
    Plan: function (c) { // clipboard with a rising chart
      return '<rect x="34" y="12" width="52" height="66" rx="6" fill="#fff" stroke="' + C.navy + '" stroke-width="3"/><rect x="48" y="6" width="24" height="12" rx="4" fill="' + c + '"/>' +
        '<polyline points="42,62 54,50 64,56 78,36" fill="none" stroke="' + c + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="78" cy="36" r="4" fill="' + C.gold + '"/>' +
        '<line x1="42" y1="70" x2="78" y2="70" stroke="' + C.line + '" stroke-width="3" stroke-linecap="round"/>';
    },
    Source: function (c) { // small ship with containers
      return containers(30, 52, 4, 2, 14, 9, [c, C.navy, C.gold, c]) +
        '<path d="M18 52 L 102 52 L 94 70 L 26 70 Z" fill="' + C.navy + '"/><rect x="88" y="34" width="10" height="18" rx="2" fill="' + c + '"/>' +
        '<path d="M10 80 q 10 -5 20 0 t 20 0 t 20 0 t 20 0 t 20 0" stroke="' + c + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    },
    Make: function (c) { // factory with boxes
      return '<path d="M16 76 V 40 l 20 12 V 40 l 20 12 V 40 l 20 12 V 22 h 12 V 76 Z" fill="' + C.navy + '"/>' +
        '<rect x="24" y="58" width="10" height="10" rx="1.5" fill="' + c + '"/><rect x="44" y="58" width="10" height="10" rx="1.5" fill="' + c + '"/><rect x="64" y="58" width="10" height="10" rx="1.5" fill="' + C.gold + '"/>' +
        '<rect x="92" y="56" width="18" height="20" rx="2" fill="' + c + '"/><line x1="92" y1="64" x2="110" y2="64" stroke="#fff" stroke-width="2"/>';
    },
    Deliver: function (c) { // truck
      return '<rect x="14" y="30" width="60" height="34" rx="3" fill="' + c + '"/><g stroke="rgba(255,255,255,.55)" stroke-width="2"><line x1="34" y1="34" x2="34" y2="60"/><line x1="54" y1="34" x2="54" y2="60"/></g>' +
        '<path d="M76 40 h18 l12 14 v12 h-30 z" fill="' + C.navy + '"/><rect x="82" y="44" width="10" height="8" rx="1.5" fill="#fff"/>' +
        '<circle cx="30" cy="68" r="8" fill="' + C.navy + '" stroke="#fff" stroke-width="3"/><circle cx="92" cy="68" r="8" fill="' + C.navy + '" stroke="#fff" stroke-width="3"/>' +
        '<line x1="4" y1="82" x2="116" y2="82" stroke="' + C.line + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 8"/>';
    },
    Return: function (c) { // circular arrows with a leaf
      return '<path d="M60 14 a 32 32 0 1 1 -30 21" fill="none" stroke="' + c + '" stroke-width="7" stroke-linecap="round"/><path d="M22 22 l 9 15 l 15 -8" fill="none" stroke="' + c + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M60 66 c -16 -2 -20 -20 -4 -30 c 6 10 18 14 18 24 c -3 5 -8 7 -14 6 z" fill="' + C.gold + '" stroke="' + C.navy + '" stroke-width="2.5" stroke-linejoin="round"/><path d="M58 64 c 1 -8 2 -16 -2 -24" stroke="' + C.navy + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    }
  };
  function stage(k, cls) {
    var c = STAGE[k] || C.navy, f = STAGE_ART[k];
    return f ? '<svg class="' + (cls || 'stage-art') + '" viewBox="0 0 120 90" aria-hidden="true">' + f(c) + '</svg>' : '';
  }

  // Empty / waiting states: a truck waiting at a gate
  function empty() {
    return '<svg class="empty-art" viewBox="0 0 160 100" aria-hidden="true">' +
      '<line x1="10" y1="84" x2="150" y2="84" stroke="' + C.line + '" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="22" y="44" width="56" height="30" rx="3" fill="' + C.deliver + '"/><path d="M80 52 h16 l10 12 v10 h-26 z" fill="' + C.navy + '"/>' +
      '<circle cx="38" cy="78" r="7" fill="' + C.navy + '" stroke="#fff" stroke-width="3"/><circle cx="92" cy="78" r="7" fill="' + C.navy + '" stroke="#fff" stroke-width="3"/>' +
      '<rect x="120" y="30" width="6" height="50" rx="2" fill="' + C.navy + '"/><rect x="112" y="30" width="38" height="8" rx="3" fill="' + C.source + '"/><rect x="126" y="30" width="8" height="8" fill="#fff"/><rect x="142" y="30" width="8" height="8" fill="#fff"/>' +
      '<circle cx="123" cy="20" r="6" fill="' + C.gold + '"/></svg>';
  }

  root.LSCM_ART = { logo: logo, scene: scene, stage: stage, empty: empty, STAGE: STAGE };
})(typeof window !== 'undefined' ? window : globalThis);
