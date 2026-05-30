/**
 * GSAP scroll reveals & micro-interactions — loaded only when GSAP is available.
 */
export function initMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    return;
  }

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    fallbackReveal();
    initCursorGlow();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray('.reveal').forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 36 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay: (i % 4) * 0.06,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  gsap.utils.toArray('.pricing-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateY: x * 8,
        rotateX: -y * 8,
        transformPerspective: 900,
        duration: 0.35,
        ease: 'power2.out',
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power2.out' });
    });
  });

  initCursorGlow();
  initParticles();
}

function fallbackReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function initCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow || window.matchMedia('(pointer: coarse)').matches) return;

  window.addEventListener(
    'mousemove',
    (e) => {
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    },
    { passive: true }
  );
}

function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w;
  let h;
  const dots = Array.from({ length: 40 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 2,
    vx: (Math.random() - 0.5) * 0.0004,
    vy: (Math.random() - 0.5) * 0.0004,
  }));

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = Math.min(600, window.innerHeight);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(192, 94, 30, 0.35)';
    dots.forEach((d) => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > 1) d.vx *= -1;
      if (d.y < 0 || d.y > 1) d.vy *= -1;
      ctx.beginPath();
      ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  frame();
}
