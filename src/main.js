/* ═══════════════════════════════════════════════════
   TIME ON ME — 3D Engine + Animation Orchestration
   Designed & Developed by Sadiq
   ═══════════════════════════════════════════════════ */

console.log(
  '%c TIME ON ME %c Designed & Developed by Sadiq ',
  'background: #23201b; color: #f8f6df; font-weight: bold; font-size: 13px; padding: 6px 12px; border-radius: 4px 0 0 4px;',
  'background: #9e7245; color: #ffffff; font-weight: bold; font-size: 13px; padding: 6px 12px; border-radius: 0 4px 4px 0;'
);

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ─── Constants ─── */
const BALL_SCALE = 0.97;
const SECTIONS = {
  hero:     { x: -0.05, y: -0.28, z: -0.5,  scale: 0.90 },
  services: { x:  1.9,  y:  0.0,  z: -0.2,  scale: 0.78 },
  how:      { x: -2.0,  y:  0.1,  z:  0.4,  scale: 0.88 },
  pricing:  { x:  0.0,  y: -0.25, z: -0.5,  scale: 0.70 },
  app:      { x: -1.3,  y: -0.1,  z:  0.2,  scale: 0.78 },
  footer:   { x:  1.6,  y: -0.3,  z: -0.2,  scale: 0.70 },
};

const BASE_SPEED = 0.003;
const DAMPING = 0.94;

/* ─── State ─── */
let ball = null;
let ballLoaded = false;
let baseScale = 1;
let currentSection = 'hero';
let isDragging = false;
let dragEnabled = false;
let prevMouse = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let autoVel = {
  x: (Math.random() - 0.5) * 0.003,
  y: BASE_SPEED + Math.random() * 0.002,
};
let entranceDone = false;

/* ─── Renderer ─── */
const canvas = document.getElementById('hero-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* ─── Scene & Camera ─── */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 5.5);

/* ─── Environment ─── */
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

/* ─── Lighting (vibrant warm studio lighting for cream backdrop) ─── */
const ambient = new THREE.AmbientLight(0xfffaec, 1.4);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.6);
keyLight.position.set(-2, 4, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xf5eed8, 1.4);
fillLight.position.set(4, 1, 2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
rimLight.position.set(0, 3, -3);
scene.add(rimLight);

const hemi = new THREE.HemisphereLight(0xfffaec, 0xdcd6c2, 0.9);
scene.add(hemi);

/* ─── Load GLB ─── */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load(
  '/models/camera.glb',
  (gltf) => {
    ball = gltf.scene;

    // Center the model
    const box = new THREE.Box3().setFromObject(ball);
    const center = box.getCenter(new THREE.Vector3());
    ball.position.sub(center);

    // Normalize scale — longest axis = 2.4 units
    const size = box.getSize(new THREE.Vector3());
    baseScale = 2.4 / Math.max(size.x, size.y, size.z);
    ball.scale.setScalar(baseScale * SECTIONS.hero.scale);
    ball.position.set(SECTIONS.hero.x, SECTIONS.hero.y, SECTIONS.hero.z);

    // Material overrides — metallic studio highlights for realistic depth
    ball.traverse((child) => {
      if (child.isMesh && child.material) {
        const m = child.material;
        m.envMapIntensity = 0.9;
        if (m.roughness !== undefined) m.roughness = Math.min(0.8, (m.roughness ?? 0.5) * 1.0);
        if (m.metalness !== undefined) m.metalness = Math.max(0.2, m.metalness ?? 0.15);
        m.needsUpdate = true;
      }
    });

    scene.add(ball);
    ballLoaded = true;
    ballEntrance();
  },
  undefined,
  (err) => console.error('Error loading model:', err)
);

/* ─── Ball Entrance ─── */
function ballEntrance() {
  if (!ball) return;
  const targetY = SECTIONS.hero.y;
  const startScale = baseScale * SECTIONS.hero.scale * 0.25;
  const endScale = baseScale * SECTIONS.hero.scale;

  ball.scale.setScalar(startScale);
  ball.position.y = targetY - 0.8;

  gsap.to(ball.scale, {
    x: endScale, y: endScale, z: endScale,
    duration: 1.3, ease: 'expo.out', delay: 0.5,
  });
  gsap.to(ball.position, {
    y: targetY, duration: 1.3, ease: 'expo.out', delay: 0.5,
    onComplete: () => { entranceDone = true; enableDrag(); },
  });
}

/* ─── Drag Physics ─── */
function enableDrag() {
  if (currentSection !== 'hero') return;
  dragEnabled = true;
  canvas.classList.add('drag-enabled');
}

function disableDrag() {
  dragEnabled = false;
  isDragging = false;
  canvas.classList.remove('drag-enabled');
}

function getPointerPos(e) {
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX, y: t.clientY };
}

canvas.addEventListener('mousedown', onDragStart);
canvas.addEventListener('mousemove', onDragMove);
canvas.addEventListener('mouseup', onDragEnd);
canvas.addEventListener('mouseleave', onDragEnd);
canvas.addEventListener('touchstart', onDragStart, { passive: true });
canvas.addEventListener('touchmove', onDragMove, { passive: true });
canvas.addEventListener('touchend', onDragEnd);

