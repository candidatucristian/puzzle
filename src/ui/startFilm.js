/** The film behind the title: the manor at night, silent, played round and
 *  round. Its last frame is not its first, so two copies take turns — as one
 *  nears its end the other starts from the top and comes up over it, and the
 *  join is a slow dissolve instead of a cut. Players who asked for stillness
 *  get its first frame. The front door in the film glints and takes the hand:
 *  a click on it goes in, as a click anywhere on the title does. */
const DISSOLVE = 1.4; // seconds; the same as the reels' opacity transition

export function mountStartFilm(scope, preferences) {
  const reels = [...document.querySelectorAll('#start-film .start-reel')];
  if (reels.length < 2) return { stop() {} };
  let now = 0, running = false, stopped = false;
  const still = () => preferences?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const play = reel => reel.play().catch(() => { /* the browser will not start it; its first frame stays */ });

  function handOver() {
    const from = reels[now], to = reels[1 - now];
    now = 1 - now;
    to.currentTime = 0;
    to.classList.add('on');
    from.classList.remove('on');
    play(to);
    scope.later(() => { if (!stopped) from.pause(); }, DISSOLVE * 1000 + 100);
  }
  function tick() {
    const reel = reels[now];
    if (stopped || !running || !reel.duration) return;
    if (reel.duration - reel.currentTime <= DISSOLVE) handOver();
  }
  function start() {
    if (stopped) return;
    reels[now].classList.add('on');
    running = !still();
    if (running) play(reels[now]);
    else for (const reel of reels) reel.pause();
  }
  for (const reel of reels) {
    reel.muted = true; reel.loop = false;
    scope.on(reel, 'timeupdate', tick);
    // should a reel ever reach its end anyway, the other takes over at once
    scope.on(reel, 'ended', () => { if (running && reel === reels[now]) handOver(); });
  }
  // The front door's place in the film, kept over it however the film is
  // fitted into the screen.
  const door = document.getElementById('start-door'), film = document.getElementById('start-film');
  const DOOR = { x: 0.5, y: 0.82, w: 0.066, h: 0.2 }; // as shares of the film
  function placeDoor() {
    if (!door || !film) return;
    const box = film.getBoundingClientRect();
    // The film is shown whole. Where the screen is a little wider or taller
    // than it, it is drawn out to fill (up to a tenth, which the eye does not
    // catch) rather than leave bands of dark; beyond that, bands it is.
    const fit = Math.min(box.width / 1280, box.height / 720), STRETCH = 1.1;
    const w = Math.min(box.width, 1280 * fit * STRETCH), h = Math.min(box.height, 720 * fit * STRETCH);
    const left = (box.width - w) / 2, top = (box.height - h) / 2;
    for (const reel of reels) Object.assign(reel.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' });
    Object.assign(door.style, {
      left: left + (DOOR.x - DOOR.w / 2) * w + 'px', top: top + (DOOR.y - DOOR.h / 2) * h + 'px',
      width: DOOR.w * w + 'px', height: DOOR.h * h + 'px',
    });
  }
  placeDoor();
  scope.on(window, 'resize', placeDoor);
  glint(scope, door, still, () => stopped);
  if (film && typeof ResizeObserver === 'function') {
    const watch = new ResizeObserver(placeDoor);
    watch.observe(film);
    scope.add(() => watch.disconnect());
  }
  if (preferences?.subscribe) scope.add(preferences.subscribe(start));
  start();
  return {
    /** The title is gone: the film stops and lets go of the screen. */
    stop() {
      stopped = true; running = false;
      for (const reel of reels) reel.pause();
    },
  };
}

// The same glint the doors inside the house have (shared/movableSparkles.js),
// drawn here on a canvas because the title is not part of the game's picture:
// three stars standing at the door's edges, pulsing in turn, and small ones
// that light somewhere on it, drift up a little and go out.
// (the canvas it draws on sits over the thing, 40px out round it; the start
// door's by default, or any other given)
export function glint(scope, door, still, done, canvas = document.getElementById('start-door-glint')) {
  if (!door || !canvas) return;
  const ctx = canvas.getContext('2d'), PAD = 40, EDGE = 4;
  const particles = Array.from({ length: 12 }, () => ({ age: 1, life: 1, x: 0, y: 0, dx: 0, rise: 0, size: 0 }));
  let wait = 0, last = 0, frame = 0;
  const star = (x, y, radius, alpha) => {
    const line = (width, colour, a, pts) => {
      ctx.lineWidth = width; ctx.strokeStyle = colour; ctx.globalAlpha = a;
      ctx.beginPath();
      for (const [x0, y0, x1, y1] of pts) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
      ctx.stroke();
    };
    line(Math.max(0.6, radius * 0.22), '#ffe8b5', alpha, [[x - radius, y, x + radius, y], [x, y - radius, x, y + radius]]);
    const d = radius * 0.62;
    line(Math.max(0.35, radius * 0.12), '#ffffff', alpha * 0.7, [[x - d, y - d, x + d, y + d], [x + d, y - d, x - d, y + d]]);
  };
  function draw(time) {
    if (done()) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    frame = requestAnimationFrame(draw);
    const w = door.clientWidth, h = door.clientHeight;
    if (!w || !h) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round((w + PAD * 2) * ratio) || canvas.height !== Math.round((h + PAD * 2) * ratio)) {
      canvas.width = Math.round((w + PAD * 2) * ratio); canvas.height = Math.round((h + PAD * 2) * ratio);
      canvas.style.width = w + PAD * 2 + 'px'; canvas.style.height = h + PAD * 2 + 'px';
    }
    const dt = Math.min(time - last || 16, 100);
    last = time;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w + PAD * 2, h + PAD * 2);
    ctx.globalCompositeOperation = 'lighter';
    const box = { x: PAD, y: PAD, width: w, height: h }, quiet = still();
    [[box.x - EDGE, box.y + box.height * 0.22], [box.x + box.width + EDGE, box.y + box.height * 0.42], [box.x + box.width * 0.72, box.y - EDGE]]
      .forEach(([x, y], index) => {
        const pulse = quiet ? 0.18 : 0.18 + 0.38 * Math.max(0, Math.sin(time / 380 + index * 2.1));
        star(x, y, 2.2 + pulse * 2.1, pulse);
      });
    if (quiet) { for (const p of particles) p.age = p.life; ctx.globalAlpha = 1; return; }
    wait -= dt;
    if (wait <= 0) {
      const p = particles.find(item => item.age >= item.life);
      if (p) {
        p.age = 0; p.life = 480 + Math.random() * 440;
        p.x = box.x + Math.random() * box.width; p.y = box.y + Math.random() * box.height;
        p.dx = (Math.random() - 0.5) * 12; p.rise = 9 + Math.random() * 15; p.size = 1.6 + Math.random() * 1.8;
      }
      wait = 90 + Math.random() * 120;
    }
    for (const p of particles) {
      if (p.age >= p.life) continue;
      p.age = Math.min(p.life, p.age + dt);
      const k = p.age / p.life;
      star(p.x + p.dx * k, p.y - p.rise * k, p.size * (1 - k * 0.35), Math.sin(k * Math.PI) * 0.78);
    }
    ctx.globalAlpha = 1;
  }
  frame = requestAnimationFrame(draw);
  scope.add(() => cancelAnimationFrame(frame));
}
