/* Part 6, "Why vanilla GRPO fails": the picture to keep in mind. Simulated and illustrative.

   One training batch of 12 prompts. Each prompt is its own pass/fail model with one logit z and
   success probability p = 1 / (1 + e^-z); no parameters are shared between prompts. Each round draws a
   group of G = 8 responses per prompt (xorshift32, seed 20261120, the same generator as AL.rng and
   checks/part06_checks.py; prompts in order, 8 draws each, a response is correct when u < p), and
   applies Part 5's group advantage with the population standard deviation, followed by one
   policy-gradient step with step size 2:
       z += 2 * (1/8) * sum_i A_i (R_i - p) = 2 * sqrt(k (8 - k)) / 8   for k of 8 correct, 0 < k < 8,
   and no change when the group is all wrong or all correct. The seed was chosen by search for a run
   that shows the typical behaviour (see the post). checks/part06_checks.py in llm-post-training-notes
   runs the same simulation and recomputes every printed number. */
BlogAnim.register('part-06-failure-map', {
  SEED: 20261120, ETA: 2, G: 8, ROUNDS: 10,
  T0: 2.4, SAMPLE: 0.9, SCORE: 0.8, MOVE: 0.8, HOLD: 0.7,
  P0: [1e-6, 1e-4, 0.005, 0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 0.85, 0.95],
  LABELS: ['10\u207b\u2076', '10\u207b\u2074', '0.005', '0.02', '0.05', '0.1', '0.2', '0.35', '0.5', '0.7', '0.85', '0.95'],
  get per() { return this.SAMPLE + this.SCORE + this.MOVE + this.HOLD; },
  get duration() { return this.T0 + this.ROUNDS * this.per + 1.2; },
  get stops() { const s = [this.T0 - 0.01]; for (let r = 1; r <= this.ROUNDS; r++) s.push(this.T0 + r * this.per - 0.01); s.push(this.duration); return s; },

  height(W) { return W < 560 ? 846 : 548; },

  sig(z) { return 1 / (1 + Math.exp(-z)); },
  mount() {
    if (this.H_) return;
    const rnd = AL.rng(this.SEED), G = this.G, n = this.P0.length;
    let z = this.P0.map(p => Math.log(p / (1 - p)));
    this.H_ = [];
    for (let r = 0; r < this.ROUNDS; r++) {
      const p = z.map(v => this.sig(v)), o = [], k = [];
      for (let i = 0; i < n; i++) {
        const oi = []; for (let j = 0; j < G; j++) oi.push(rnd() < p[i] ? 1 : 0);
        o.push(oi); k.push(oi.reduce((a, b) => a + b, 0));
      }
      const reg = k.map(v => (v === 0 ? 'W' : v === G ? 'C' : 'M'));
      const nW = reg.filter(v => v === 'W').length, nM = reg.filter(v => v === 'M').length, nC = n - nW - nM;
      this.H_.push({ p, o, k, reg, nW, nM, nC });
      z = z.map((v, i) => (k[i] > 0 && k[i] < G ? v + this.ETA * Math.sqrt(k[i] * (G - k[i])) / G : v));
    }
    this.H_.push({ p: z.map(v => this.sig(v)) });
    window.__part06History = this.H_;   // for tests: compare with checks/part06_checks.py
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
  fmtP(p) { return p < 0.0005 ? 'p < 0.001' : 'p = ' + p.toFixed(3); },
  colors() {
    const P = this.P;
    return { W: AL.alpha(P.muted, 0.55), M: P.accent, C: P.gold };
  },

  caption(ph) {
    const H = this.H_, G = this.G, n = this.P0.length, R = this.ROUNDS;
    const found = H.findIndex(h => h.k && h.k[3] > 0);
    if (ph.r < 0) return 'Twelve prompts, from never solved (left, top) to almost always solved (right, bottom). Each has its own success probability p and no shared parameters. Each round samples 8 responses per prompt and applies Part 5\u2019s group advantage: only mixed groups move.';
    const h = H[ph.r];
    if (ph.stage === 'sample') return 'Round ' + (ph.r + 1) + ': sampling 8 responses per prompt (\u2713 correct, \u2717 wrong)\u2026';
    if (ph.stage === 'end') {
      const last = H[R - 1];
      return 'After ' + R + ' rounds, ' + (last.nW + last.nC) + ' of ' + n + ' groups carry no signal (' + last.nC + ' all correct, ' + last.nW + ' all wrong). The prompt that started at 0.02 reached ' + H[R].p[3].toFixed(3) + ' after its first success. The three that started at 10\u207b\u2076, 10\u207b\u2074 and 0.005 never produced a success and never moved: no reweighting of the signal can reach them.';
    }
    if (ph.r === 0) return 'Round 1: ' + h.nM + ' of ' + n + ' groups are mixed and carry signal (' + (h.nM * G) + ' of ' + (n * G) + ' rollouts). ' + h.nW + ' groups are all wrong: every advantage is 0, so those prompts get no update at all.';
    if (ph.r === found) return 'Round ' + (ph.r + 1) + ': the prompt that started at 0.02 gets its first success. Alone in its group, it earns the largest advantage, and the prompt starts to move. The hardest three are still untouched.';
    return 'Round ' + (ph.r + 1) + ': ' + h.nM + ' mixed, ' + h.nC + ' all correct, ' + h.nW + ' all wrong. Easy prompts freeze once their groups are all correct, with a few percent of probability still on wrong answers; the share of rollouts that carry signal keeps falling.';
  },

  header(x0, y0, w, ph) {
    const ctx = this.ctx, P = this.P, H = this.H_, G = this.G, n = this.P0.length, C = this.colors(), small = w < 520;
    const h = ph.r >= 0 && ph.stage !== 'sample' ? H[ph.r] : null;
    const t1 = h ? (small ? 'Round ' + (ph.r + 1) + ': signal in ' + h.nM + ' of ' + n + ' groups, ' + (h.nM * G) + ' of ' + (n * G) + ' rollouts'
      : 'Round ' + (ph.r + 1) + ': groups with signal ' + h.nM + ' of ' + n + ' \u00b7 rollouts with signal ' + (h.nM * G) + ' of ' + (n * G))
      : ph.r < 0 ? (small ? 'One batch: 12 prompts \u00d7 8 responses' : 'One batch: 12 prompts \u00d7 a group of 8 responses') : 'Round ' + (ph.r + 1) + ': sampling\u2026';
    AL.text(ctx, t1, x0, y0 + 16, { P, size: small ? 11.5 : 13.5, weight: 700, color: P.ink });
    const items = [['all wrong', C.W], ['mixed (learns)', C.M], ['all correct', C.C]];
    let x = x0; const ly = y0 + 36;
    ctx.save(); ctx.font = AL.font(P, 11.5);
    for (const [s, col] of items) {
      AL.roundRect(ctx, x, ly - 9, 14, 11, 3, { stroke: col, width: 2.5 });
      AL.text(ctx, s, x + 19, ly, { P, size: 11.5, color: P.muted });
      x += 19 + ctx.measureText(s).width + 16;
    }
    ctx.restore();
  },

  cell(i, x0, y0, w, h, ph) {
    const ctx = this.ctx, P = this.P, H = this.H_, G = this.G, C = this.colors();
    let p;
    if (ph.r < 0) p = H[0].p[i];
    else if (ph.stage === 'move') p = AL.lerp(H[ph.r].p[i], H[ph.r + 1].p[i], ph.u);
    else if (ph.stage === 'hold' || ph.stage === 'end') p = H[ph.r + 1].p[i];
    else p = H[ph.r].p[i];
    const hr = ph.r >= 0 ? H[ph.r] : null, scored = hr && ph.stage !== 'sample';
    const reg = scored ? hr.reg[i] : null, col = reg ? C[reg] : P.line;
    const fade = ph.stage === 'score' ? ph.u : 1;
    AL.roundRect(ctx, x0, y0, w, h, 7, { fill: reg === 'M' ? AL.alpha(P.accent, 0.07 * fade) : AL.alpha(P.muted, 0.03), stroke: col, width: reg ? 1 + 1.6 * fade : 1 });
    AL.text(ctx, 'start ' + this.LABELS[i], x0 + 8, y0 + 16, { P, size: 11, color: P.muted });
    AL.text(ctx, this.fmtP(p), x0 + w - 8, y0 + 16, { P, size: 11.5, weight: 700, align: 'right', color: P.ink });
    const bx = x0 + 8, bw = w - 16, by = y0 + 24;
    AL.roundRect(ctx, bx, by, bw, 6, 3, { fill: AL.alpha(P.muted, 0.15) });
    const pw = bw * p;
    if (pw >= 6) AL.roundRect(ctx, bx, by, pw, 6, 3, { fill: P.accent });
    else if (pw >= 0.5) { ctx.fillStyle = P.accent; ctx.fillRect(bx, by, Math.max(1.5, pw), 6); }
    const slot = (w - 16) / G, cw = Math.min(16, slot - 3), cy = y0 + 38;
    const nShown = !hr ? 0 : ph.stage === 'sample' ? Math.min(G, Math.floor(ph.u * G * 1.2)) : G;
    for (let j = 0; j < G; j++) {
      const mx = x0 + 8 + slot * (j + 0.5);
      if (j >= nShown) { AL.roundRect(ctx, mx - cw / 2, cy, cw, cw, 3, { stroke: AL.alpha(P.muted, 0.25) }); continue; }
      const ok = hr.o[i][j] === 1;
      AL.roundRect(ctx, mx - cw / 2, cy, cw, cw, 3, { fill: ok ? P.accent : AL.alpha(P.muted, 0.3) });
      AL.text(ctx, ok ? '\u2713' : '\u2717', mx, cy + cw / 2 + 0.5, { P, size: 10, weight: 700, align: 'center', base: 'middle', color: ok ? P.surface : P.text });
    }
    if (scored) {
      const s = reg === 'W' ? 'all wrong: no update' : reg === 'C' ? 'all correct: frozen' : hr.k[i] + ' of 8 correct: learns';
      AL.text(ctx, s, x0 + 8, y0 + h - 8, { P, size: 10.5, weight: reg === 'M' ? 700 : 400, color: reg === 'M' ? P.accent : P.muted });
    }
  },

  strip(x0, y0, w, h, ph) {
    const ctx = this.ctx, P = this.P, H = this.H_, n = this.P0.length, R = this.ROUNDS, C = this.colors();
    AL.roundRect(ctx, x0, y0, w, h, 8, { fill: AL.alpha(P.muted, 0.04), stroke: P.line });
    AL.text(ctx, w < 520 ? 'Groups per round' : 'Groups per round: all wrong (bottom), mixed, all correct (top)', x0 + 10, y0 + 18, { P, size: 12, weight: 700, color: P.ink });
    const sx0 = x0 + 10, slot = (w - 20) / R, top = y0 + 28, base = y0 + h - 18, unit = (base - top) / n;
    const done = ph.r < 0 ? 0 : ph.stage === 'sample' ? ph.r : ph.r + 1;
    for (let r = 0; r < R; r++) {
      const mx = sx0 + slot * (r + 0.5), bw = Math.min(26, slot * 0.55);
      AL.text(ctx, String(r + 1), mx, y0 + h - 5, { P, size: 10.5, align: 'center', color: P.muted });
      if (r >= done) { AL.roundRect(ctx, mx - bw / 2, top, bw, base - top, 3, { stroke: AL.alpha(P.muted, 0.2) }); continue; }
      const hr = H[r]; let y = base;
      for (const [key, cnt] of [['W', hr.nW], ['M', hr.nM], ['C', hr.nC]]) {
        if (!cnt) continue;
        ctx.fillStyle = C[key]; ctx.fillRect(mx - bw / 2, y - cnt * unit, bw, cnt * unit - 1); y -= cnt * unit;
      }
      const yM = base - (hr.nW + hr.nM / 2) * unit;
      if (hr.nM) AL.text(ctx, String(hr.nM), mx, yM, { P, size: 10.5, weight: 700, align: 'center', base: 'middle', color: P.surface });
    }
  },

  draw(t) {
    const ctx = this.ctx, P = this.P, W = this.W, small = W < 560, pad = small ? 8 : 12;
    AL.roundRect(ctx, 0.5, 0.5, W - 1, this.H - 1, 10, { fill: P.surface, stroke: P.line });
    const ph = this.phase(t), cols = small ? 2 : 4, rows = 12 / cols, gap = small ? 6 : 8, ch = 84;
    this.header(pad + 2, pad, W - 2 * pad, ph);
    const gy = pad + 48, cw = (W - 2 * pad - (cols - 1) * gap) / cols;
    for (let i = 0; i < 12; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      this.cell(i, pad + c * (cw + gap), gy + r * (ch + gap), cw, ch, ph);
    }
    const sy = gy + rows * (ch + gap) + 2, sh = 112;
    this.strip(pad, sy, W - 2 * pad, sh, ph);
    AL.wrap(ctx, this.caption(ph), pad + 4, sy + sh + 10, W - 2 * pad - 8, { P, size: 13, color: P.text, lineH: 1.4 });
  },
});