function onDragStart(e) {
  if (!dragEnabled || !ball) return;
  isDragging = true;
  const pos = getPointerPos(e);
  prevMouse = { x: pos.x, y: pos.y };
  velocity = { x: 0, y: 0 };
}

function onDragMove(e) {
  if (!isDragging || !ball) return;
  const pos = getPointerPos(e);
  velocity.x = (pos.y - prevMouse.y) * 0.006;
  velocity.y = (pos.x - prevMouse.x) * 0.006;
  ball.rotation.x += velocity.x;
  ball.rotation.y += velocity.y;
  prevMouse = { x: pos.x, y: pos.y };
}

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  coastMomentum();
}

function coastMomentum() {
  if (isDragging) return;
  if (Math.abs(velocity.x) < 0.0003 && Math.abs(velocity.y) < 0.0003) {
    const len = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (len > 0) {
      autoVel.x = (velocity.x / len) * BASE_SPEED * 0.5;
      autoVel.y = (velocity.y / len) * (BASE_SPEED + Math.random() * 0.002);
    }
    return;
  }
  velocity.x *= DAMPING;
  velocity.y *= DAMPING;
  if (ball) { ball.rotation.x += velocity.x; ball.rotation.y += velocity.y; }
  requestAnimationFrame(coastMomentum);
}

/* ─── Scroll-driven Ball Positioning ─── */
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function depthOffset(y) { return y < 0 ? y * 0.15 : 0; }

function lerpSection(from, to, progress) {
  if (!ball) return;
  const p = Math.max(0, Math.min(1, progress));
  const ep = easeInOut(p);
  ball.position.x = from.x + (to.x - from.x) * p;
  ball.position.y = from.y + (to.y - from.y) * ep;
  ball.position.z = from.z + (to.z - from.z) * p + depthOffset(ball.position.y);
  const s = Math.max(0.15, baseScale * (from.scale + (to.scale - from.scale) * p));
  ball.scale.setScalar(s);
  ball.visible = true;
}

function updateResponsiveCamera() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    SECTIONS.hero.x = 0;
    SECTIONS.hero.y = -0.52;
    SECTIONS.hero.scale = 0.58;
    SECTIONS.services.x = 0;
    SECTIONS.services.y = -0.35;
    SECTIONS.services.scale = 0.48;
    SECTIONS.how.x = 0;
    SECTIONS.how.y = -0.35;
    SECTIONS.how.scale = 0.52;
    SECTIONS.pricing.x = 0;
    SECTIONS.pricing.y = -0.35;
    SECTIONS.pricing.scale = 0.48;
    SECTIONS.app.x = 0;
    SECTIONS.app.y = -0.35;
    SECTIONS.app.scale = 0.48;
    SECTIONS.footer.x = 0;
    SECTIONS.footer.y = -0.35;
    SECTIONS.footer.scale = 0.48;
    camera.position.set(0, 0, 6.4);
  } else {
    SECTIONS.hero.x = -0.05;
    SECTIONS.hero.y = -0.28;
    SECTIONS.hero.scale = 0.9;
    SECTIONS.services.x = 1.9;
    SECTIONS.services.y = 0.0;
    SECTIONS.services.scale = 0.78;
    SECTIONS.how.x = -2.0;
    SECTIONS.how.y = 0.1;
    SECTIONS.how.scale = 0.88;
    SECTIONS.pricing.x = 0.0;
    SECTIONS.pricing.y = 0.2;
    SECTIONS.pricing.scale = 0.72;
    SECTIONS.app.x = -1.3;
    SECTIONS.app.y = -0.1;
    SECTIONS.app.scale = 0.78;
    SECTIONS.footer.x = 1.6;
    SECTIONS.footer.y = -0.3;
    SECTIONS.footer.scale = 0.70;
    camera.position.set(0, 0, 5.5);
  }
  if (ball && currentSection === 'hero' && entranceDone) {
    ball.scale.setScalar(baseScale * SECTIONS.hero.scale);
    ball.position.set(SECTIONS.hero.x, SECTIONS.hero.y, SECTIONS.hero.z);
    ball.visible = true;
  }
}

