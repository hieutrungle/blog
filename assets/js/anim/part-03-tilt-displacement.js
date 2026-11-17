/* Part 3, "DPO from KL-regularized RL": where probability mass moves. All numbers are illustrative.

   Panel 1: the KL-regularized optimum pi* = pi_ref e^{R/beta} / Z with a 0/1 reward, for one problem
   with eight responses: A, B, C correct, D correct but with reference probability 0, E-H incorrect.
   As beta falls from infinity to 0.25 the success mass rises 0.300 -> 0.414 -> 0.538 -> 0.760 -> 0.959,
   the shape inside the correct set stays A : B : C = 0.50 : 0.33 : 0.17 (N_eff 2.75), and D stays at 0.
   Panel 2: likelihood displacement on one pair. Single-token responses with logits z_j = b_j + u_j . h,
   pi_ref = softmax(b) = (0.40, 0.30, 0.30) for "No" (preferred), "Never" (dispreferred) and "Yes";
   u_No = (1, 0.3), u_Never = (1, -0.3), u_Yes = (0, 1). DPO (beta = 1) trains only the shared hidden
   state h; its gradient is parallel to u_No - u_Never, so training moves h along that line. Both pair
   probabilities fall while Delta grows to log 4 and the loss falls from 0.693 to 0.223.
   checks/part03_checks.py in llm-post-training-notes recomputes every printed number. */
