/* Blog animation runtime, ported from the animation manager of the defense deck (deck.js).

   A post opts in with `anim: true` in its front matter and embeds
     <div class="anim" data-anim="part-01-microscope" data-alt="text description"></div>
   The runtime loads assets/js/anim/<data-anim>.js (once), which registers
     BlogAnim.register('part-01-microscope', {
       duration: 17,                // seconds; the animation stops on its last frame
       stops: [0, 5.5, 10.5, 17],   // optional: times the Step button jumps between
       height(W) { return 480; },   // CSS height for a given CSS width
       mount(opts) {},              // optional: build state; this.W, this.H, this.ctx are set
       draw(t) {},                  // draw the frame at time t (a pure function of t)
       label(t) { return ''; },     // optional: text shown next to the buttons
     });
   Draw in CSS pixels; this.P holds the palette (AL.palette()), refreshed when the theme changes.
   Behaviour: starts when scrolled into view, pauses off-screen, play/pause, step and restart buttons,
   high-DPI canvas, redraws on resize and theme change, and shows the final frame without playing
   when the reader prefers reduced motion. */
(function () {
  const BA = window.BlogAnim = window.BlogAnim || { registry: {}, register(n, d) { this.registry[n] = d; } };
  const script = document.currentScript;
  const base = script ? script.src.replace(/runtime\.js(\?.*)?$/, '') : '';
  const query = script ? (script.src.match(/\?.*$/) || [''])[0] : '';   // cache-busting tag, reused for animation files
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = [];
  const loading = {};

  function load(name) {
    if (BA.registry[name]) return Promise.resolve();
    if (!/^[a-z0-9-]+$/.test(name)) return Promise.reject(new Error('bad animation name ' + name));
    if (!loading[name]) loading[name] = new Promise((ok, fail) => {
      const s = document.createElement('script'); s.src = base + name + '.js' + query; s.onload = ok;
      s.onerror = () => fail(new Error('could not load ' + s.src)); document.head.appendChild(s);
    });
    return loading[name];
  }

  function size(inst) {
    const box = inst.box, c = inst.canvas, dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = Math.max(280, Math.round(box.clientWidth));
    const H = Math.round(inst.def.height ? inst.def.height.call(inst, W) : W * 0.62);
    c.style.height = H + 'px'; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    inst.ctx = c.getContext('2d'); inst.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (inst.W !== W || inst.H !== H) { inst.W = W; inst.H = H; inst.mount && inst.mount(inst.opts); }
  }

  function render(inst) {
    const ctx = inst.ctx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, inst.canvas.width, inst.canvas.height); ctx.restore();
    inst.draw(inst.t);
    sync(inst);
  }

  function play(inst) {
    if (inst.t >= inst.duration - 1e-6) inst.t = 0;   // replay from the start
    inst.running = true; cancelAnimationFrame(inst.raf); let last = performance.now();
    const loop = now => {
      if (!inst.running) return;
      inst.t = Math.min(inst.duration, inst.t + Math.max(0, Math.min(0.05, (now - last) / 1000))); last = now;
      render(inst);
      if (inst.t >= inst.duration) { inst.running = false; sync(inst); return; }
      inst.raf = requestAnimationFrame(loop);
    };
    inst.raf = requestAnimationFrame(loop); sync(inst);
  }
  function pause(inst) { inst.running = false; cancelAnimationFrame(inst.raf); sync(inst); }
  function seek(inst, t) { pause(inst); inst.t = Math.max(0, Math.min(inst.duration, t)); render(inst); }
  function step(inst) {
    const stops = inst.stops && inst.stops.length ? inst.stops : null;
    if (stops) {
      const next = stops.find(s => s > inst.t + 1e-3);
      seek(inst, next === undefined ? stops[0] : next);
    } else seek(inst, inst.t >= inst.duration - 1e-6 ? 0 : Math.min(inst.duration, inst.t + 1));
  }

  function sync(inst) {
    const k = inst.ctl; if (!k) return;
    const done = !inst.running && inst.t >= inst.duration - 1e-6;
    k.play.textContent = inst.running ? 'Pause' : done ? 'Replay' : 'Play';
    k.play.setAttribute('aria-pressed', inst.running ? 'true' : 'false');
    k.lab.textContent = inst.label ? inst.label(inst.t) : '';
  }

  function controls(inst) {
    const bar = document.createElement('div'); bar.className = 'anim-ctl';
    bar.innerHTML = '<button type="button" class="play"></button><button type="button" class="step">Step</button>' +
      '<button type="button" class="restart">Restart</button><span class="lab" aria-live="polite"></span>';
    inst.box.appendChild(bar);
    const q = s => bar.querySelector(s);
    inst.ctl = { play: q('.play'), lab: q('.lab') };
    q('.play').onclick = () => { inst.userPaused = inst.running; inst.running ? pause(inst) : play(inst); };
    q('.step').onclick = () => { inst.userPaused = true; step(inst); };
    q('.restart').onclick = () => { inst.userPaused = false; seek(inst, 0); play(inst); };
  }

  function start(box) {
    const name = box.dataset.anim, def = BA.registry[name];
    if (!def) { console.warn('missing animation', name); return; }
    const inst = Object.create(def);
    inst.def = def; inst.box = box; inst.duration = def.duration || 10; inst.t = 0;
    inst.opts = box.dataset.opts ? JSON.parse(box.dataset.opts) : {};
    inst.P = window.AL.palette();
    const c = document.createElement('canvas'); c.setAttribute('role', 'img');
    c.setAttribute('aria-label', box.dataset.alt || 'Animation'); box.appendChild(c); inst.canvas = c;
    controls(inst); size(inst);
    inst.t = reduce ? inst.duration : 0; render(inst);
    live.push(inst);
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { if (!inst.running && !inst.userPaused && inst.t < inst.duration) play(inst); }
        else if (inst.running) pause(inst);   // off-screen: pause, resume when visible again
      }), { threshold: 0.4 }).observe(box);
    }
    if ('ResizeObserver' in window) {
      let w = box.clientWidth;
      new ResizeObserver(() => { if (Math.abs(box.clientWidth - w) > 1) { w = box.clientWidth; size(inst); render(inst); } }).observe(box);
    }
  }

  function restyle() { live.forEach(i => { i.P = window.AL.palette(); render(i); }); }
  new MutationObserver(restyle).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', restyle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(restyle);  // web font arrived: redraw text

  function init() {
    document.querySelectorAll('div.anim[data-anim]').forEach(box => {
      load(box.dataset.anim).then(() => start(box)).catch(e => console.warn(e.message));
    });
  }
  // For screenshots and tests: BlogAnim.seek(t) shows every animation on the page at time t
  BA.seek = t => live.forEach(i => seek(i, t));
  BA.live = live;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
