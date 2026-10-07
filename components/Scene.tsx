"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function Scene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let noMotion = motionQuery.matches;
    const mobile = window.matchMedia("(max-width: 899px)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
    renderer.setSize(host.clientWidth, Math.max(host.clientHeight, 1));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "block h-full w-full";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      32,
      host.clientWidth / Math.max(host.clientHeight, 1),
      0.1,
      40,
    );
    camera.position.set(0, 0, 8);

    const count = mobile ? 70 : 180;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.7) * 11;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 6.2;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 3.4;
      const red = Math.random() > 0.86;
      colors[index * 3] = red ? 0.76 : 0.92;
      colors[index * 3 + 1] = red ? 0.07 : 0.92;
      colors[index * 3 + 2] = red ? 0.12 : 0.92;
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    dustGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const dustMaterial = new THREE.PointsMaterial({
      size: 0.028,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    const glowTexture = makeGlowTexture();
    const embers: THREE.Sprite[] = [];
    const seeds = [
      { x: -2.6, y: 0.4, z: 0.2, color: 0xc1121f, scale: 0.55, opacity: 0.28 },
      { x: -1.4, y: -0.8, z: -0.4, color: 0xffffff, scale: 0.22, opacity: 0.22 },
      { x: -3.1, y: -0.2, z: 0.6, color: 0xffffff, scale: 0.16, opacity: 0.35 },
      { x: 1.8, y: 1.1, z: -0.8, color: 0xffffff, scale: 0.12, opacity: 0.16 },
    ];

    seeds.forEach((seed) => {
      const material = new THREE.SpriteMaterial({
        map: glowTexture,
        color: seed.color,
        transparent: true,
        opacity: seed.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(seed.x, seed.y, seed.z);
      sprite.scale.setScalar(seed.scale);
      sprite.userData.baseY = seed.y;
      sprite.userData.phase = Math.random() * Math.PI * 2;
      scene.add(sprite);
      embers.push(sprite);
    });

    const pointer = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer);

    const onMotion = (event: MediaQueryListEvent) => {
      noMotion = event.matches;
    };
    motionQuery.addEventListener("change", onMotion);

    let hidden = document.hidden;
    const onVisibility = () => {
      hidden = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const timer = new THREE.Timer();
    timer.connect(document);
    let raf = 0;
    let stopped = false;

    const renderFrame = () => {
      timer.update();
      const delta = Math.min(timer.getDelta(), 0.05);
      const elapsed = timer.getElapsed();
      if (!noMotion) {
        dust.rotation.y += delta * 0.035;
        embers.forEach((sprite) => {
          const baseY = Number(sprite.userData.baseY);
          const phase = Number(sprite.userData.phase);
          sprite.position.y = baseY + Math.sin(elapsed * 0.35 + phase) * 0.12;
        });
        camera.position.x += (pointer.x * 0.22 - camera.position.x) * 0.04;
        camera.position.y += (-pointer.y * 0.12 - camera.position.y) * 0.04;
      }
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    const loop = () => {
      if (stopped) return;
      raf = requestAnimationFrame(loop);
      if (hidden || noMotion) return;
      renderFrame();
    };

    renderFrame();
    loop();

    const onResize = () => {
      const width = host.clientWidth;
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(host);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      motionQuery.removeEventListener("change", onMotion);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      dustGeometry.dispose();
      dustMaterial.dispose();
      embers.forEach((sprite) => {
        (sprite.material as THREE.SpriteMaterial).dispose();
      });
      glowTexture.dispose();
      timer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />;
}

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  if (!context) return texture;
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(0.4, "rgba(255,255,255,0.22)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  texture.needsUpdate = true;
  return texture;
}
