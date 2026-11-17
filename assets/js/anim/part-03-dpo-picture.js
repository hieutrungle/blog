/* Part 3, "DPO from KL-regularized RL": the picture to keep in mind. All numbers are illustrative.

   One prompt, two sampled responses; a verifier prefers y_w (correct) to y_l (wrong). The policy's
   probabilities of y_w, y_l and all other responses start at the reference pi_ref = (0.20, 0.30, 0.50).
   Each DPO step (beta = 1, step size 1, the three logits treated as free parameters) raises z_w and
   lowers z_l by beta * sigma(-beta * Delta), the push, which shrinks as the margin Delta grows.
   Six steps: y_w 0.20 -> 0.548 (2.74 x pi_ref), y_l 0.30 -> 0.065 (0.22 x pi_ref), push 0.50 -> 0.074.
   checks/part03_checks.py in llm-post-training-notes recomputes every printed number. */
BlogAnim.register('part-03-dpo-picture', {
  duration: 16,
  stops: [3.5, 5.5, 7.5, 9.5, 11.5, 13.5, 16],
  REF: [0.20, 0.30, 0.50],
  NSTEP: 6,
  T0: 1.5, MOVE: 1.2, HOLD: 0.8,

  height(W) { return W < 520 ? 670 : 400; },

  mount() {
    // cumulative logit shift c_k after k steps: c_{k+1} = c_k + sigma(-2 c_k)  (Delta = 2c, beta = 1)
    this.C = [0];
    for (let k = 0; k < this.NSTEP; k++) { const c = this.C[k]; this.C.push(c + 1 / (1 + Math.exp(2 * c))); }
  },
  sOf(t) {   // fractional step count at time t
    const u = t - this.T0; if (u <= 0) return 0;
    const per = this.MOVE + this.HOLD, k = Math.floor(u / per), r = u - k * per;
    if (k >= this.NSTEP) return this.NSTEP;
    return k + AL.ease(Math.min(1, r / this.MOVE));
  },
  cOf(s) { const i = Math.min(this.NSTEP - 1, Math.floor(s)); return AL.lerp(this.C[i], this.C[i + 1], s - i); },
  probs(c) {
    const z = [Math.log(this.REF[0]) + c, Math.log(this.REF[1]) - c, Math.log(this.REF[2])];
    const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), S = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / S);
  },

  label(t) { return 'DPO step ' + Math.round(this.sOf(t)); },
  caption(t) {
    const s = this.sOf(t);
    if (s < 1e-9) return 'A verifier prefers y_w (correct) to y_l (wrong). Dashed outlines show the frozen reference \u03c0_ref.';
    if (s < this.NSTEP - 1e-9) return 'Each DPO step raises y_w and lowers y_l, measured as ratios to \u03c0_ref. The push shrinks as the margin \u0394 grows.';
    return 'After 6 steps y_w is 2.74 times as likely as under \u03c0_ref and y_l 0.22 times. The push fell from 0.50 to 0.074: a pair that is already separated gets little further attention.';
  },

  card(ctx, P, x, y, w, h, tag, body, mark, col, active) {
    AL.roundRect(ctx, x, y, w, h, 8, { fill: AL.alpha(col, 0.10), stroke: AL.alpha(col, active ? 0.9 : 0.5), width: active ? 1.6 : 1 });
    AL.text(ctx, tag, x + 10, y + 18, { P, size: 12, weight: 700, color: col });
    AL.text(ctx, body, x + 10, y + 38, { P, size: 13, color: P.text });
    if (mark) AL.text(ctx, mark, x + w - 12, y + 18, { P, size: 12, weight: 600, align: 'right', color: col });
  },

  draw(t) {
    const ctx = this.ctx, P = this.P, W = this.W, H = this.H, small = W < 520, pad = small ? 12 : 18;
    AL.roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 10, { fill: P.surface, stroke: P.line });
    const s = this.sOf(t), held = Math.abs(s - Math.round(s)) < 1e-9, k = Math.round(s);
    const c = this.cOf(s), p = this.probs(c), D = 2 * c, push = 1 / (1 + Math.exp(D));
    const grey = AL.alpha(P.muted, 0.6), light = AL.alpha(P.muted, 0.28);

    // ---------------- the data: one prompt, a preferred and a dispreferred response ----------------
    const cw = small ? W - 2 * pad : Math.min(300, W * 0.42), cx = pad;
    let y = 16;
    AL.roundRect(ctx, cx, y, cw, 50, 8, { fill: AL.alpha(P.muted, 0.08), stroke: P.line });
    AL.text(ctx, 'prompt x', cx + 10, y + 18, { P, size: 12, weight: 700, color: P.muted });
    AL.text(ctx, 'Solve 2x + 3 = 11.', cx + 10, y + 38, { P, size: 13, color: P.text });
    const yw = y + 64, yl = yw + 62;
    this.card(ctx, P, cx, yw, cw, 50, 'y_w  preferred', '2x = 8, so x = 4', '\u2713 correct', P.accent, true);
    this.card(ctx, P, cx, yl, cw, 50, 'y_l  dispreferred', '2x = 14, so x = 7', '\u2717 wrong', P.muted, true);
    AL.text(ctx, 'the verifier says y_w \u227b y_l', cx + 10, yl + 70, { P, size: 12, italic: true, color: P.muted });

    // ---------------- the policy: bars against the frozen reference ----------------
    const bx0 = small ? pad + 6 : cx + cw + 70, bx1 = W - pad - (small ? 6 : 8);
    const top = small ? yl + 92 : 30, base = top + (small ? 190 : 230), hMax = (base - top - 30) / 0.6;
    AL.text(ctx, 'policy \u03c0_\u03b8 (bars) vs frozen reference \u03c0_ref (dashed)', bx0, top - (small ? 0 : 10), { P, size: 12, color: P.muted });
    const slot = (bx1 - bx0) / 3, bw = Math.min(54, slot * 0.46), cols = [P.accent, grey, light];
    const names = ['y_w', 'y_l', 'all other'], subs = ['preferred', 'dispreferred', 'responses'];
    AL.line(ctx, bx0, base, bx1, base, { color: AL.alpha(P.muted, 0.5) });
    for (let j = 0; j < 3; j++) {
      const mx = bx0 + slot * (j + 0.5), h = p[j] * hMax, h0 = this.REF[j] * hMax;
      ctx.fillStyle = cols[j]; ctx.fillRect(mx - bw / 2, base - h, bw, h);
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = AL.alpha(P.text, 0.5); ctx.lineWidth = 1;
      ctx.strokeRect(mx - bw / 2, base - h0, bw, h0); ctx.restore();
      if (held) {
        const v = j === 1 && k > 0 ? p[j].toFixed(3) : (k === this.NSTEP && j === 0 ? p[j].toFixed(3) : p[j].toFixed(2));
        AL.text(ctx, v, mx, base - Math.max(h, h0) - 7, { P, size: 12, weight: 600, align: 'center', color: P.text });
      }
      AL.text(ctx, names[j], mx, base + 16, { P, size: 12, weight: j < 2 ? 700 : 400, align: 'center', color: j === 0 ? P.accent : P.muted });
      AL.text(ctx, subs[j], mx, base + 30, { P, size: 11, align: 'center', italic: true, color: P.muted });
      if (j < 2 && held && k > 0) AL.text(ctx, '\u00d7' + (p[j] / this.REF[j]).toFixed(2) + ' vs \u03c0_ref', mx, base + 45, { P, size: 11, weight: 600, align: 'center', color: j === 0 ? P.accent : P.muted });
      // the DPO push: up on y_w, down on y_l, length proportional to the current weight
      if (j < 2 && s < this.NSTEP - 1e-9) {
        const len = 10 + 70 * push, ax = mx + bw / 2 + 12, ay = base - Math.max(h, 14) / 2;
        if (j === 0) AL.arrow(ctx, ax, ay + len / 2, ax, ay - len / 2, { color: P.accent, width: 2.2, head: 8 });
        else AL.arrow(ctx, ax, ay - len / 2, ax, ay + len / 2, { color: P.muted, width: 2.2, head: 8 });
      }
    }
    if (!small) {   // links from the cards to the bars they move
      AL.arrow(ctx, cx + cw + 6, yw + 25, bx0 + slot * 0.5 - bw / 2 - 8, base - p[0] * hMax / 2, { color: AL.alpha(P.accent, 0.5), width: 1.2, head: 6, dash: [4, 3] });
      AL.arrow(ctx, cx + cw + 6, yl + 25, bx0 + slot * 1.5 - bw / 2 - 8, base - p[1] * hMax / 2, { color: AL.alpha(P.muted, 0.5), width: 1.2, head: 6, dash: [4, 3] });
    }

    // ---------------- readouts: step, margin, push ----------------
    const ry = small ? base + 66 : yl + 104, rx0 = pad, rw = small ? W - 2 * pad : cw;
    AL.text(ctx, 'DPO step ' + k + (held ? '' : '\u2026'), rx0, ry, { P, size: 13, weight: 700, color: P.ink });
    const meter = (yy, label, val, frac, col, txt) => {
      AL.text(ctx, label, rx0, yy, { P, size: 12, color: P.muted });
      AL.roundRect(ctx, rx0, yy + 7, rw, 9, 3, { fill: AL.alpha(P.muted, 0.15) });
      if (frac > 0.002) AL.roundRect(ctx, rx0, yy + 7, Math.max(3, rw * frac), 9, 3, { fill: col });
      if (held) AL.text(ctx, txt, rx0 + rw, yy, { P, size: 12, weight: 600, align: 'right', color: col });
    };
    meter(ry + 22, 'margin \u0394 = log-ratio of y_w \u2212 log-ratio of y_l', D, Math.min(1, D / 3), P.accent, D.toFixed(2));
    meter(ry + 58, 'push on the pair, \u03b2\u03c3(\u2212\u03b2\u0394), \u03b2 = 1', push, push / 0.5, P.ink, held && k === this.NSTEP ? push.toFixed(3) : push.toFixed(2));

    // ---------------- caption ----------------
    const capY = small ? ry + 88 : Math.max(ry + 86, base + 54);
    AL.line(ctx, pad, capY, W - pad, capY, { color: P.line });
    AL.wrap(ctx, this.caption(t), pad, capY + 10, W - 2 * pad, { P, size: 13.5, color: P.text, lineH: 1.45 });
  },
});
