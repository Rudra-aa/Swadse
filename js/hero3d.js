/**
 * Hero 3D — floating "माँ" calligraphy (replaces torus knot).
 */
const MAA_TEXTURE_URL = 'assets/maa-hero.png';

function loadTexture(THREE, url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

export async function initHero3D() {
  const container = document.getElementById('hero-3d');
  if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    container.setAttribute('aria-label', 'Decorative 3D माँ calligraphy');

    scene.add(new THREE.AmbientLight(0xfff5eb, 0.9));
    const keyLight = new THREE.DirectionalLight(0xffe8cc, 0.85);
    keyLight.position.set(2, 4, 5);
    scene.add(keyLight);

    const texture = await loadTexture(THREE, MAA_TEXTURE_URL);
    const imgAspect = texture.image.width / texture.image.height;
    const planeHeight = 2.6;
    const planeWidth = planeHeight * imgAspect;

    const maaGroup = new THREE.Group();

    // Soft glow behind calligraphy
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xc05e1e,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth * 1.08, planeHeight * 1.05), glowMat);
    glow.position.z = -0.12;
    maaGroup.add(glow);

    const maaMat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.04,
      roughness: 0.55,
      metalness: 0.05,
      emissive: 0x2a1205,
      emissiveIntensity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    const maaPlane = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, planeHeight), maaMat);
    maaGroup.add(maaPlane);

    // Subtle depth layer (parallax shadow)
    const shadowMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      color: 0x1a0e05,
    });
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, planeHeight), shadowMat);
    shadowPlane.position.set(0.06, -0.05, -0.2);
    maaGroup.add(shadowPlane);

    scene.add(maaGroup);

    // Warm floating particles (replacing chain orbiters)
    const particleGeo = new THREE.SphereGeometry(0.055, 12, 12);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xfffcf7,
      emissive: 0xc05e1e,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    const particles = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(particleGeo, particleMat);
      scene.add(p);
      particles.push({
        mesh: p,
        angle: (i / 6) * Math.PI * 2,
        radius: 1.55 + (i % 2) * 0.15,
        yPhase: i * 1.1,
      });
    }

    let mouseX = 0;
    let mouseY = 0;
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.7;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.5;
    });

    let running = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', resize, { passive: true });

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!running) return;

      const t = clock.getElapsedTime();

      // Gentle float + mouse-tilt on माँ artwork
      maaGroup.position.y = Math.sin(t * 0.9) * 0.12;
      maaGroup.rotation.y = mouseX * 0.35 + Math.sin(t * 0.4) * 0.06;
      maaGroup.rotation.x = -mouseY * 0.25 + Math.cos(t * 0.5) * 0.04;
      maaGroup.rotation.z = Math.sin(t * 0.3) * 0.02;

      glow.scale.setScalar(1 + Math.sin(t * 1.2) * 0.03);
      glow.material.opacity = 0.18 + Math.sin(t * 1.5) * 0.06;

      particles.forEach((p) => {
        p.angle += 0.006;
        p.mesh.position.x = Math.cos(p.angle) * p.radius;
        p.mesh.position.z = Math.sin(p.angle) * p.radius * 0.35;
        p.mesh.position.y = Math.sin(t + p.yPhase) * 0.35;
      });

      camera.position.x += (mouseX * 0.6 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 0.4 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();
  } catch (err) {
    console.warn('[Swadse] 3D hero skipped:', err);
    container.innerHTML = `<img src="${MAA_TEXTURE_URL}" alt="माँ" class="hero-maa-fallback" width="280" height="auto" />`;
  }
}