function setupScrollBall() {
  updateResponsiveCamera();

  // Hero → Services
  ScrollTrigger.create({
    trigger: '#services-section', start: 'top bottom', end: 'top top', scrub: 1.5,
    onUpdate: (self) => lerpSection(SECTIONS.hero, SECTIONS.services, self.progress),
    onEnter: () => { currentSection = 'services'; disableDrag(); if (ball) ball.visible = true; },
    onLeaveBack: () => { currentSection = 'hero'; if (ball) ball.visible = true; if (entranceDone) enableDrag(); },
  });

  // Services → How
  ScrollTrigger.create({
    trigger: '#how-section', start: 'top bottom', end: 'top top', scrub: 1.5,
    onUpdate: (self) => lerpSection(SECTIONS.services, SECTIONS.how, self.progress),
    onEnter: () => { currentSection = 'how'; disableDrag(); if (ball) ball.visible = true; },
    onLeaveBack: () => { currentSection = 'services'; disableDrag(); if (ball) ball.visible = true; },
  });

  // How → Pricing
  ScrollTrigger.create({
    trigger: '#pricing-section', start: 'top bottom', end: 'top top', scrub: 1.5,
    onUpdate: (self) => lerpSection(SECTIONS.how, SECTIONS.pricing, self.progress),
    onEnter: () => { currentSection = 'pricing'; disableDrag(); if (ball) ball.visible = true; },
    onLeaveBack: () => { currentSection = 'how'; disableDrag(); if (ball) ball.visible = true; },
  });

  // Pricing → App
  ScrollTrigger.create({
    trigger: '#app-section', start: 'top bottom', end: 'top top', scrub: 1.5,
    onUpdate: (self) => lerpSection(SECTIONS.pricing, SECTIONS.app, self.progress),
    onEnter: () => { currentSection = 'app'; disableDrag(); if (ball) ball.visible = true; },
    onLeaveBack: () => { currentSection = 'pricing'; disableDrag(); if (ball) ball.visible = true; },
  });

  // App → Footer
  ScrollTrigger.create({
    trigger: '#site-footer', start: 'top bottom', end: 'top top', scrub: 1.5,
    onUpdate: (self) => lerpSection(SECTIONS.app, SECTIONS.footer, self.progress),
    onEnter: () => { currentSection = 'footer'; disableDrag(); if (ball) ball.visible = true; },
    onLeaveBack: () => { currentSection = 'app'; disableDrag(); if (ball) ball.visible = true; },
  });
}

/* ─── GSAP UI Entrance ─── */
function setupEntranceAnimations() {
  const tl = gsap.timeline({ delay: 0.15 });

  // Navbar
  tl.to('.nav-logo', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.1);
  tl.to('.nav-links', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.15);
  tl.to('.book-btn', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.2);

  // Hero
  tl.to('#ph-badge', { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, 0.4);
  tl.to('#event-card', { opacity: 1, x: 0, duration: 1.1, ease: 'expo.out' }, 0.55);
  tl.to('#hero-text', { opacity: 1, x: 0, duration: 1.1, ease: 'expo.out' }, 0.65);
  tl.to('#nav-arrow', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 1.1);

  // Signature draw
  tl.to('#sig-wrap', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.2);
  tl.to('.sp1', { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 1.2);
  tl.to('.sp2', { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut' }, 1.8);
  tl.to('.sp3', { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, 2.0);
}

/* ─── Scroll-triggered Section Animations ─── */
function setupSectionAnimations() {
  // Services cards
  ScrollTrigger.create({
    trigger: '#services-section', start: 'top 75%', once: true,
    onEnter: () => gsap.to('.service-card', { opacity: 1, y: 0, stagger: 0.08, duration: 0.8, ease: 'expo.out', delay: 0.1 }),
  });

  // How steps
  ScrollTrigger.create({
    trigger: '#how-section', start: 'top 70%', once: true,
    onEnter: () => gsap.to('.step-item', { opacity: 1, x: 0, stagger: 0.12, duration: 0.9, ease: 'expo.out', delay: 0.1 }),
  });

  // Pricing cards
  ScrollTrigger.create({
    trigger: '#pricing-section', start: 'top 75%', once: true,
    onEnter: () => gsap.to('.pricing-card', { opacity: 1, y: 0, stagger: 0.12, duration: 0.8, ease: 'expo.out', delay: 0.1 }),
  });

  // App features
  ScrollTrigger.create({
    trigger: '#app-section', start: 'top 75%', once: true,
    onEnter: () => gsap.to('.app-feature', { opacity: 1, y: 0, stagger: 0.1, duration: 0.7, ease: 'expo.out', delay: 0.1 }),
  });
}

/* ─── Event Card Hover ─── */
function setupEventCardHover() {
  const el = document.getElementById('event-card');
  if (!el) return;
  el.addEventListener('mouseenter', () => gsap.to(el, { scale: 1.035, y: -6, duration: 0.55, ease: 'power3.out', overwrite: 'auto' }));
  el.addEventListener('mouseleave', () => gsap.to(el, { scale: 1.0, y: 0, duration: 0.55, ease: 'power3.out', overwrite: 'auto' }));
}

/* ─── Navbar Scroll ─── */
function setupNavScroll() {
  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

/* ─── Render Loop ─── */
function animate() {
  requestAnimationFrame(animate);
  if (ball) {
    ball.visible = true;
    if (!isDragging) {
      ball.rotation.x += autoVel.x;
      ball.rotation.y += autoVel.y;
    }
  }
  renderer.render(scene, camera);
}
animate();

/* ─── Resize ─── */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateResponsiveCamera();
}, { passive: true });

/* ─── Init ─── */
window.addEventListener('load', () => {
  setupScrollBall();
  setupEntranceAnimations();
  setupSectionAnimations();
  setupEventCardHover();
  setupNavScroll();
  ScrollTrigger.refresh();
});