BlogAnim.register('part-03-tilt-displacement', {
  duration: 26,
  stops: [3.9, 6.3, 8.7, 13, 19, 26],
  NAMES: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  REF: [0.15, 0.10, 0.05, 0.0, 0.30, 0.20, 0.12, 0.08],
  R: [1, 1, 1, 1, 0, 0, 0, 0],
  // 1/beta over time: move, hold, move, hold ...
  IB: [[0, 0], [1.5, 0], [2.7, 0.5], [3.9, 0.5], [5.1, 1], [6.3, 1], [7.5, 2], [8.7, 2], [9.9, 4]],
  P2: 14,
  UK: [[15, 0], [17.4, 0.5], [19, 0.5], [21.4, 1]],
  REF3: [0.40, 0.30, 0.30],
  U2: [0.3, -0.3, 1.0],              // second coordinate of u_No, u_Never, u_Yes (h moves along (0, 1))
  TOK: ['No', 'Never', 'Yes'],

  height(W) { return W < 520 ? 760 : 620; },

  ibOf(t) { return AL.track(this.IB, t, true); },
  uOf(t) { return AL.track(this.UK, t, true); },
  tilt(ib) {
    const w = this.REF.map((r, j) => r * Math.exp(this.R[j] * ib)), Z = w.reduce((a, b) => a + b, 0);
    return w.map(v => v / Z);
  },
  neff(m) {
    const s = m.reduce((a, b) => a + b, 0), q = m.filter(x => x > 0).map(x => x / s);
    return Math.exp(-q.reduce((h, x) => h + x * Math.log(x), 0));
  },
  sEnd() { return Math.log(4) / 0.6; },
  toy(u) {
    const s = u * this.sEnd(), z = this.REF3.map((r, j) => Math.log(r) + this.U2[j] * s);
    const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), S = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / S);
  },
  betaStr(ib) { return ib < 1e-9 ? '\u221e' : String(+(1 / ib).toFixed(2)); },
  minus(x, nd) { return (x < 0 ? '\u2212' : '') + Math.abs(x).toFixed(nd); },

  label(t) {
    if (t < this.P2 - 0.5) { const ib = this.ibOf(t), h = this.IB.some(k => Math.abs(k[1] - ib) < 1e-9); return h ? '\u03b2 = ' + this.betaStr(ib) : 'lowering \u03b2'; }
    return 'DPO on one pair';
  },

  caption(t) {
    if (t < this.P2 - 0.5) {
      const ib = this.ibOf(t);
      if (t < 1.5) return 'At \u03b2 = \u221e the optimum is the reference itself: success mass 0.300.';
      if (ib < 3.999) return 'Lowering \u03b2 multiplies every correct response by the same factor, e to the power 1/\u03b2: correct mass grows, its shape does not.';
      return 'At \u03b2 = 0.25 the success mass is 0.959. A : B : C is still 0.50 : 0.33 : 0.17, and D, which the reference never produces, is still 0.';
    }
    const u = this.uOf(t);
    if (u < 1e-9) return 'Shared weights: \u201cNo\u201d and \u201cNever\u201d have similar output vectors, so pushing them apart mostly moves a direction that \u201cYes\u201d uses.';
    if (u < 0.999) return 'Each step raises \u0394, the gap between the two log-ratios. The loss only sees \u0394.';
    return '\u0394 = log 4 and the loss fell from 0.693 to 0.223, yet the preferred \u201cNo\u201d fell from 0.40 to 0.20. The mass went to \u201cYes\u201d.';
  },

  panelTitle(ctx, P, n, str, x, y, active) {
    AL.text(ctx, n, x, y, { P, size: 13, weight: 700, color: active ? P.accent : P.muted });
    AL.text(ctx, str, x + 20, y, { P, size: 13, weight: 600, color: active ? P.text : P.muted });
  },
  dashedRect(ctx, P, x, y, w, h) {
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = AL.alpha(P.text, 0.45); ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h); ctx.restore();
  },

  draw(t) {
    const ctx = this.ctx, P = this.P, W = this.W, H = this.H, small = W < 520, pad = small ? 12 : 18;
    AL.roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 10, { fill: P.surface, stroke: P.line });
    const ph = t < this.P2 - 0.5 ? 1 : 2, grey = AL.alpha(P.muted, 0.55);

    // ---------------- panel 1: the optimum tilts the reference ----------------
    let y = 28;
    this.panelTitle(ctx, P, '1', small ? 'The optimum tilts the reference' : 'The KL-regularized optimum tilts the reference', pad, y, ph === 1);
    AL.text(ctx, small ? 'one problem, 0/1 reward; dashed = \u03c0_ref' : 'one problem, eight responses, 0/1 reward; dashed outlines = reference \u03c0_ref',
      pad + 20, y + 18, { P, size: 12, color: P.muted });
    const ib = this.ibOf(t), held = this.IB.some(k => Math.abs(k[1] - ib) < 1e-9), p = this.tilt(ib);
    const ps = p[0] + p[1] + p[2] + p[3];
    let top1 = y + 40;
    if (small) {   // readouts in a row above the bars
      AL.text(ctx, '\u03b2 = ' + (held ? this.betaStr(ib) : '\u2193'), pad, top1 + 6, { P, size: 15, weight: 700, color: P.ink });
      AL.text(ctx, 'success mass ' + (held ? ps.toFixed(3) : '\u2026'), pad + 92, top1 + 6, { P, size: 13, weight: 600, color: P.accent });
      AL.text(ctx, 'N_eff ' + this.neff(p.slice(0, 4)).toFixed(2), W - pad, top1 + 6, { P, size: 13, align: 'right', color: P.text });
      top1 += 22;
    }
    const base1 = top1 + (small ? 150 : 160), hMax = (base1 - top1 - 22) / 0.5;
    const gx0 = pad + (small ? 2 : 16), gx1 = W - pad - (small ? 2 : 176), slot = (gx1 - gx0) / 8, bw = Math.min(44, slot * 0.62);
    AL.line(ctx, gx0, base1, gx1, base1, { color: AL.alpha(P.muted, 0.5) });
    for (let j = 0; j < 8; j++) {
      const cx = gx0 + slot * (j + 0.5), h = p[j] * hMax, h0 = this.REF[j] * hMax, correct = this.R[j] === 1;
      if (j === 3) {   // correct, but the reference gives it probability 0
        ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = P.accent; ctx.lineWidth = 1.2;
        ctx.strokeRect(cx - bw / 2, base1 - 6, bw, 6); ctx.restore();
        AL.text(ctx, '0', cx, base1 - 12, { P, size: 12, weight: 600, align: 'center', color: P.accent });
      } else {
        ctx.fillStyle = correct ? P.accent : grey; ctx.fillRect(cx - bw / 2, base1 - h, bw, h);
        this.dashedRect(ctx, P, cx - bw / 2, base1 - h0, bw, h0);
        if (held) AL.text(ctx, p[j].toFixed(2), cx, base1 - Math.max(h, h0) - 6, { P, size: small ? 10.5 : 12, weight: 600, align: 'center', color: P.text });
      }
      AL.text(ctx, this.NAMES[j], cx, base1 + 15, { P, size: 12, weight: correct ? 600 : 400, align: 'center', color: correct ? P.accent : P.muted });
    }
    // group brackets under the bars
    const bY = base1 + 26, c0 = gx0 + slot * 0.15, c1 = gx0 + slot * 3.85, i0 = gx0 + slot * 4.15, i1 = gx0 + slot * 7.85;
    AL.line(ctx, c0, bY, c1, bY, { color: P.accent }); AL.line(ctx, i0, bY, i1, bY, { color: grey });
    AL.text(ctx, small ? 'correct (D: never sampled)' : 'correct  (D: correct, but \u03c0_ref(D) = 0)', (c0 + c1) / 2, bY + 15, { P, size: small ? 10.5 : 11.5, align: 'center', color: P.accent });
    AL.text(ctx, 'incorrect', (i0 + i1) / 2, bY + 15, { P, size: small ? 10.5 : 11.5, align: 'center', color: P.muted });
    if (!small) {
      const rx = gx1 + 26;
      AL.text(ctx, '\u03b2', rx, top1 + 14, { P, size: 12, color: P.muted });
      AL.text(ctx, held ? this.betaStr(ib) : '\u2193', rx, top1 + 42, { P, size: 26, weight: 600, color: P.ink });
      AL.text(ctx, 'success mass p*', rx, top1 + 70, { P, size: 12, color: P.muted });
      AL.text(ctx, held ? ps.toFixed(3) : '\u2026', rx, top1 + 92, { P, size: 20, weight: 600, color: P.accent });
      AL.text(ctx, 'inside the correct set', rx, top1 + 118, { P, size: 12, color: P.muted });
      AL.text(ctx, 'A : B : C = 0.50 : 0.33 : 0.17', rx, top1 + 135, { P, size: 12, color: P.text });
      AL.text(ctx, 'N_eff = ' + this.neff(p.slice(0, 4)).toFixed(2), rx, top1 + 152, { P, size: 12, color: P.text });
    }

    // ---------------- panel 2: likelihood displacement on one pair ----------------
    y = bY + (small ? 50 : 54);
    AL.line(ctx, pad, y - 22, W - pad, y - 22, { color: P.line });
    this.panelTitle(ctx, P, '2', small ? 'One pair: both probabilities fall' : 'DPO on one pair: both probabilities can fall', pad, y, ph === 2);
    AL.text(ctx, small ? 'prefer \u201cNo\u201d over \u201cNever\u201d; \u03b2 = 1' : 'train to prefer \u201cNo\u201d over \u201cNever\u201d (\u03b2 = 1); dashed outlines = \u03c0_ref',
      pad + 20, y + 18, { P, size: 12, color: P.muted });
    const u = this.uOf(t), q = this.toy(u), heldU = this.UK.some(k => Math.abs(k[1] - u) < 1e-9);
    const D = Math.log(q[0] / this.REF3[0]) - Math.log(q[1] / this.REF3[1]), loss = Math.log(1 + Math.exp(-D));
    const top2 = y + 34, base2 = top2 + (small ? 150 : 170), h2 = (base2 - top2 - 22) / 0.8;
    const bx0 = pad + (small ? 2 : 16), bx1 = small ? W - pad - 2 : pad + 16 + Math.min(330, (W - 2 * pad) * 0.48), slot2 = (bx1 - bx0) / 3, bw2 = Math.min(56, slot2 * 0.5);
    const colTok = [P.accent, grey, P.gold], tags = ['preferred y_w', 'dispreferred y_l', 'other response'];
    AL.line(ctx, bx0, base2, bx1, base2, { color: AL.alpha(P.muted, 0.5) });
    for (let j = 0; j < 3; j++) {
      const cx = bx0 + slot2 * (j + 0.5), h = q[j] * h2, h0 = this.REF3[j] * h2;
      ctx.fillStyle = colTok[j]; ctx.fillRect(cx - bw2 / 2, base2 - h, bw2, h);
      this.dashedRect(ctx, P, cx - bw2 / 2, base2 - h0, bw2, h0);
      if (heldU) AL.text(ctx, j === 1 ? q[j].toFixed(u > 0.999 ? 3 : 2) : q[j].toFixed(2), cx, base2 - Math.max(h, h0) - 6, { P, size: 12, weight: 600, align: 'center', color: P.text });
      AL.text(ctx, '\u201c' + this.TOK[j] + '\u201d', cx, base2 + 15, { P, size: 12, weight: 600, align: 'center', color: j === 1 ? P.muted : colTok[j] });
      AL.text(ctx, tags[j], cx, base2 + 29, { P, size: small ? 10 : 11, align: 'center', color: P.muted, italic: true });
    }
    // readouts: Delta meter, loss, log-probabilities
    const rx0 = small ? pad : bx1 + 34, rx1 = W - pad - 4;
    let ry = small ? base2 + 58 : top2 + 8;
    const dMax = 1.5, dx = v => rx0 + (rx1 - rx0) * Math.max(0, v) / dMax;
    AL.text(ctx, '\u0394 = log-ratio of y_w \u2212 log-ratio of y_l', rx0, ry, { P, size: 12, color: P.muted });
    ry += 12;
    AL.roundRect(ctx, rx0, ry, rx1 - rx0, 12, 3, { fill: AL.alpha(P.muted, 0.15) });
    if (D > 1e-6) AL.roundRect(ctx, rx0, ry, Math.max(3, dx(D) - rx0), 12, 3, { fill: P.accent });
    AL.line(ctx, dx(Math.log(4)), ry - 3, dx(Math.log(4)), ry + 15, { color: AL.alpha(P.text, 0.5), dash: [2, 2] });
    AL.text(ctx, 'log 4', dx(Math.log(4)), ry + 27, { P, size: 11, align: 'center', color: P.muted });
    if (heldU) AL.text(ctx, D.toFixed(2), rx0, ry + 27, { P, size: 12, weight: 600, color: P.accent });
    ry += small ? 46 : 52;
    const rows = [
      ['DPO loss', heldU ? loss.toFixed(3) : '\u2026', P.text],
      ['log \u03c0(y_w)', heldU ? this.minus(Math.log(q[0]), 2) : '\u2026', P.accent],
      ['log \u03c0(y_l)', heldU ? this.minus(Math.log(q[1]), 2) : '\u2026', P.muted],
    ];
    rows.forEach(([lab, val, col], i) => {
      const yy = small ? ry : ry + i * 24, xx = small ? rx0 + i * ((rx1 - rx0) / 3) : rx0;
      AL.text(ctx, lab, xx, yy, { P, size: 12, color: P.muted });
      AL.text(ctx, val, small ? xx : rx0 + 104, small ? yy + 17 : yy, { P, size: 13, weight: 600, color: col });
    });
    if (!small && u > 0.999) AL.text(ctx, 'start: \u22120.92 and \u22121.20', rx0, ry + 3 * 24, { P, size: 11.5, color: P.muted, italic: true });

    // ---------------- caption ----------------
    const capY = small ? ry + 34 : base2 + 46;
    AL.line(ctx, pad, capY, W - pad, capY, { color: P.line });
    AL.wrap(ctx, this.caption(t), pad, capY + 10, W - 2 * pad, { P, size: 13.5, color: P.text, lineH: 1.45 });
  },
});
