/* Shared helpers for blog animations (window.AL), ported from the defense deck's _lib.js.
   Animations draw in CSS pixels on the context the runtime provides; colours come from the blog's
   CSS variables, so every animation follows the light/dark theme. */
window.BlogAnim = window.BlogAnim || { registry: {}, register(name, def) { this.registry[name] = def; } };
(function () {
  // Palette: read the blog's CSS variables (called again whenever the theme changes)
  function palette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
    return {
      ink: v('--ink', '#16325c'), accent: v('--accent', '#1f4f8f'), gold: v('--gold', '#b7862c'),
      bg: v('--bg', '#fbfaf8'), surface: v('--surface', '#ffffff'), text: v('--text', '#1d1c1a'),
      muted: v('--muted', '#5f5a54'), line: v('--line', '#e5e1db'), chip: v('--chip', '#eef2f8'),
      hl: v('--hl-bg', '#fdf6e8'),
      font: v('--sans', 'Inter, system-ui, sans-serif'),
    };
  }
  // '#rrggbb' or '#rgb' -> rgba() with alpha a
  function alpha(hex, a) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  // Seeded xorshift32 in [0, 1). Same sequence as the Python checks scripts.
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const lerp = (a, b, t) => a + (b - a) * t;
  // Piecewise-linear timeline: keys = [[t0, v0], [t1, v1], ...] -> value at t (eased if asked)
  function track(keys, t, eased = false) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) { const u = t1 > t0 ? (t - t0) / (t1 - t0) : 1; return lerp(v0, v1, eased ? ease(u) : u); }
    }
    return keys[keys.length - 1][1];
  }
  function font(P, size, weight = 400, italic = false) {
    return `${italic ? 'italic ' : ''}${weight} ${size}px ${P.font}`;
  }
  function text(ctx, str, x, y, { P, size = 13, color, weight = 400, align = 'left', base = 'alphabetic', italic = false } = {}) {
    ctx.save(); ctx.font = font(P, size, weight, italic); ctx.fillStyle = color || P.text;
    ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(str, x, y); ctx.restore();
  }
  // Greedy word wrap; returns the lines (draws them when draw = true)
  function wrap(ctx, str, x, y, maxW, { P, size = 13, color, weight = 400, lineH = 1.4, draw = true } = {}) {
    ctx.save(); ctx.font = font(P, size, weight);
    const words = str.split(' '), lines = []; let cur = '';
    for (const w of words) { const s = cur ? cur + ' ' + w : w; if (ctx.measureText(s).width > maxW && cur) { lines.push(cur); cur = w; } else cur = s; }
    if (cur) lines.push(cur);
    if (draw) { ctx.fillStyle = color || P.text; ctx.textBaseline = 'top'; lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lineH)); }
    ctx.restore(); return lines;
  }
  function line(ctx, x0, y0, x1, y1, { color, width = 1, dash = null } = {}) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r, { fill = null, stroke = null, width = 1 } = {}) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); } ctx.restore();
  }
  function dot(ctx, x, y, r, fill, stroke = null, width = 1.5) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); } ctx.restore();
  }
  function arrow(ctx, x0, y0, x1, y1, { color, width = 1.5, head = 7, dash = null } = {}) {
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    const a = Math.atan2(y1 - y0, x1 - x0); ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4)); ctx.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  window.AL = { palette, alpha, rng, clamp, ease, lerp, track, font, text, wrap, line, roundRect, dot, arrow };
})();
