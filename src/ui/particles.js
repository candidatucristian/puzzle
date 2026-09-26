export function mountStartParticles({ scope, startScreen, disabled }) {
  const canvas = document.getElementById("start-particles");
  if (!canvas || disabled) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  let w, h;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  scope.on(window, "resize", resize);
  resize();

  function spawn(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 8,
      r: Math.random() * 1.7 + 0.4,
      speed: Math.random() * 0.22 + 0.06,
      sway: Math.random() * Math.PI * 2,
      swayAmp: Math.random() * 0.35 + 0.08,
      alpha: Math.random() * 0.45 + 0.12,
      twinkle: Math.random() * 0.03 + 0.008,
    };
  }

  const motes = [];
  for (let i = 0; i < 44; i++) motes.push(spawn(true));

  let t = 0;
  let animation;
  scope.add(() => cancelAnimationFrame(animation));
  function frame() {
    if (startScreen.classList.contains("hidden")) return; // start screen gone — stop for good
    t++;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      m.y -= m.speed;
      m.x += Math.sin(t * 0.008 + m.sway) * m.swayAmp * 0.35;
      const a = m.alpha * (0.55 + 0.45 * Math.sin(t * m.twinkle * 8 + m.sway));
      ctx.beginPath();
      ctx.fillStyle = "rgba(236, 231, 216, " + Math.max(0, a).toFixed(3) + ")";
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      if (m.y < -8) Object.assign(m, spawn(false));
    }
    animation = requestAnimationFrame(frame);
  }
  frame();
}