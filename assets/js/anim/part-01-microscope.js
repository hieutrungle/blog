/* Part 1, "pass@k microscope": sampling more reveals rare successes.

   Five problems with single-sample success probability p = 0.4, 0.1, 0.05, 0.01, 0.001.
   For each problem, 20 independent evaluation runs are simulated. Each thin row is one run that draws
   k samples; it is grey until its first correct sample and coloured after it. Rows are sorted by
   when they first succeed, so the coloured share of a lane at the cursor is the simulated pass@k,
   and the dark line is the exact pass@k = 1 - (1 - p)^k.
   The first correct sample of a run is geometric: k_first = floor(ln(u) / ln(1 - p)) + 1, with
   u drawn from the seeded xorshift32 in lib.js. checks/part01_checks.py in llm-post-training-notes
   re-runs this simulation with the same seed and checks the counts the post quotes. */
BlogAnim.register('part-01-microscope', {
  duration: 21,
  stops: [1, 6.5, 11, 18],
  PS: [0.4, 0.1, 0.05, 0.01, 0.001],
  RUNS: 20,
  SEED: 20261242,
  // log2 k over time (-1 means no sample yet): the first sample, then holds at k = 1, 16, 64, 1024
  KEYS: [[0, -1], [1, 0], [3.5, 0], [6.5, 4], [9, 4], [11, 6], [14, 6], [18, 10], [21, 10]],
  HOLDS: [[1, 3.5], [6.5, 9], [11, 14], [18, 21.01]],

  height(W) { return W < 520 ? 588 : 540; },

  mount() {
    const r = AL.rng(this.SEED);
    this.hits = this.PS.map(p => {
      const h = [];
      for (let i = 0; i < this.RUNS; i++) h.push(Math.floor(Math.log(1 - r()) / Math.log(1 - p)) + 1);
      return h.sort((a, b) => a - b);
    });
    // time at which the cursor reaches k (for the flash when a success appears)
    this.tOf = k => {
      let lo = 0, hi = this.duration;
      if (this.kOf(hi) < k) return Infinity;
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (this.kOf(m) >= k) hi = m; else lo = m; }
      return hi;
    };
    this.hitT = this.hits.map(h => h.map(k => this.tOf(k)));
  },
  v(t) { return AL.track(this.KEYS, t, true); },               // continuous log2 k
  kOf(t) { return Math.floor(Math.pow(2, this.v(t)) + 1e-9); }, // integer k
  pass(p, k) { return k < 1 ? 0 : 1 - Math.pow(1 - p, k); },
  pct(x) { return x >= 0.9995 ? '>99.9%' : (100 * x).toFixed(1) + '%'; },  // never print 100% for p < 1

  caption(t) {
    const f = (p, k) => this.pct(this.pass(p, k));
    const grey = this.hits[4].filter(h => h > 1024).length;
    const caps = [
      'k = 1: one sample per problem. The common problem (p = 0.4) is solved in about 40% of runs; the rarer problems are almost never solved.',
      `k = 16: p = 0.1 and p = 0.05 are now solved in most runs (${f(0.1, 16)} and ${f(0.05, 16)}). p = 0.01 is still rarely seen (${f(0.01, 16)}).`,
      `k = 64: p = 0.01 is solved in about half the runs (${f(0.01, 64)}). p = 0.001 still looks unsolvable (${f(0.001, 64)}).`,
      `k = 1024: even p = 0.001 is solved in most runs (${f(0.001, 1024)}). Its ${grey} grey rows saw no correct answer in 1,024 samples, although p = 0.001.`,
    ];
    const i = this.HOLDS.findIndex(([a, b]) => t >= a && t < b);
    if (i >= 0) return { text: caps[i], a: AL.clamp((t - this.HOLDS[i][0]) / 0.4, 0, 1) };
    if (t < this.HOLDS[0][0]) return { text: 'Each row is one evaluation run of the same problem. Watch the first sample arrive.', a: 0.75 };
    return { text: 'Drawing more samples per problem: rare successes start to appear.', a: 0.75 };
  },

  label(t) { return 'k = ' + this.kOf(t); },

  draw(t) {
    const ctx = this.ctx, P = this.P, W = this.W, small = W < 520;
    const pad = 12, readW = small ? 62 : 118, labSize = small ? 12 : 13;
    ctx.save(); ctx.font = AL.font(P, labSize, 600);
    const labelW = Math.ceil(ctx.measureText('p = 0.001').width) + 16; ctx.restore();
    const x0 = pad + labelW, x1 = W - pad - readW;
    // position after k samples: k = 1 sits one step right of the lane start (0 samples)
    const v = this.v(t), k = this.kOf(t), xOf = lk => x0 + (x1 - x0) * (lk + 1) / 11;
    const xc = xOf(v);

    // background
    AL.roundRect(ctx, 0.5, 0.5, W - 1, this.H - 1, 10, { fill: P.surface, stroke: P.line });

    // header: k readout and legend
    AL.text(ctx, `k = ${k}`, pad + 2, 30, { P, size: 20, weight: 600, color: P.ink });
    ctx.save(); ctx.font = AL.font(P, 20, 600); const kw = ctx.measureText(`k = ${k}`).width; ctx.restore();
    AL.text(ctx, k === 1 ? 'sample per problem' : 'samples per problem', pad + 2 + kw + 8, 30, { P, size: 13, color: P.muted });
    const legend = [
      ['bar', AL.alpha(P.muted, 0.28), 'no correct sample yet'],
      ['bar', P.accent, 'solved: at least one correct'],
      ['line', P.text, 'exact pass@k'],
    ];
    let lx = pad + 2, ly = 52;
    ctx.save(); ctx.font = AL.font(P, 12);
    for (const [kind, col, lab] of legend) {
      const w = 20 + 6 + ctx.measureText(lab).width + 16;
      if (lx + w > W - pad) { lx = pad + 2; ly += 18; }
      if (kind === 'bar') ctx.fillStyle = col, ctx.fillRect(lx, ly - 7, 20, 6);
      else AL.line(ctx, lx, ly - 4, lx + 20, ly - 4, { color: col, width: 2 });
      AL.text(ctx, lab, lx + 26, ly, { P, size: 12, color: P.muted });
      lx += w;
    }
    ctx.restore();

    // lanes
    const top = ly + 18, laneH = 60, gap = 14, rowH = laneH / this.RUNS;
    const ticks = [1, 4, 16, 64, 256, 1024];
    const bottomAll = top + this.PS.length * (laneH + gap) - gap;
    for (const tk of ticks) AL.line(ctx, xOf(Math.log2(tk)), top - 4, xOf(Math.log2(tk)), bottomAll + 4, { color: AL.alpha(P.muted, 0.18), width: 1 });

    this.PS.forEach((p, li) => {
      const y0 = top + li * (laneH + gap), yb = y0 + laneH, hits = this.hits[li];
      AL.text(ctx, `p = ${p}`, x0 - 10, y0 + laneH / 2, { P, size: labSize, weight: 600, align: 'right', base: 'middle', color: P.text });
      // runs: row 0 at the bottom holds the earliest first success
      hits.forEach((h, i) => {
        const y = yb - (i + 1) * rowH + 0.4, hgt = rowH - 0.8;
        const xh = h === 1 ? x0 : xOf(Math.log2(h - 1));   // the hit's own sample is coloured
        if (h <= k) {
          if (xh > x0) { ctx.fillStyle = AL.alpha(P.muted, 0.28); ctx.fillRect(x0, y, xh - x0, hgt); }
          ctx.fillStyle = P.accent; ctx.fillRect(xh, y, Math.max(0, xc - xh), hgt);
        } else { ctx.fillStyle = AL.alpha(P.muted, 0.28); ctx.fillRect(x0, y, xc - x0, hgt); }
      });
      // flash where a success has just appeared
      hits.forEach((h, i) => {
        const age = t - this.hitT[li][i];
        if (h <= k && age >= 0 && age < 0.9) {
          const a = 1 - age / 0.9, y = yb - (i + 0.5) * rowH;
          AL.dot(ctx, xOf(Math.log2(h)), y, 1.5 + 3 * a, AL.alpha(P.gold, 0.9 * a));
        }
      });
      // exact pass@k curve up to the cursor
      ctx.save(); ctx.strokeStyle = P.text; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(x0, yb);
      if (v > 0) {
        const steps = Math.max(2, Math.ceil((xc - xOf(0)) / 2));
        for (let s = 0; s <= steps; s++) { const lk = v * s / steps; ctx.lineTo(xOf(lk), yb - this.pass(p, Math.pow(2, lk)) * laneH); }
      } else ctx.lineTo(xc, yb - (v > -1 ? (v + 1) * p * laneH : 0));
      ctx.stroke(); ctx.restore();
      const yEnd = v > 0 ? this.pass(p, Math.pow(2, v)) : Math.max(0, v + 1) * p;
      AL.dot(ctx, xc, yb - yEnd * laneH, 3, P.text);
      AL.roundRect(ctx, x0, y0, x1 - x0, laneH, 3, { stroke: AL.alpha(P.muted, 0.35), width: 1 });
      // readout
      const solved = hits.filter(h => h <= k).length, rx = x1 + 12;
      AL.text(ctx, small ? `${solved}/${this.RUNS}` : `${solved} of ${this.RUNS} runs`, rx, y0 + laneH / 2 - 9, { P, size: 12, weight: 600, color: P.accent, base: 'middle' });
      AL.text(ctx, small ? this.pct(this.pass(p, k)) : `pass@k ${this.pct(this.pass(p, k))}`, rx, y0 + laneH / 2 + 9, { P, size: 12, color: P.text, base: 'middle' });
    });

    // cursor and axis
    AL.line(ctx, xc, top - 6, xc, bottomAll + 6, { color: P.ink, width: 1.5 });
    for (const tk of ticks) AL.text(ctx, String(tk), xOf(Math.log2(tk)), bottomAll + 20, { P, size: 12, align: 'center', color: P.muted });
    AL.text(ctx, 'samples per problem, k (log scale)', (x0 + x1) / 2, bottomAll + 38, { P, size: 12, align: 'center', color: P.muted });
    if (!small) AL.text(ctx, 'simulated runs', x1 + 12, top - 8, { P, size: 11, color: P.muted, italic: true });

    // caption
    const cap = this.caption(t);
    ctx.save(); ctx.globalAlpha = cap.a;
    AL.wrap(ctx, cap.text, pad + 2, bottomAll + 54, W - 2 * pad - 4, { P, size: 13.5, color: P.text, lineH: 1.45 });
    ctx.restore();
  },
});
