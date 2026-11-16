/* Part 2, "SFT reshapes probability": what the cross-entropy gradient does, from one token to a
   whole trajectory to the mix of correct strategies. All numbers are illustrative.

   Panel 1: the next-token distribution at the step where two correct strategies split. Gradient
   descent on the logits with the SFT gradient p_j - 1[j = c] (step size 1, logits as free
   parameters) raises the demonstrated token and lowers every other one, the valid alternative included.
   Panel 2: four decisions along the demonstrated solution, local probabilities 0.5, 0.4, 0.5, 0.5 ->
   0.8, 0.8, 0.9, 0.9, so the trajectory probability goes 0.05 -> 0.5184.
   Panel 3: probability of two correct strategies, A (demonstrated) and B, 0.20 / 0.20 -> 0.70 / 0.05;
   N_eff (Part 1) falls from 2.00 to 1.28.
   Numbers are printed only where the motion holds, and checks/part02_checks.py in
   llm-post-training-notes recomputes every one of them. */
BlogAnim.register('part-02-reshaping', {
  duration: 24,
  stops: [7, 14.5, 24],
  TOK: ['factor', 'formula', 'expand', 'divide', 'square'],
  P0: [0.30, 0.30, 0.20, 0.12, 0.08],
  BEFORE: [0.5, 0.4, 0.5, 0.5],
  AFTER: [0.8, 0.8, 0.9, 0.9],
  SA: [0.20, 0.70], SB: [0.20, 0.05],
  // gradient steps over time: move, hold, move, hold ...
  SKEYS: [[1, 0], [1.9, 1], [2.6, 1], [3.5, 2], [4.2, 2], [5.1, 3], [5.8, 3], [6.7, 4]],
  P2: [8, 12], P3: [15, 19],

  height(W) { return W < 520 ? 700 : 600; },

  mount() {
    // logits after s = 0..4 steps; the frame interpolates logits linearly between steps
    let z = this.P0.map(Math.log); this.Z = [z.slice()];
    for (let s = 0; s < 4; s++) {
      const p = this.soft(z); z = z.map((v, j) => v - (p[j] - (j === 0 ? 1 : 0))); this.Z.push(z.slice());
    }
  },
  soft(z) { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); },
  sOf(t) { return AL.track(this.SKEYS, t, true); },
  probsAt(s) {
    const i = Math.min(3, Math.floor(s)), u = s - i, z = this.Z[i].map((v, j) => AL.lerp(v, this.Z[i + 1][j], u));
    return this.soft(z);
  },
  u2(t) { return AL.ease(AL.clamp((t - this.P2[0]) / (this.P2[1] - this.P2[0]), 0, 1)); },
  u3(t) { return AL.ease(AL.clamp((t - this.P3[0]) / (this.P3[1] - this.P3[0]), 0, 1)); },
  neff(a, b) { const s = a + b, q = [a / s, b / s]; return Math.exp(-q.reduce((h, x) => h + (x > 0 ? x * Math.log(x) : 0), 0)); },

  label(t) {
    if (t < this.P2[0] - 0.5) return 'SFT steps: ' + Math.round(this.sOf(t));
    if (t < this.P3[0] - 0.5) return 'along the trajectory';
    return 'across strategies';
  },

  caption(t) {
    const s = this.sOf(t), p4 = this.probsAt(4);
    if (t < 1) return 'Solve x\u00b2 \u2212 5x + 6 = 0. The demonstration factors; the quadratic formula would also be correct.';
    if (t < this.P2[0] - 0.5) {
      if (s < 3.999) return 'Each SFT step raises the demonstrated token and lowers every other one, the strongest competitor most.';
      return `After four steps: 0.30 \u2192 ${p4[0].toFixed(2)} for the demonstrated token, 0.30 \u2192 ${p4[1].toFixed(2)} for the valid alternative.`;
    }
    if (t < this.P3[0] - 0.5) {
      if (this.u2(t) < 1) return 'Modest gains at each decision multiply along the trajectory.';
      return 'Four local gains of at most 2\u00d7 make the demonstrated solution 10.4 times more likely.';
    }
    if (this.u3(t) < 1) return 'Across solutions, the demonstrated strategy takes the mass, some of it from strategy B.';
    return 'Correct mass rises from 0.40 to 0.75, but the effective number of strategies falls from 2.00 to 1.28.';
  },

  panelTitle(ctx, P, n, str, x, y, active) {
    AL.text(ctx, n, x, y, { P, size: 13, weight: 700, color: active ? P.accent : P.muted });
    AL.text(ctx, str, x + 20, y, { P, size: 13, weight: 600, color: active ? P.text : P.muted });
  },

  draw(t) {
    const ctx = this.ctx, P = this.P, W = this.W, H = this.H, small = W < 520, pad = small ? 12 : 18;
    AL.roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 10, { fill: P.surface, stroke: P.line });
    const colTok = j => j === 0 ? P.accent : j === 1 ? P.gold : AL.alpha(P.muted, 0.55);
    const ph = t < this.P2[0] - 0.5 ? 1 : t < this.P3[0] - 0.5 ? 2 : 3;

    // ---------------- panel 1: one token ----------------
    let y = 28;
    this.panelTitle(ctx, P, '1', small ? 'One token: the SFT gradient' : 'One token: what the SFT gradient does', pad, y, ph === 1);
    AL.text(ctx, 'next step after \u201cSolve x\u00b2 \u2212 5x + 6 = 0.\u201d', pad + 20, y + 18, { P, size: 12, color: P.muted });
    const s = this.sOf(t), held = Math.abs(s - Math.round(s)) < 1e-6, p = this.probsAt(s);
    const top1 = y + 34, base1 = top1 + (small ? 128 : 132), hMax = (base1 - top1 - 24) / 0.85;  // 0.85 of the scale fills the panel
    const n = 5, gx0 = pad + (small ? 4 : 40), gx1 = W - pad - (small ? 4 : 140), slot = (gx1 - gx0) / n, bw = Math.min(56, slot * 0.56);
    AL.line(ctx, gx0, base1, gx1, base1, { color: AL.alpha(P.muted, 0.5) });
    for (let j = 0; j < n; j++) {
      const cx = gx0 + slot * (j + 0.5), h = p[j] * hMax, h0 = this.P0[j] * hMax;
      ctx.fillStyle = colTok(j); ctx.fillRect(cx - bw / 2, base1 - h, bw, h);
      // where the bar started (dashed outline)
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = AL.alpha(P.text, 0.45); ctx.lineWidth = 1;
      ctx.strokeRect(cx - bw / 2, base1 - h0, bw, h0); ctx.restore();
      if (held) AL.text(ctx, p[j].toFixed(2), cx, base1 - Math.max(h, h0) - 6, { P, size: 12, weight: 600, align: 'center', color: P.text });
      AL.text(ctx, this.TOK[j], cx, base1 + 15, { P, size: small ? 11 : 12, weight: j < 2 ? 600 : 400, align: 'center', color: j < 2 ? colTok(j) : P.muted });
      const tag = j === 0 ? 'demonstrated' : j === 1 ? 'also correct' : '';
      if (tag) AL.text(ctx, tag, cx, base1 + 29, { P, size: small ? 10 : 11, align: 'center', color: P.muted, italic: true });
      // gradient direction while a step is moving: logit change = -(p_j - 1[j = c])
      if (ph === 1 && t > 1 && s < 3.999 && !held) {
        const g = -(p[j] - (j === 0 ? 1 : 0)), len = 6 + 34 * Math.abs(g), ax = cx + bw / 2 + 7, ay = base1 - h / 2;
        AL.arrow(ctx, ax, ay - (g > 0 ? -len / 2 : len / 2), ax, ay + (g > 0 ? -len / 2 : len / 2), { color: g > 0 ? P.accent : P.ink, width: 1.6, head: 6 });
      }
    }
    if (!small) {
      const rx = gx1 + 22;
      AL.text(ctx, 'SFT steps', rx, top1 + 30, { P, size: 12, color: P.muted });
      AL.text(ctx, String(Math.round(s)), rx, top1 + 58, { P, size: 26, weight: 600, color: P.ink });
      AL.text(ctx, 'logit change', rx, top1 + 92, { P, size: 12, color: P.muted });
      AL.text(ctx, '\u2212(p\u2c7c \u2212 1[j = c])', rx, top1 + 109, { P, size: 12, color: P.text });
    } else AL.text(ctx, 'steps: ' + Math.round(s), W - pad, y, { P, size: 12, weight: 600, align: 'right', color: P.ink });

    // ---------------- panel 2: one trajectory ----------------
    y = base1 + 62;
    AL.line(ctx, pad, y - 22, W - pad, y - 22, { color: P.line });
    this.panelTitle(ctx, P, '2', small ? 'One trajectory: gains multiply' : 'One trajectory: local gains multiply', pad, y, ph === 2);
    const u2 = this.u2(t), loc = this.BEFORE.map((b, i) => AL.lerp(b, this.AFTER[i], u2)), end2 = u2 === 0 || u2 === 1;
    const top2 = y + 10, base2 = top2 + 84, h2 = base2 - top2 - 16;
    const cw = small ? (W - 2 * pad) / 4 : 74, cx0 = pad + (small ? 0 : 20);
    for (let i = 0; i < 4; i++) {
      const cx = cx0 + cw * (i + 0.5), w = Math.min(34, cw * 0.5);
      ctx.fillStyle = AL.alpha(P.accent, 0.85); ctx.fillRect(cx - w / 2, base2 - loc[i] * h2, w, loc[i] * h2);
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = AL.alpha(P.text, 0.45); ctx.strokeRect(cx - w / 2, base2 - this.BEFORE[i] * h2, w, this.BEFORE[i] * h2); ctx.restore();
      AL.line(ctx, cx - w / 2 - 4, base2, cx + w / 2 + 4, base2, { color: AL.alpha(P.muted, 0.5) });
      if (end2) AL.text(ctx, loc[i].toFixed(1), cx, base2 - Math.max(loc[i], this.BEFORE[i]) * h2 - 5, { P, size: 12, weight: 600, align: 'center' });
      AL.text(ctx, 'step ' + (i + 1), cx, base2 + 14, { P, size: 11, align: 'center', color: P.muted });
      if (i < 3 && !small) AL.text(ctx, '\u00d7', cx + cw / 2, base2 - h2 / 2, { P, size: 14, align: 'center', color: P.muted, base: 'middle' });
    }
    // log meter for the trajectory probability
    const mx0 = small ? pad + 8 : cx0 + 4 * cw + 50, mx1 = W - pad - (small ? 8 : 16);
    const my = small ? base2 + 64 : top2 + 52, lx = v => mx0 + (mx1 - mx0) * (Math.log10(v) + 2) / 2;
    AL.text(ctx, 'trajectory probability \u03c0(\u03c4 | x), log scale', mx0, my - 26, { P, size: 12, color: P.muted });
    AL.line(ctx, mx0, my, mx1, my, { color: AL.alpha(P.muted, 0.6), width: 1.5 });
    for (const [v, s2] of [[0.01, '0.01'], [0.1, '0.1'], [1, '1']]) {
      AL.line(ctx, lx(v), my - 4, lx(v), my + 4, { color: AL.alpha(P.muted, 0.6) });
      AL.text(ctx, s2, lx(v), my + 17, { P, size: 11, align: 'center', color: P.muted });
    }
    const prod = loc.reduce((a, b) => a * b, 1);
    AL.dot(ctx, lx(0.05), my, 4, P.surface, AL.alpha(P.text, 0.6));
    AL.dot(ctx, lx(prod), my, 6, P.accent);
    if (u2 === 0) AL.text(ctx, '0.05', lx(0.05), my - 10, { P, size: 12, weight: 600, align: 'center' });
    if (u2 === 1) {
      AL.text(ctx, '0.05', lx(0.05), my - 10, { P, size: 12, align: 'center', color: P.muted });
      AL.text(ctx, '0.5184', lx(prod), my - 10, { P, size: 12, weight: 600, align: 'center', color: P.accent });
      AL.text(ctx, '\u00d710.4', (lx(0.05) + lx(prod)) / 2, my + 32, { P, size: 13, weight: 600, align: 'center', color: P.accent });
    }

    // ---------------- panel 3: correct strategies ----------------
    y = (small ? my + 70 : base2 + 58);
    AL.line(ctx, pad, y - 22, W - pad, y - 22, { color: P.line });
    this.panelTitle(ctx, P, '3', small ? 'All solutions: diversity falls' : 'All solutions: the correct mass concentrates', pad, y, ph === 3);
    const u3 = this.u3(t), a = AL.lerp(this.SA[0], this.SA[1], u3), b = AL.lerp(this.SB[0], this.SB[1], u3), end3 = u3 === 0 || u3 === 1;
    const bx0 = pad + (small ? 0 : 66), bx1 = W - pad - (small ? 0 : 150), bh = 24;
    const rows = [['before', this.SA[0], this.SB[0], true], [u3 === 0 ? 'now' : 'after SFT', a, b, false]];
    rows.forEach(([lab, ra, rb, ghost], r) => {
      const yy = y + 16 + r * (bh + 22) + (small ? 14 : 0);
      if (small) AL.text(ctx, lab, bx0, yy - 4, { P, size: 11, color: P.muted });
      else AL.text(ctx, lab, bx0 - 8, yy + bh / 2, { P, size: 12, align: 'right', base: 'middle', color: P.muted });
      const wA = (bx1 - bx0) * ra, wB = (bx1 - bx0) * rb, al = ghost ? 0.45 : 1;
      ctx.save(); ctx.globalAlpha = al;
      ctx.fillStyle = P.accent; ctx.fillRect(bx0, yy, wA, bh);
      ctx.fillStyle = P.gold; ctx.fillRect(bx0 + wA, yy, wB, bh);
      ctx.fillStyle = AL.alpha(P.muted, 0.25); ctx.fillRect(bx0 + wA + wB, yy, bx1 - bx0 - wA - wB, bh);
      ctx.restore();
      if (ghost || end3) {
        const inBar = ghost ? P.text : P.surface;
        if (wA > 34) AL.text(ctx, 'A ' + ra.toFixed(2), bx0 + 6, yy + bh / 2, { P, size: 11, weight: 600, base: 'middle', color: inBar });
        if (wB > 34) AL.text(ctx, 'B ' + rb.toFixed(2), bx0 + wA + 6, yy + bh / 2, { P, size: 11, weight: 600, base: 'middle', color: inBar });
        else AL.text(ctx, 'B ' + rb.toFixed(2), bx0 + wA + wB + 6, yy + bh / 2, { P, size: 11, weight: 600, base: 'middle', color: P.gold });
      }
      if (r === 0) AL.text(ctx, 'incorrect', bx1 - 6, yy + bh / 2, { P, size: 11, align: 'right', base: 'middle', color: P.muted });
      if (end3) {
        const cm = (ra + rb).toFixed(2), ne = this.neff(ra, rb).toFixed(2);
        if (small) AL.text(ctx, `correct ${cm} \u00b7 N_eff ${ne}`, bx1, yy - 4, { P, size: 11, weight: 600, align: 'right', color: ghost ? P.muted : P.text });
        else {
          AL.text(ctx, `correct mass ${cm}`, bx1 + 14, yy + 8, { P, size: 12, weight: 600, base: 'middle', color: ghost ? P.muted : P.text });
          AL.text(ctx, `N_eff ${ne}`, bx1 + 14, yy + 22, { P, size: 12, base: 'middle', color: ghost ? P.muted : P.text });
        }
      }
    });
    const legY = y + 16 + 2 * (bh + 22) + (small ? 18 : 2);
    AL.text(ctx, 'A = demonstrated strategy (factor), B = valid alternative (formula)', pad + (small ? 0 : 66), legY, { P, size: 11, color: P.muted, italic: true });

    // ---------------- caption ----------------
    AL.line(ctx, pad, legY + 14, W - pad, legY + 14, { color: P.line });
    AL.wrap(ctx, this.caption(t), pad, legY + 24, W - 2 * pad, { P, size: 13.5, color: P.text, lineH: 1.45 });
  },
});
