/* Part 4, "Policy gradients for LLMs: REINFORCE to PPO": the picture to keep in mind. Simulated and illustrative.

   Two problems, one logit per solution strategy. Easy problem: a common correct strategy A (0.30), a rare
   correct strategy B (0.02), a correct strategy C that the policy never produces (0), three wrong ones.
   Hard problem: the only reachable correct strategy is rare (0.02), another correct one has probability 0,
   three wrong ones. Each round draws 8 samples per problem (xorshift32, seed 21726, the same generator as
   AL.rng and checks/part04_checks.py; easy first, then hard), a verifier scores them, and one REINFORCE step
   follows with baseline b = p, the current success probability, and step size 3:
       z_k += 3 * (1/8) * sum_i (R_i - p) (1[k = s_i] - pi_k).
   checks/part04_checks.py in llm-post-training-notes runs the same simulation and recomputes every printed
   number. */
BlogAnim.register('part-04-pg-loop', {
  SEED: 21726, ETA: 3, G: 8, ROUNDS: 8,
  T0: 2.0, SAMPLE: 1.0, SCORE: 0.6, MOVE: 0.8, HOLD: 0.6,
  PROBS: [
    { title: 'Easy problem: a common correct strategy', p0: [0.30, 0.02, 0.0, 0.33, 0.20, 0.15], R: [1, 1, 1, 0, 0, 0],
      names: ['A', 'B', 'C', 'D', 'E', 'F'], subs: ['common', 'rare', 'never', 'wrong', 'wrong', 'wrong'] },
    { title: 'Hard problem: only a rare correct strategy', p0: [0.02, 0.0, 0.50, 0.30, 0.18], R: [1, 1, 0, 0, 0],
      names: ['B', 'Z', 'D', 'E', 'F'], subs: ['rare', 'never', 'wrong', 'wrong', 'wrong'] },
  ],
  get per() { return this.SAMPLE + this.SCORE + this.MOVE + this.HOLD; },
  get duration() { return this.T0 + this.ROUNDS * this.per + 1.0; },
  get stops() { const s = [this.T0 - 0.01]; for (let r = 1; r <= this.ROUNDS; r++) s.push(this.T0 + r * this.per - 0.01); s.push(this.duration); return s; },

  height(W) { return W < 560 ? 790 : 420; },

  softmax(z) {
    const m = Math.max(...z), e = z.map(v => (v > -Infinity ? Math.exp(v - m) : 0));
    let s = 0; for (const v of e) s += v;
    return e.map(v => v / s);
  },
  succ(pi, R) { let p = 0; for (let k = 0; k < pi.length; k++) if (R[k]) p += pi[k]; return p; },
  draw1(pi, u) {
    let c = 0;
    for (let k = 0; k < pi.length; k++) { c += pi[k]; if (u < c) return k; }
    let last = 0; for (let k = 0; k < pi.length; k++) if (pi[k] > 0) last = k; return last;
  },
  step(z, R, samples) {
    const pi = this.softmax(z), p = this.succ(pi, R), g = z.map(() => 0);
    for (const s of samples) {
      const a = R[s] - p;
      for (let k = 0; k < z.length; k++) g[k] += a * ((k === s ? 1 : 0) - pi[k]) / this.G;
    }
    return z.map((v, k) => (v > -Infinity ? v + this.ETA * g[k] : v));
  },
  mount() {
    if (this.H_) return;
    const rnd = AL.rng(this.SEED), z = this.PROBS.map(P => P.p0.map(v => (v > 0 ? Math.log(v) : -Infinity)));
    this.H_ = [];
    for (let r = 0; r < this.ROUNDS; r++) {
      const pis = z.map(zz => this.softmax(zz));
      const samples = pis.map(pi => Array.from({ length: this.G }, () => this.draw1(pi, rnd())));
      this.H_.push({ pis, samples });
      for (let j = 0; j < 2; j++) z[j] = this.step(z[j], this.PROBS[j].R, samples[j]);
    }
    this.H_.push({ pis: z.map(zz => this.softmax(zz)), samples: null });
  },

  // phase at time t: round r (0-based), stage and progress u within it
  phase(t) {
    const u = t - this.T0;
    if (u < 0) return { r: -1, stage: 'intro', u: 0 };
    const r = Math.floor(u / this.per);
    if (r >= this.ROUNDS) return { r: this.ROUNDS - 1, stage: 'end', u: 1 };
    let w = u - r * this.per;
    if (w < this.SAMPLE) return { r, stage: 'sample', u: w / this.SAMPLE };
    w -= this.SAMPLE; if (w < this.SCORE) return { r, stage: 'score', u: w / this.SCORE };
    w -= this.SCORE; if (w < this.MOVE) return { r, stage: 'move', u: AL.ease(w / this.MOVE) };
    return { r, stage: 'hold', u: 1 };
  },
  label(t) { const ph = this.phase(t); return ph.r < 0 ? 'Before round 1' : 'Round ' + (ph.r + 1) + ' of ' + this.ROUNDS; },
  caption(ph) {
    const H = this.H_, fe = H[this.ROUNDS].pis[0], fh = H[this.ROUNDS].pis[1];
    if (ph.r < 0) return 'Bars: the policy\u2019s probability of each solution strategy (\u2713 correct, \u2717 wrong). Each round draws 8 samples per problem, a verifier scores them, and one policy-gradient step pushes each sampled strategy up or down by its advantage R \u2212 p.';
    if (ph.stage === 'end') return 'After 8 rounds the easy problem succeeds with probability ' + this.succ(fe, this.PROBS[0].R).toFixed(3) + ', almost all of it on A; B, reinforced once, fell to ' + fe[1].toFixed(3) + '. The hard problem rose to ' + fh[0].toFixed(3) + ' only after its first success. The strategies with probability 0 never moved.';
    if (ph.r < 3 || (ph.r === 3 && ph.stage === 'sample')) return 'Easy problem: sampled successes go up, sampled failures go down, and A, the most probable correct strategy, gains the most. Hard problem: every sample fails, each with advantage \u22120.02, so almost nothing moves.';
    if (ph.r === 3) return 'Round 4: the hard problem samples its rare strategy once. With advantage +' + (1 - H[3].pis[1][0]).toFixed(2) + ' it is reinforced, and it now comes up more often in the next rounds.';
    return 'The hard problem\u2019s rare strategy keeps being sampled and reinforced. On the easy problem A has taken over: B gets no samples and loses probability through normalization.';
  },

  panel(j, x0, y0, w, h, ph) {
    const ctx = this.ctx, P = this.P, Q = this.PROBS[j], K = Q.p0.length, H = this.H_;
    const grey = AL.alpha(P.muted, 0.55), good = P.accent;
    AL.roundRect(ctx, x0, y0, w, h, 8, { fill: AL.alpha(P.muted, 0.04), stroke: P.line });
    AL.text(ctx, Q.title, x0 + 10, y0 + 20, { P, size: 13, weight: 700, color: P.ink });
    // current probabilities
    let pi, rShown;
    if (ph.r < 0) { pi = H[0].pis[j]; rShown = 0; }
    else if (ph.stage === 'move') { const a = H[ph.r].pis[j], b = H[ph.r + 1].pis[j]; pi = a.map((v, k) => AL.lerp(v, b[k], ph.u)); rShown = ph.r; }
    else if (ph.stage === 'hold' || ph.stage === 'end') { pi = H[ph.r + 1].pis[j]; rShown = ph.r + 1; }
    else { pi = H[ph.r].pis[j]; rShown = ph.r; }
    // geometry
    const sx0 = x0 + 12, sx1 = x0 + w - 12, slot = (sx1 - sx0) / K, bw = Math.min(30, slot * 0.42);
    const dotTop = y0 + 34, dotStep = 10, base = dotTop + this.G * dotStep + 128, hMax = 118;
    AL.line(ctx, sx0, base, sx1, base, { color: AL.alpha(P.muted, 0.5) });
    const samples = ph.r >= 0 ? H[ph.r].samples[j] : null;
    const nShown = !samples ? 0 : ph.stage === 'sample' ? Math.min(this.G, Math.floor(ph.u * this.G * 1.15)) : this.G;
    const scored = samples && ph.stage !== 'sample';
    const pRound = ph.r >= 0 ? this.succ(H[ph.r].pis[j], Q.R) : 0;
    for (let k = 0; k < K; k++) {
      const mx = sx0 + slot * (k + 0.5), col = Q.R[k] ? good : grey, hgt = pi[k] * hMax;
      if (pi[k] > 0) { ctx.fillStyle = col; ctx.fillRect(mx - bw / 2, base - Math.max(1.5, hgt), bw, Math.max(1.5, hgt)); }
      else { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = AL.alpha(good, 0.7); ctx.strokeRect(mx - bw / 2, base - 10, bw, 10); ctx.restore(); }
      AL.text(ctx, Q.names[k] + (Q.R[k] ? ' \u2713' : ' \u2717'), mx, base + 15, { P, size: 12, weight: 700, align: 'center', color: Q.R[k] ? good : P.muted });
      AL.text(ctx, Q.subs[k], mx, base + 28, { P, size: 11, italic: true, align: 'center', color: P.muted });
      if (Q.R[k]) AL.text(ctx, pi[k] > 0 ? (ph.stage === 'move' ? '\u2026' : pi[k].toFixed(3)) : '0', mx, base + 43, { P, size: 11.5, weight: 600, align: 'center', color: good });
      // samples of this round, stacked above the column
      let n = 0;
      if (samples) for (let i = 0; i < nShown; i++) if (samples[i] === k) {
        const cy = dotTop + (this.G - 1 - n) * dotStep + 5; n++;
        AL.dot(ctx, mx, cy, 4.2, scored ? (Q.R[k] ? good : grey) : AL.alpha(P.muted, 0.35), null);
      }
      // the push: up for a sampled success, down for a sampled failure
      if (n > 0 && scored && ph.stage !== 'hold' && ph.stage !== 'end') {
        const ax = mx + bw / 2 + 7, ay = base - Math.max(hgt, 24) / 2, len = 22;
        if (Q.R[k]) AL.arrow(ctx, ax, ay + len / 2, ax, ay - len / 2, { color: good, width: 2, head: 6 });
        else AL.arrow(ctx, ax, ay - len / 2, ax, ay + len / 2, { color: P.muted, width: 2, head: 6 });
      }
    }
    // readouts
    const ry = base + 64, pNow = this.succ(pi, Q.R);
    AL.text(ctx, 'success probability p = ' + (ph.stage === 'move' ? '\u2026' : pNow.toFixed(3)), x0 + 12, ry, { P, size: 12.5, weight: 700, color: P.ink });
    if (scored) {
      let c = 0; for (const s of samples) c += Q.R[s];
      AL.text(ctx, 'round ' + (ph.r + 1) + ': ' + c + ' of ' + this.G + ' correct \u00b7 advantage \u2713 +' + (1 - pRound).toFixed(2) + ', \u2717 \u2212' + pRound.toFixed(2),
        x0 + 12, ry + 18, { P, size: w < 400 ? 11 : 12, color: P.muted });
    } else if (ph.r >= 0) AL.text(ctx, 'round ' + (ph.r + 1) + ': sampling\u2026', x0 + 12, ry + 18, { P, size: 12, color: P.muted });
    else AL.text(ctx, 'start, before any update', x0 + 12, ry + 18, { P, size: 12, color: P.muted });
    return rShown;
  },

  draw(t) {
    const ctx = this.ctx, P = this.P, W = this.W, H = this.H, small = W < 560, pad = small ? 8 : 12;
    AL.roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 10, { fill: P.surface, stroke: P.line });
    const ph = this.phase(t), ph2 = 324;
    if (small) { this.panel(0, pad, pad, W - 2 * pad, ph2, ph); this.panel(1, pad, 2 * pad + ph2, W - 2 * pad, ph2, ph); }
    else { const pw = (W - 3 * pad) / 2; this.panel(0, pad, pad, pw, ph2, ph); this.panel(1, 2 * pad + pw, pad, pw, ph2, ph); }
    const capY = small ? 3 * pad + 2 * ph2 + 4 : 2 * pad + ph2 + 6;
    AL.wrap(ctx, this.caption(ph), pad + 4, capY, W - 2 * pad - 8, { P, size: 13, color: P.text, lineH: 1.4 });
  },
});
