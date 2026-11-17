/* Part 5, "GRPO from first principles": the picture to keep in mind. Simulated and illustrative.

   Part 4's hard problem, one logit per solution strategy: a rare correct strategy B (0.02), a correct
   strategy Z the policy never produces (0), three wrong ones (0.50, 0.30, 0.18). Each round draws a group
   of G = 8 samples (xorshift32, seed 20264905, the same generator as AL.rng and
   checks/part05_checks.py), a verifier scores them, and each sample gets the group-relative advantage
       A_i = (R_i - mean R) / sd R      (population standard deviation; A_i = 0 when sd R = 0),
   followed by one policy-gradient step with step size 2:
       z_k += 2 * (1/8) * sum_i A_i (1[k = s_i] - pi_k).
   The seed was chosen so that the first success comes early (round 3). checks/part05_checks.py in
   llm-post-training-notes runs the same simulation and recomputes every printed number. */
BlogAnim.register('part-05-group-advantage', {
  SEED: 20264905, ETA: 2, G: 8, ROUNDS: 11,
  T0: 2.0, SAMPLE: 0.9, SCORE: 0.7, MOVE: 0.8, HOLD: 0.6,
  P0: [0.02, 0.0, 0.50, 0.30, 0.18], R: [1, 1, 0, 0, 0],
  NAMES: ['B', 'Z', 'D', 'E', 'F'], SUBS: ['rare', 'never', 'wrong', 'wrong', 'wrong'],
  get per() { return this.SAMPLE + this.SCORE + this.MOVE + this.HOLD; },
  get duration() { return this.T0 + this.ROUNDS * this.per + 1.0; },
  get stops() { const s = [this.T0 - 0.01]; for (let r = 1; r <= this.ROUNDS; r++) s.push(this.T0 + r * this.per - 0.01); s.push(this.duration); return s; },

  height(W) { return W < 560 ? 740 : 494; },

  softmax(z) {
    const m = Math.max(...z), e = z.map(v => (v > -Infinity ? Math.exp(v - m) : 0));
    let s = 0; for (const v of e) s += v;
    return e.map(v => v / s);
  },
  draw1(pi, u) {
    let c = 0;
    for (let k = 0; k < pi.length; k++) { c += pi[k]; if (u < c) return k; }
    let last = 0; for (let k = 0; k < pi.length; k++) if (pi[k] > 0) last = k; return last;
  },
  advantages(rs) {
    const G = rs.length, m = rs.reduce((a, b) => a + b, 0) / G;
    const sd = Math.sqrt(rs.reduce((a, r) => a + (r - m) * (r - m), 0) / G);
    return { m, sd, A: rs.map(r => (sd > 0 ? (r - m) / sd : 0)) };
  },
  mount() {
    if (this.H_) return;
    const rnd = AL.rng(this.SEED);
    let z = this.P0.map(v => (v > 0 ? Math.log(v) : -Infinity));
    this.H_ = [];
    for (let r = 0; r < this.ROUNDS; r++) {
      const pi = this.softmax(z);
      const s = Array.from({ length: this.G }, () => this.draw1(pi, rnd()));
      const rs = s.map(k => this.R[k]), st = this.advantages(rs);
      this.H_.push({ pi, s, rs, k: rs.reduce((a, b) => a + b, 0), m: st.m, sd: st.sd, A: st.A });
      const g = z.map(() => 0);
      s.forEach((sk, i) => { for (let j = 0; j < z.length; j++) g[j] += st.A[i] * ((j === sk ? 1 : 0) - pi[j]) / this.G; });
      z = z.map((v, j) => (v > -Infinity ? v + this.ETA * g[j] : v));
    }
    this.H_.push({ pi: this.softmax(z) });
    window.__part05History = this.H_;   // for tests: compare with checks/part05_checks.py
  },

  phase(t) {
    const u = t - this.T0;
    if (u < 0) return { r: -1, stage: 'intro', u: 0 };
    const r = Math.floor(u / this.per);
    if (r >= this.ROUNDS) return { r: this.ROUNDS - 1, stage: 'end', u: 1 };
    let w = u - r * this.per;
    if (w < this.SAMPLE) return { r, stage: 'sample', u: w / this.SAMPLE };
    w -= this.SAMPLE; if (w < this.SCORE) return { r, stage: 'score', u: AL.ease(w / this.SCORE) };
    w -= this.SCORE; if (w < this.MOVE) return { r, stage: 'move', u: AL.ease(w / this.MOVE) };
    return { r, stage: 'hold', u: 1 };
  },
  label(t) { const ph = this.phase(t); return ph.r < 0 ? 'Before round 1' : 'Round ' + (ph.r + 1) + ' of ' + this.ROUNDS; },
  fmtA(a) { return Math.abs(a) < 0.005 ? '0' : (a > 0 ? '+' : '\u2212') + Math.abs(a).toFixed(2); },
  caption(ph) {
    const H = this.H_, fin = H[this.ROUNDS].pi[0];
    const first = H.findIndex(h => h.k > 0), half = H.findIndex(h => h.k === this.G / 2);
    const lone = H.findIndex(h => h.k === this.G - 1), full = H.findIndex(h => h.k === this.G);
    if (ph.r < 0) return 'Bars: the policy\u2019s probability of each solution strategy (\u2713 correct, \u2717 wrong). Each round draws a group of 8 samples, a verifier scores them, and each sample gets its reward minus the group mean, divided by the group\u2019s standard deviation, as its advantage.';
    if (ph.stage === 'end') return 'After ' + this.ROUNDS + ' rounds the success probability is ' + fin.toFixed(3) + '. The policy learned only from mixed groups: a success earned ' + this.fmtA(H[first].A[H[first].rs.indexOf(1)]) + ' when it was alone in its group and nothing once every sample succeeded. Z, never sampled, stayed at 0.';
    const h = H[ph.r];
    if (h.k === 0) return 'Round ' + (ph.r + 1) + ': every sample fails. The group mean is 0 and every advantage is 0, so nothing moves, not even the failures. The success probability stays at ' + h.pi[0].toFixed(3) + '.';
    if (ph.r === first) return 'Round ' + (ph.r + 1) + ': one sample of 8 succeeds. Measured against its group it gets advantage \u221a7 = ' + this.fmtA(h.A[h.rs.indexOf(1)]) + ', and each failure ' + this.fmtA(h.A[h.rs.indexOf(0)]) + '. The rare strategy is reinforced.';
    if (h.k === this.G) return 'Every sample succeeds: the standard deviation is 0 and so is every advantage. The policy stops moving at ' + h.pi[0].toFixed(3) + ', with ' + ((1 - h.pi[0]) * 100).toFixed(1) + '% still on wrong strategies.';
    if (ph.r === lone) return 'Round ' + (ph.r + 1) + ': 7 of 8 succeed. Now the lone failure is the surprise, with advantage ' + this.fmtA(h.A[h.rs.indexOf(0)]) + ', and each success gets only ' + this.fmtA(h.A[h.rs.indexOf(1)]) + '.';
    return 'As p rises, groups hold more successes and the same reward of 1 earns less: ' + this.fmtA(H[first].A[H[first].rs.indexOf(1)]) + ' with 1 of 8 correct, ' + this.fmtA(H[half].A[H[half].rs.indexOf(1)]) + ' with 4 of 8.';
  },

  // policy panel: one bar per strategy
  policy(x0, y0, w, h, ph) {
    const ctx = this.ctx, P = this.P, H = this.H_, K = this.P0.length, good = P.accent, grey = AL.alpha(P.muted, 0.55);
    AL.roundRect(ctx, x0, y0, w, h, 8, { fill: AL.alpha(P.muted, 0.04), stroke: P.line });
    AL.text(ctx, 'The policy', x0 + 10, y0 + 20, { P, size: 13, weight: 700, color: P.ink });
    let pi;
    if (ph.r < 0) pi = H[0].pi;
    else if (ph.stage === 'move') pi = H[ph.r].pi.map((v, k) => AL.lerp(v, H[ph.r + 1].pi[k], ph.u));
    else if (ph.stage === 'hold' || ph.stage === 'end') pi = H[ph.r + 1].pi;
    else pi = H[ph.r].pi;
    const sx0 = x0 + 12, sx1 = x0 + w - 12, slot = (sx1 - sx0) / K, bw = Math.min(30, slot * 0.45);
    const base = y0 + h - 70, hMax = base - (y0 + 36);
    AL.line(ctx, sx0, base, sx1, base, { color: AL.alpha(P.muted, 0.5) });
    for (let k = 0; k < K; k++) {
      const mx = sx0 + slot * (k + 0.5), col = this.R[k] ? good : grey, hg = pi[k] * hMax;
      if (pi[k] > 0) { ctx.fillStyle = col; ctx.fillRect(mx - bw / 2, base - Math.max(1.5, hg), bw, Math.max(1.5, hg)); }
      else { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = AL.alpha(good, 0.7); ctx.strokeRect(mx - bw / 2, base - 10, bw, 10); ctx.restore(); }
      AL.text(ctx, this.NAMES[k] + (this.R[k] ? ' \u2713' : ' \u2717'), mx, base + 15, { P, size: 12, weight: 700, align: 'center', color: this.R[k] ? good : P.muted });
      AL.text(ctx, this.SUBS[k], mx, base + 28, { P, size: 11, italic: true, align: 'center', color: P.muted });
    }
    AL.text(ctx, 'success probability p = ' + (ph.stage === 'move' ? '\u2026' : pi[0].toFixed(3)), x0 + 12, base + 52, { P, size: 12.5, weight: 700, color: P.ink });
  },

  // group panel: the 8 samples of this round and their advantages
  group(x0, y0, w, h, ph) {
    const ctx = this.ctx, P = this.P, H = this.H_, G = this.G, good = P.accent;
    AL.roundRect(ctx, x0, y0, w, h, 8, { fill: AL.alpha(P.muted, 0.04), stroke: P.line });
    AL.text(ctx, ph.r < 0 ? 'A group of 8 samples' : 'Round ' + (ph.r + 1) + ': a group of 8 samples', x0 + 10, y0 + 20, { P, size: 13, weight: 700, color: P.ink });
    const sx0 = x0 + 12, sx1 = x0 + w - 12, slot = (sx1 - sx0) / G, cw = Math.min(34, slot * 0.72), ch = 24;
    const cy = y0 + 32, zero = cy + ch + 84, scale = 58 / Math.sqrt(7), vy = zero + 58 + 16;
    AL.line(ctx, sx0, zero, sx1, zero, { color: AL.alpha(P.muted, 0.6) });
    AL.text(ctx, 'bars: each sample\u2019s advantage (above or below 0)', sx0, cy + ch + 15, { P, size: 10.5, italic: true, color: P.muted });
    const h0 = ph.r >= 0 ? H[ph.r] : null;
    const nShown = !h0 ? 0 : ph.stage === 'sample' ? Math.min(G, Math.floor(ph.u * G * 1.15)) : G;
    const scored = h0 && ph.stage !== 'sample', grow = !scored ? 0 : ph.stage === 'score' ? ph.u : 1;
    for (let i = 0; i < G; i++) {
      const mx = sx0 + slot * (i + 0.5);
      if (i >= nShown) { AL.roundRect(ctx, mx - cw / 2, cy, cw, ch, 5, { stroke: AL.alpha(P.muted, 0.25) }); continue; }
      const k = h0.s[i], ok = this.R[k] === 1;
      const fill = !scored ? AL.alpha(P.muted, 0.12) : ok ? good : AL.alpha(P.muted, 0.35);
      AL.roundRect(ctx, mx - cw / 2, cy, cw, ch, 5, { fill, stroke: scored ? null : AL.alpha(P.muted, 0.4) });
      AL.text(ctx, this.NAMES[k], mx, cy + 16.5, { P, size: 12, weight: 700, align: 'center', color: scored && ok ? P.surface : P.text });
      if (!scored) continue;
      const a = h0.A[i], bh = Math.abs(a) * scale * grow, bw = Math.min(16, slot * 0.4);
      ctx.fillStyle = a > 0 ? good : AL.alpha(P.muted, 0.6);
      if (a > 0) ctx.fillRect(mx - bw / 2, zero - bh, bw, bh);
      else if (a < 0) ctx.fillRect(mx - bw / 2, zero, bw, bh);
      else ctx.fillRect(mx - bw / 2, zero - 1, bw, 2);
      AL.text(ctx, this.fmtA(a), mx, vy, { P, size: w < 400 ? 10 : 11, weight: 600, align: 'center', color: a > 0 ? good : P.muted });
    }
    const ry = vy + 22;
    if (scored) {
      AL.text(ctx, h0.k + ' of ' + G + ' correct \u00b7 mean ' + h0.m.toFixed(3) + ' \u00b7 std ' + h0.sd.toFixed(2), x0 + 12, ry, { P, size: w < 400 ? 11 : 12, color: P.muted });
      AL.text(ctx, h0.sd > 0 ? 'mixed group: the update learns from it' : 'no spread: every advantage is 0, nothing moves', x0 + 12, ry + 17,
        { P, size: w < 400 ? 11 : 12, weight: 600, color: h0.sd > 0 ? good : P.muted });
    } else if (h0) AL.text(ctx, 'sampling\u2026', x0 + 12, ry, { P, size: 12, color: P.muted });
  },

  // strip: the advantage a correct sample earned in each round so far
  strip(x0, y0, w, h, ph) {
    const ctx = this.ctx, P = this.P, H = this.H_, n = this.ROUNDS, good = P.accent;
    AL.roundRect(ctx, x0, y0, w, h, 8, { fill: AL.alpha(P.muted, 0.04), stroke: P.line });
    AL.text(ctx, w < 400 ? 'Advantage of a correct sample, by round' : 'Advantage of a correct sample, round by round', x0 + 10, y0 + 19, { P, size: 12.5, weight: 700, color: P.ink });
    const sx0 = x0 + 10, slot = (w - 20) / n, base = y0 + h - 34, scale = 24 / Math.sqrt(7);
    const done = ph.r < 0 ? 0 : ph.stage === 'sample' ? ph.r : ph.r + 1;
    for (let r = 0; r < n; r++) {
      const mx = sx0 + slot * (r + 0.5), cur = ph.r === r && ph.stage !== 'end';
      if (cur) AL.roundRect(ctx, mx - slot / 2 + 1, y0 + 26, slot - 2, h - 30, 4, { fill: AL.alpha(good, 0.08) });
      AL.text(ctx, String(r + 1), mx, y0 + h - 8, { P, size: 10.5, align: 'center', color: P.muted });
      if (r >= done) continue;
      const hr = H[r], i = hr.rs.indexOf(1);
      if (i < 0) { AL.text(ctx, '\u2013', mx, base - 4, { P, size: 12, align: 'center', color: P.muted }); continue; }
      const a = hr.A[i], bw = Math.min(14, slot * 0.4), bh = a * scale;
      ctx.fillStyle = good; ctx.fillRect(mx - bw / 2, base - Math.max(1.5, bh), bw, Math.max(1.5, bh));
      AL.text(ctx, Math.abs(a) < 0.005 ? '0' : a.toFixed(2), mx, base + 13, { P, size: w < 400 ? 9 : 10.5, weight: 600, align: 'center', color: good });
    }
  },

  draw(t) {
    const ctx = this.ctx, P = this.P, W = this.W, H = this.H, small = W < 560, pad = small ? 8 : 12;
    AL.roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 10, { fill: P.surface, stroke: P.line });
    const ph = this.phase(t), hp = small ? 210 : 276, hg = 276, hs = 92;
    let y;
    if (small) {
      this.policy(pad, pad, W - 2 * pad, hp, ph);
      this.group(pad, 2 * pad + hp, W - 2 * pad, hg, ph);
      this.strip(pad, 3 * pad + hp + hg, W - 2 * pad, hs, ph);
      y = 4 * pad + hp + hg + hs;
    } else {
      const wl = Math.round((W - 3 * pad) * 0.38), wr = W - 3 * pad - wl;
      this.policy(pad, pad, wl, hp, ph);
      this.group(2 * pad + wl, pad, wr, hg, ph);
      this.strip(pad, 2 * pad + hg, W - 2 * pad, hs, ph);
      y = 3 * pad + hg + hs;
    }
    AL.wrap(ctx, this.caption(ph), pad + 4, y + 2, W - 2 * pad - 8, { P, size: 13, color: P.text, lineH: 1.4 });
  },
});
