import * as THREE from "three";

export type NexusBrand = { slug: string; label: string; latin: string };

type NexusOptions = {
  brands: NexusBrand[];
  reduced: boolean;
  onEnter: (slug: string) => void;
};

type Ctx = CanvasRenderingContext2D;
type Draw = (x: Ctx, t: number) => void;

type Edge = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  w: number;
  seg: number;
  cv: number;
  c: number;
  d0: number;
  d1: number;
  jit: number;
};

const VH = 800;
const S2 = 512;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (value: number) => {
  const x = Math.max(0, Math.min(1, value));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

function randomUnit() {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * 6.2832;
  const s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s).normalize();
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

const rgba = (c: string, a: number) => `rgba(${c},${a})`;

/** Layout for brand orbs. Index follows the order of `divisions`. */
const DESKTOP_BRANDS: number[][] = [
  [300, 150, 70],
  [-250, 170, -70],
  [310, -150, -60],
  [-240, -150, 80],
  [20, 290, -120],
];
const MOBILE_BRANDS: number[][] = [
  [-105, 290, 40],
  [105, 175, -40],
  [-110, -60, 40],
  [-95, -185, -40],
  [105, 325, -30],
];
/** Ring links between brand indices (1-based, 0 is the core). */
const RING: number[][] = [
  [5, 1],
  [1, 3],
  [3, 4],
  [4, 2],
  [2, 5],
];

export function createNexusScene(root: HTMLElement, opts: NexusOptions): () => void {
  const { brands, reduced, onEnter } = opts;
  const nB = brands.length;
  const nAll = nB + 1;

  const one = <T extends Element>(selector: string) => root.querySelector<T>(selector);
  const many = <T extends Element>(selector: string) =>
    Array.from(root.querySelectorAll<T>(selector));

  const canvas = one<HTMLCanvasElement>('[data-nx="canvas"]');
  const ghost = one<HTMLElement>('[data-nx="ghost"]');
  const nnEl = one<HTMLElement>('[data-nx="nodes"]');
  const nsEl = one<HTMLElement>('[data-nx="synapses"]');
  const hvEl = one<HTMLElement>('[data-nx="focus"]');
  const pbEl = one<HTMLElement>('[data-nx="progress"]');
  const tcEl = one<HTMLElement>('[data-nx="clock"]');
  const rpEl = one<HTMLElement>('[data-nx="replay"]');
  const toast = one<HTMLElement>('[data-nx="toast"]');
  const cur = one<HTMLElement>('[data-nx="cursor"]');
  const ring = one<HTMLElement>('[data-nx="ring"]');
  const links = many<HTMLAnchorElement>("[data-nx-link]");
  const panes = many<HTMLElement>("[data-nx-pane]");
  const tags = many<HTMLElement>("[data-nx-tag]");
  const goButtons = many<HTMLElement>("[data-nx-go]");

  const timers = new Set<number>();
  const cleanups: Array<() => void> = [];
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const listen = <K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    handler: (event: WindowEventMap[K]) => void,
  ) => {
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };

  const showStatic = () => {
    root.classList.add("is-open", "is-in", "is-tags");
  };

  let renderer: THREE.WebGLRenderer;
  if (!canvas) {
    showStatic();
    return () => {};
  }
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    showStatic();
    return () => {};
  }

  const compactDevice = window.matchMedia("(max-width: 760px)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, compactDevice ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 1, 6000);
  const group = new THREE.Group();
  scene.add(group);
  const camZ = VH / (2 * Math.tan((23 * Math.PI) / 180));

  const H: number[] = Array.from({ length: nAll }, (_, i) => (i === 0 ? 1 : 0));
  const U = {
    uT: { value: 0 },
    uGrow: { value: 0 },
    uFa: { value: 0 },
    uPR: { value: renderer.getPixelRatio() },
    uH: { value: H },
    uFire: { value: new THREE.Vector4(0, 0, 0, -100) },
  };

  const COMMON = `uniform float uT,uGrow,uFa;uniform float uH[${nAll}];uniform vec4 uFire;
float wave(vec3 p){float st=uT-uFire.w;if(st>0.&&st<6.){return exp(-pow((distance(p,uFire.xyz)-st*420.)/70.,2.))*exp(-st*.55);}return 0.;}
float dimf(float h,float c){return c<.5?1.-.55*uFa*(1.-h):1.-.72*uFa*(1.-h);}`;

  const edgeMat = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader:
      `attribute float aT,aE,aD,aC,aW;varying vec3 vC;` +
      COMMON +
      `
void main(){
 int ci=int(aC+.5);float h=uH[ci];
 float gr=clamp((uGrow-aD)/.1,0.,1.);
 vec3 p=position;p.xy+=vec2(sin(uT*.6+aE*6.),cos(uT*.5+aE*5.))*1.6;
 float sp=(.14+.2*aE)*(1.+h*2.2);float ps=fract(uT*sp+aE*7.3)*2.4-.7;
 float head=exp(-pow((aT-ps)/.06,2.))*(.35+aW);
 float wv=wave(position);
 float b=(.13+.22*aW+h*.3+head*1.5+wv*1.4)*dimf(h,aC);
 float red=clamp(h*.7+wv+head*.5,0.,1.);
 vec3 col=mix(vec3(.66),vec3(1.,.07,.04),red);col=mix(col,vec3(1.),head*.5*(1.-red*.5));
 vC=col*b*gr;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec3 vC;void main(){gl_FragColor=vec4(vC,1.);}`,
  });

  const ptMat = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader:
      `attribute float aS,aC,aE,aD;uniform float uPR;varying vec3 vC;varying float vA;` +
      COMMON +
      `
void main(){
 int ci=int(aC+.5);float h=uH[ci];float gr=clamp((uGrow-aD)/.1,0.,1.);
 float wv=wave(position);float pulse=.5+.5*sin(uT*1.8+aE*6.28);
 float b=(.3+.5*pulse+wv*1.6)*dimf(h,aC);
 vC=mix(vec3(.85),vec3(1.,.07,.04),clamp(wv+h*.5,0.,1.))*b;vA=gr;
 vec4 mv=modelViewMatrix*vec4(position,1.);
 gl_PointSize=aS*uPR*(1.+wv*.8)*gr*(860./-mv.z);
 gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=smoothstep(.5,.0,d);gl_FragColor=vec4(vC,a*vA);}`,
  });

  const haloMat = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader:
      `attribute float aS,aC,aD;uniform float uPR;varying float vI;` +
      COMMON +
      `
void main(){int ci=int(aC+.5);float h=uH[ci];float gr=clamp((uGrow-aD)/.2,0.,1.);
 vI=gr*(.22+.75*h)*dimf(h,aC)*(.9+.1*sin(uT*1.6+aC));
 vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aS*uPR*(1.+h*.25)*(860./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vI;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=pow(1.-d,2.2);gl_FragColor=vec4(vec3(1.,.08,.04)*a*vI,a*vI);}`,
  });

  /* ---------- live textures drawn on the orbs ---------- */
  const rn = seeded(11);
  const canvases = Array.from({ length: nAll }, () => {
    const c = document.createElement("canvas");
    c.width = c.height = S2;
    return c;
  });
  const contexts = canvases.map((c) => c.getContext("2d") as Ctx);

  /* core: neural macro */
  const CN = Array.from({ length: 70 }, () => ({
    x: rn(),
    y: rn(),
    z: rn(),
    a: rn() * 6.28,
    s: 0.3 + rn() * 0.7,
  }));
  const CE: Array<[number, number, number]> = [];
  CN.forEach((a, i) =>
    CN.forEach((b, j) => {
      if (
        j > i &&
        Math.hypot(a.x - b.x, a.y - b.y) < 0.2 &&
        Math.abs(a.z - b.z) < 0.35 &&
        CE.length < 150
      ) {
        CE.push([i, j, rn()]);
      }
    }),
  );
  const drawCore: Draw = (x, t) => {
    const g = x.createRadialGradient(S2 / 2, S2 / 2, 20, S2 / 2, S2 / 2, S2 * 0.75);
    g.addColorStop(0, "#2a0807");
    g.addColorStop(1, "#030303");
    x.fillStyle = g;
    x.fillRect(0, 0, S2, S2);
    x.globalCompositeOperation = "lighter";
    const P = CN.map((n) => [
      (n.x + Math.sin(t * 0.4 * n.s + n.a) * 0.02) * S2,
      (n.y + Math.cos(t * 0.35 * n.s + n.a) * 0.02) * S2,
    ]);
    CE.forEach(([i, j, r]) => {
      const a = P[i];
      const b = P[j];
      const z = (CN[i].z + CN[j].z) / 2;
      x.strokeStyle = rgba("240,240,240", 0.1 + z * 0.3);
      x.lineWidth = 0.6 + z * 1.6;
      x.beginPath();
      x.moveTo(a[0], a[1]);
      x.lineTo(b[0], b[1]);
      x.stroke();
      const p = (t * 0.35 + r * 5) % 1;
      if (p < 0.5) {
        const q = p * 2;
        x.fillStyle = "rgba(255,60,40,.9)";
        x.beginPath();
        x.arc(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, 2 + z * 2, 0, 7);
        x.fill();
      }
    });
    CN.forEach((n, i) => {
      const r = (1 - n.z) * 34 + 4;
      const q = P[i];
      const gg = x.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
      const c = n.s > 0.75 ? "255,40,25" : "240,240,240";
      gg.addColorStop(0, rgba(c, 0.35 + n.z * 0.6));
      gg.addColorStop(1, rgba(c, 0));
      x.fillStyle = gg;
      x.beginPath();
      x.arc(q[0], q[1], r, 0, 7);
      x.fill();
    });
    x.globalCompositeOperation = "source-over";
  };

  /* media: studio */
  const BK = Array.from({ length: 26 }, () => ({
    x: rn(),
    y: rn(),
    r: 10 + rn() * 46,
    s: 0.02 + rn() * 0.06,
    a: rn() * 6.28,
    red: rn() < 0.4,
  }));
  const drawMedia: Draw = (x, t) => {
    const g = x.createLinearGradient(0, 0, 0, S2);
    g.addColorStop(0, "#050505");
    g.addColorStop(0.62, "#150505");
    g.addColorStop(0.62, "#0b0b0b");
    g.addColorStop(1, "#030303");
    x.fillStyle = g;
    x.fillRect(0, 0, S2, S2);
    x.globalCompositeOperation = "lighter";
    (
      [
        [0.22, "255,50,35"],
        [0.5, "240,240,240"],
        [0.78, "255,50,35"],
      ] as Array<[number, string]>
    ).forEach(([bx, c], k) => {
      const tx = (bx + Math.sin(t * 0.6 + k * 2) * 0.12) * S2;
      const w = 70 + (k % 2) * 30;
      const gg = x.createLinearGradient(0, 0, 0, S2 * 0.7);
      gg.addColorStop(0, rgba(c, 0.55));
      gg.addColorStop(1, rgba(c, 0));
      x.fillStyle = gg;
      x.beginPath();
      x.moveTo(bx * S2 - 6, 0);
      x.lineTo(bx * S2 + 6, 0);
      x.lineTo(tx + w, S2 * 0.7);
      x.lineTo(tx - w, S2 * 0.7);
      x.closePath();
      x.fill();
    });
    const fg = x.createRadialGradient(S2 / 2, S2 * 0.64, 0, S2 / 2, S2 * 0.64, S2 * 0.4);
    fg.addColorStop(0, "rgba(255,60,40,.35)");
    fg.addColorStop(1, "rgba(255,60,40,0)");
    x.fillStyle = fg;
    x.fillRect(0, S2 * 0.3, S2, S2 * 0.7);
    x.strokeStyle = "rgba(240,240,240,.14)";
    x.lineWidth = 1;
    for (let k = -8; k <= 8; k++) {
      x.beginPath();
      x.moveTo(S2 / 2 + k * 14, S2 * 0.62);
      x.lineTo(S2 / 2 + k * 90, S2);
      x.stroke();
    }
    for (let k = 0; k < 7; k++) {
      const yy = S2 * 0.62 + Math.pow((k + ((t * 0.4) % 1)) / 7, 2) * S2 * 0.38;
      x.beginPath();
      x.moveTo(0, yy);
      x.lineTo(S2, yy);
      x.stroke();
    }
    BK.forEach((b) => {
      const px = (b.x + Math.sin(t * b.s * 3 + b.a) * 0.04) * S2;
      const py = ((((b.y - t * b.s * 0.4) % 1) + 1) % 1) * S2;
      const c = b.red ? "255,50,35" : "240,240,240";
      const gg = x.createRadialGradient(px, py, b.r * 0.6, px, py, b.r);
      gg.addColorStop(0, rgba(c, 0));
      gg.addColorStop(0.85, rgba(c, 0.24));
      gg.addColorStop(1, rgba(c, 0));
      x.fillStyle = gg;
      x.beginPath();
      x.arc(px, py, b.r, 0, 7);
      x.fill();
    });
    const sx = S2 * (0.5 + Math.sin(t * 0.5) * 0.22);
    x.save();
    x.translate(sx - S2 / 2, 0);
    const sg = x.createLinearGradient(-S2 / 2, 0, S2 * 1.5, 0);
    sg.addColorStop(0, "rgba(255,60,40,0)");
    sg.addColorStop(0.5, "rgba(255,235,230,.85)");
    sg.addColorStop(1, "rgba(255,60,40,0)");
    x.fillStyle = sg;
    x.fillRect(-S2 / 2, S2 * 0.64 - 2, S2 * 2, 4);
    x.restore();
    const fl = x.createRadialGradient(sx, S2 * 0.64, 0, sx, S2 * 0.64, 70);
    fl.addColorStop(0, "rgba(255,240,235,.9)");
    fl.addColorStop(1, "rgba(255,60,40,0)");
    x.fillStyle = fl;
    x.beginPath();
    x.arc(sx, S2 * 0.64, 70, 0, 7);
    x.fill();
    x.globalCompositeOperation = "source-over";
  };

  /* pixel: plasma field */
  const drawPixel: Draw = (x, t) => {
    x.fillStyle = "#050505";
    x.fillRect(0, 0, S2, S2);
    const n = 32;
    const cs = S2 / n;
    for (let r = 0; r < n; r++) {
      const glitch =
        Math.sin(r * 13.7 + Math.floor(t * 3) * 5.1) > 0.93
          ? Math.floor(Math.sin(r * 7.1 + Math.floor(t * 3)) * 6)
          : 0;
      for (let q = 0; q < n; q++) {
        const v =
          (Math.sin(q * 0.33 + t * 0.9) +
            Math.sin(r * 0.27 - t * 0.7) +
            Math.sin((q + r) * 0.21 + t * 0.5) +
            Math.sin(Math.hypot(q - 16, r - 16) * 0.4 - t * 1.2)) /
          4;
        const k = (v + 1) / 2;
        if (Math.sin(q * 0.5 + r * 0.4 + t * 1.6) > 0.82) {
          x.fillStyle = `rgb(${Math.round(150 + 105 * k)},${Math.round(10 + 20 * k)},8)`;
        } else {
          const g = Math.round(14 + k * k * 230);
          x.fillStyle = `rgb(${g},${g},${g})`;
        }
        x.fillRect((q + glitch) * cs, r * cs, cs - 1, cs - 1);
      }
    }
    const sy = ((t * 0.3) % 1) * S2;
    const sg = x.createLinearGradient(0, sy - 30, 0, sy + 30);
    sg.addColorStop(0, "rgba(255,255,255,0)");
    sg.addColorStop(0.5, "rgba(255,255,255,.18)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = sg;
    x.fillRect(0, sy - 30, S2, 60);
  };

  /* agency: halftone poster */
  const drawAgency: Draw = (x, t) => {
    x.fillStyle = "#c40a02";
    x.fillRect(0, 0, S2, S2);
    const px0 = S2 * (0.5 + Math.sin(t * 0.4) * 0.2);
    const py0 = S2 * (0.5 + Math.cos(t * 0.33) * 0.2);
    const n = 34;
    const cs = S2 / n;
    x.fillStyle = "#0a0a0a";
    for (let r = 0; r <= n; r++) {
      for (let q = 0; q <= n; q++) {
        const px = (q + (r % 2) * 0.5) * cs;
        const py = r * cs;
        const d = Math.hypot(px - px0, py - py0) / S2;
        const rad =
          cs * 0.5 * Math.min(1, Math.max(0, d * 1.5 - 0.1 + Math.sin(d * 18 - t * 2.5) * 0.12));
        if (rad > 0.4) {
          x.beginPath();
          x.arc(px, py, rad, 0, 7);
          x.fill();
        }
      }
    }
    for (let k = 0; k < 4; k++) {
      const rr = ((t * 0.25 + k / 4) % 1) * S2 * 0.9;
      x.strokeStyle = `rgba(240,240,240,${(1 - rr / (S2 * 0.9)) * 0.8})`;
      x.lineWidth = 3;
      x.beginPath();
      x.arc(px0, py0, rr, 0, 7);
      x.stroke();
    }
    x.save();
    x.translate(S2 / 2, S2 / 2);
    x.rotate(-0.5);
    x.fillStyle = "rgba(240,240,240,.92)";
    x.fillRect(-S2, S2 * 0.2 + Math.sin(t * 0.5) * 14, S2 * 2, 26);
    x.restore();
    const bg = x.createRadialGradient(px0, py0, 0, px0, py0, 56);
    bg.addColorStop(0, "rgba(255,255,255,.95)");
    bg.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = bg;
    x.beginPath();
    x.arc(px0, py0, 56, 0, 7);
    x.fill();
  };

  /* academy: library */
  const SH: Array<Array<{ x: number; w: number; h: number; c: string }>> = [];
  for (let r = 0; r < 8; r++) {
    const row: Array<{ x: number; w: number; h: number; c: string }> = [];
    let xx = 0;
    while (xx < S2) {
      const w = 10 + rn() * 18;
      const g = Math.round(35 + rn() * 140);
      row.push({
        x: xx,
        w,
        h: 40 + rn() * 18,
        c: rn() < 0.14 ? "#c40a02" : `rgb(${g},${g},${g})`,
      });
      xx += w;
    }
    SH.push(row);
  }
  const DM = Array.from({ length: 40 }, () => ({
    x: rn(),
    y: rn(),
    s: 0.01 + rn() * 0.03,
    a: rn() * 6.28,
  }));
  const drawAcademy: Draw = (x, t) => {
    x.fillStyle = "#050505";
    x.fillRect(0, 0, S2, S2);
    const hr = Math.floor(t * 0.6) % 8;
    const hb = Math.floor(t * 1.7) % SH[hr].length;
    SH.forEach((row, r) => {
      const sy = (r + 1) * 64;
      row.forEach((b, i) => {
        x.fillStyle = b.c;
        x.fillRect(b.x, sy - b.h, b.w - 1, b.h);
        if (r === hr && i === hb) {
          x.fillStyle = "rgba(255,50,35,.8)";
          x.fillRect(b.x, sy - b.h - 4, b.w - 1, b.h + 4);
        }
      });
      x.fillStyle = "rgba(240,240,240,.22)";
      x.fillRect(0, sy, S2, 2);
    });
    const lx = S2 * (0.5 + Math.sin(t * 0.4) * 0.25);
    const ly = S2 * 0.12;
    x.globalCompositeOperation = "lighter";
    for (let k = -3; k <= 3; k++) {
      const gg = x.createLinearGradient(lx, ly, lx + k * 140, S2);
      gg.addColorStop(0, "rgba(255,235,225,.2)");
      gg.addColorStop(1, "rgba(255,235,225,0)");
      x.fillStyle = gg;
      x.beginPath();
      x.moveTo(lx - 4, ly);
      x.lineTo(lx + 4, ly);
      x.lineTo(lx + k * 140 + 40, S2);
      x.lineTo(lx + k * 140 - 40, S2);
      x.closePath();
      x.fill();
    }
    DM.forEach((d) => {
      const px = (d.x + Math.sin(t * d.s * 4 + d.a) * 0.03) * S2;
      const py = ((((d.y - t * d.s) % 1) + 1) % 1) * S2;
      x.fillStyle = "rgba(255,240,235,.55)";
      x.beginPath();
      x.arc(px, py, 1.6, 0, 7);
      x.fill();
    });
    x.globalCompositeOperation = "source-over";
    const og = x.createRadialGradient(lx, S2 * 0.35, 10, lx, S2 * 0.35, S2 * 0.75);
    og.addColorStop(0, "rgba(0,0,0,0)");
    og.addColorStop(0.5, "rgba(0,0,0,.35)");
    og.addColorStop(1, "rgba(0,0,0,.9)");
    x.fillStyle = og;
    x.fillRect(0, 0, S2, S2);
  };

  /* supplies: warehouse crates with a red scan beam */
  const CR: Array<Array<{ x: number; w: number; h: number; g: number; label: boolean }>> = [];
  for (let r = 0; r < 7; r++) {
    const row: Array<{ x: number; w: number; h: number; g: number; label: boolean }> = [];
    let xx = rn() * 14;
    while (xx < S2) {
      const w = 26 + rn() * 30;
      row.push({ x: xx, w, h: 34 + rn() * 26, g: Math.round(34 + rn() * 70), label: rn() < 0.2 });
      xx += w + 3;
    }
    CR.push(row);
  }
  const drawSupplies: Draw = (x, t) => {
    x.fillStyle = "#050505";
    x.fillRect(0, 0, S2, S2);
    const beam = (((t * 0.2) % 1.3) - 0.15) * S2;
    CR.forEach((row, r) => {
      const sy = (r + 1) * 66;
      row.forEach((b) => {
        const near = Math.max(0, 1 - Math.abs(b.x + b.w / 2 - beam) / 46);
        x.fillStyle = `rgb(${Math.round(b.g + near * 150)},${Math.round(b.g * (1 - near * 0.7))},${Math.round(b.g * (1 - near * 0.7))})`;
        x.fillRect(b.x, sy - b.h, b.w, b.h);
        x.fillStyle = "rgba(240,240,240,.16)";
        x.fillRect(b.x, sy - b.h, b.w, 2);
        x.fillStyle = "rgba(0,0,0,.45)";
        x.fillRect(b.x + b.w / 2 - 2, sy - b.h, 4, b.h);
        if (b.label) {
          x.fillStyle = "rgba(196,10,2,.9)";
          x.fillRect(b.x + 4, sy - b.h + 8, 10, 7);
        }
      });
      x.fillStyle = "rgba(240,240,240,.2)";
      x.fillRect(0, sy, S2, 2);
    });
    x.globalCompositeOperation = "lighter";
    const bg = x.createLinearGradient(beam - 40, 0, beam + 40, 0);
    bg.addColorStop(0, "rgba(255,50,35,0)");
    bg.addColorStop(0.5, "rgba(255,90,70,.5)");
    bg.addColorStop(1, "rgba(255,50,35,0)");
    x.fillStyle = bg;
    x.fillRect(beam - 40, 0, 80, S2);
    x.fillStyle = "rgba(255,235,230,.85)";
    x.fillRect(beam - 1, 0, 2, S2);
    x.globalCompositeOperation = "source-over";
    for (let k = 0; k < 64; k++) {
      const w = 1 + ((k * 7) % 4);
      x.fillStyle = `rgba(240,240,240,${0.25 + 0.3 * Math.sin(t * 2 + k)})`;
      x.fillRect(k * 8 + (k % 3), S2 - 34, w, 22);
    }
  };

  const drawers: Record<string, Draw> = {
    media: drawMedia,
    pixel: drawPixel,
    agency: drawAgency,
    academy: drawAcademy,
    supplies: drawSupplies,
  };
  const DRAW: Draw[] = [drawCore, ...brands.map((b) => drawers[b.slug] ?? drawPixel)];

  const textures = canvases.map((c, i) => {
    DRAW[i](contexts[i], i * 2.1);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  });

  /* ---------- state ---------- */
  const start = performance.now();
  const now = () => (performance.now() - start) / 1000;
  let T0 = 0;
  let boot = false;
  let focus = -1;
  let shownF = -9;
  let lock = -1;
  let enterIndex: number | null = null;
  let lastFire = 0;
  let lastFocusChange = -99;
  let rrobin = 0;
  let lastTex = 0;
  let raf = 0;
  let disposed = false;
  const m = { px: window.innerWidth / 2, py: window.innerHeight / 2, nx: 0, ny: 0, t: -99 };
  /**
   * Hover focus is anchored to the pointer, not the projected orb.
   * Strong camera zoom moves the orb on screen; locking to mouse travel
   * keeps focus stable while still allowing a close approach.
   */
  const ACQUIRE_R = 120;
  const POINTER_HOLD = 72;
  const POINTER_LEAVE = 130;
  const FOCUS_SWITCH_GAP = 0.32;
  const hoverAnchor = { i: -1, x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  function updTex(t: number) {
    if (t - lastTex < 0.06) return;
    lastTex = t;
    let i: number;
    if (focus >= 0) i = focus + 1;
    else {
      i = rrobin;
      rrobin = (rrobin + 1) % nAll;
    }
    DRAW[i](contexts[i], t);
    textures[i].needsUpdate = true;
    if (focus >= 0) {
      const j = Math.floor(Math.random() * nAll);
      if (j !== i) {
        DRAW[j](contexts[j], t);
        textures[j].needsUpdate = true;
      }
    }
  }

  function orbMat(i: number) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uT: U.uT,
        uFa: U.uFa,
        uHl: { value: 0 },
        uTex: { value: textures[i] },
      },
      vertexShader: `varying vec3 vN,vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying vec3 vN,vV;uniform float uT,uHl,uFa;uniform sampler2D uTex;
void main(){vec3 N=normalize(vN),V=normalize(vV);float nv=clamp(dot(N,V),0.,1.);float fr=pow(1.-nv,3.);vec3 Rr=reflect(-V,N);
 vec2 uv=N.xy*.49+.5;uv+=N.xy*(1.-nv)*.1;uv=(uv-.5)*(1.+.03*sin(uT*.3))+.5+vec2(sin(uT*.35),cos(uT*.28))*.01;
 vec3 img=texture2D(uTex,uv).rgb;
 float dim=1.-.62*uFa*(1.-uHl);
 float vis=(.7+.5*uHl)*smoothstep(.0,.2,nv)*dim;
 float s1=smoothstep(.55,.95,Rr.y*.8+Rr.x*.4)*.35;float s2=smoothstep(.8,.985,dot(Rr,normalize(vec3(-.6,.2,.8))))*.7;
 vec3 red=vec3(1.,.06,.03);
 vec3 col=img*vis+vec3(.012)+vec3(.9)*(s1+s2)*.8*dim+vec3(.85)*fr*.45*dim+red*fr*fr*.55*uHl;
 col+=red*.05*uHl*smoothstep(.85,1.,sin(uv.y*60.-uT*4.));
 gl_FragColor=vec4(col,1.);}`,
    });
  }

  /* ---------- build the world ---------- */
  let objs: THREE.Object3D[] = [];
  let spheres: THREE.Mesh[] = [];
  let centers: THREE.Vector3[] = [];

  function disposeObjs() {
    objs.forEach((o) => {
      group.remove(o);
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.LineSegments) {
        o.geometry.dispose();
        if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
      }
    });
    objs = [];
    spheres = [];
  }

  function build() {
    disposeObjs();
    const asp = window.innerWidth / window.innerHeight;
    const W = VH * asp;
    const desk = asp > 1.1;
    const C = desk ? [0, 10, 0] : [0, 50, 0];
    const BP = desk ? DESKTOP_BRANDS : MOBILE_BRANDS;
    centers = [
      new THREE.Vector3(C[0], C[1], C[2]),
      ...BP.slice(0, nB).map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    ];
    const RS = [desk ? 98 : 66, ...Array.from({ length: nB }, () => (desk ? 56 : 36))];
    const core = centers[0];
    const edges: Edge[] = [];
    const nodes: Array<{ p: THREE.Vector3; s: number; c: number; d: number }> = [];
    const add = (a: THREE.Vector3, b: THREE.Vector3, o: Partial<Edge>) =>
      edges.push({
        a: a.clone(),
        b: b.clone(),
        w: 0.5,
        seg: 8,
        cv: 0.2,
        c: 0,
        d0: 0,
        d1: 0,
        jit: 0,
        ...o,
      });
    const arrive = (i: number) => (i ? 0.5 + i * 0.07 : 0.02);

    // primary arcs core -> brand (3 filaments each)
    for (let i = 1; i <= nB; i++) {
      for (let k = 0; k < 3; k++) {
        add(core, centers[i], {
          c: i,
          w: 1,
          seg: 30,
          cv: 0.3,
          d0: 0.12 + i * 0.04,
          d1: arrive(i) - 0.02,
          jit: k * 1.4,
        });
      }
    }
    // ring links
    RING.filter(([a, b]) => a <= nB && b <= nB).forEach(([a, b], q) => {
      for (let k = 0; k < 2; k++) {
        add(centers[a], centers[b], {
          c: a,
          w: 0.8,
          seg: 26,
          cv: 0.34,
          d0: 0.62 + q * 0.03,
          d1: 0.9,
          jit: k * 1.6,
        });
      }
    });
    // dendrite hairs
    centers.forEach((p, i) => {
      const n = i ? 56 : 110;
      const Rs = RS[i];
      for (let k = 0; k < n; k++) {
        const dr = randomUnit();
        const s = p.clone().addScaledVector(dr, Rs * 0.98);
        const len = Rs * rnd(0.7, 2.6);
        add(s, s.clone().addScaledVector(dr, len), {
          c: i,
          w: 0.3,
          seg: 6,
          cv: 0.5,
          d0: arrive(i) + 0.05,
          d1: arrive(i) + 0.15,
        });
        if (Math.random() < 0.6) {
          const e = s.clone().addScaledVector(dr, len * 0.6);
          add(e, e.clone().addScaledVector(randomUnit(), len * 0.5), {
            c: i,
            w: 0.2,
            seg: 4,
            cv: 0.4,
            d0: arrive(i) + 0.12,
            d1: arrive(i) + 0.2,
          });
        }
      }
    });
    // backdrop network
    const bd: THREE.Vector3[] = [];
    const backdropCount = desk ? 260 : 150;
    for (let i = 0; i < backdropCount; i++) {
      const p = new THREE.Vector3(rnd(-W * 0.72, W * 0.72), rnd(-470, 470), rnd(-460, 280));
      if (p.distanceTo(core) < 155) continue;
      bd.push(p);
      nodes.push({ p, s: rnd(1.6, 6), c: 0, d: rnd(0.25, 0.75) });
    }
    bd.forEach((a) => {
      bd.map((b) => ({ b, d: a.distanceTo(b) }))
        .filter((o) => o.d > 1 && o.d < 260)
        .sort((x, y) => x.d - y.d)
        .slice(0, 3)
        .forEach((o) => add(a, o.b, { c: 0, w: 0.12, seg: 6, cv: 0.25, d0: 0.3, d1: 0.8 }));
      // free dendrites
      const sprouts = Math.random() < 0.55 ? 2 : 1;
      for (let k = 0; k < sprouts; k++) {
        const end = a.clone().addScaledVector(randomUnit(), rnd(28, 70));
        add(a, end, { c: 0, w: 0.08, seg: 4, cv: 0.45, d0: 0.35, d1: 0.85 });
      }
    });
    // tie the backdrop into the orbs
    centers.forEach((c, i) => {
      bd.map((b) => ({ b, d: b.distanceTo(c) }))
        .sort((x, y) => x.d - y.d)
        .slice(0, i ? 4 : 6)
        .forEach((o) =>
          add(c, o.b, { c: i, w: 0.18, seg: 10, cv: 0.3, d0: arrive(i) + 0.1, d1: arrive(i) + 0.3 }),
        );
    });

    const NS = edges.length;
    const NN = nodes.length + nAll;
    const P: number[] = [];
    const T: number[] = [];
    const E: number[] = [];
    const D: number[] = [];
    const Cc: number[] = [];
    const Ww: number[] = [];
    edges.forEach((e) => {
      const mid = e.a.clone().add(e.b).multiplyScalar(0.5);
      const len = e.a.distanceTo(e.b);
      const pr = randomUnit().cross(e.b.clone().sub(e.a)).normalize();
      const ctrl = mid.addScaledVector(pr, len * e.cv * rnd(-1, 1));
      if (e.jit) ctrl.addScaledVector(randomUnit(), e.jit * 3);
      const seed = Math.random();
      const bz = (t: number) => {
        const u = 1 - t;
        return new THREE.Vector3()
          .addScaledVector(e.a, u * u)
          .addScaledVector(ctrl, 2 * u * t)
          .addScaledVector(e.b, t * t);
      };
      for (let s = 0; s < e.seg; s++) {
        const t0 = s / e.seg;
        const t1 = (s + 1) / e.seg;
        ([
          [bz(t0), t0],
          [bz(t1), t1],
        ] as Array<[THREE.Vector3, number]>).forEach(([v, t]) => {
          P.push(v.x, v.y, v.z);
          T.push(t);
          E.push(seed);
          D.push(e.d0 + (e.d1 - e.d0) * t);
          Cc.push(e.c);
          Ww.push(e.w);
        });
      }
    });
    const F = (a: number[], n: number) => new THREE.Float32BufferAttribute(a, n);
    const g1 = new THREE.BufferGeometry();
    g1.setAttribute("position", F(P, 3));
    g1.setAttribute("aT", F(T, 1));
    g1.setAttribute("aE", F(E, 1));
    g1.setAttribute("aD", F(D, 1));
    g1.setAttribute("aC", F(Cc, 1));
    g1.setAttribute("aW", F(Ww, 1));
    const ls = new THREE.LineSegments(g1, edgeMat);
    ls.frustumCulled = false;
    group.add(ls);
    objs.push(ls);

    // backdrop points
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute("position", F(nodes.flatMap((n) => [n.p.x, n.p.y, n.p.z]), 3));
    g2.setAttribute("aS", F(nodes.map((n) => n.s), 1));
    g2.setAttribute("aC", F(nodes.map(() => 0), 1));
    g2.setAttribute("aE", F(nodes.map(() => Math.random()), 1));
    g2.setAttribute("aD", F(nodes.map((n) => n.d), 1));
    const ps = new THREE.Points(g2, ptMat);
    ps.frustumCulled = false;
    group.add(ps);
    objs.push(ps);

    // halos
    const g3 = new THREE.BufferGeometry();
    g3.setAttribute("position", F(centers.flatMap((p) => [p.x, p.y, p.z]), 3));
    g3.setAttribute(
      "aS",
      F([desk ? 560 : 400, ...Array.from({ length: nB }, () => (desk ? 330 : 230))], 1),
    );
    g3.setAttribute("aC", F(Array.from({ length: nAll }, (_, i) => i), 1));
    g3.setAttribute("aD", F(Array.from({ length: nAll }, (_, i) => (i ? 0.43 + i * 0.07 : 0)), 1));
    const hp = new THREE.Points(g3, haloMat);
    hp.frustumCulled = false;
    hp.renderOrder = 2;
    group.add(hp);
    objs.push(hp);

    // orbs
    centers.forEach((p, i) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(RS[i], 64, 48), orbMat(i));
      mesh.position.copy(p);
      group.add(mesh);
      objs.push(mesh);
      spheres.push(mesh);
    });
    if (nnEl) nnEl.textContent = String(NN);
    if (nsEl) nsEl.textContent = String(NS);
  }

  /* ---------- interaction ---------- */
  function fire(p: THREE.Vector3) {
    U.uFire.value.set(p.x, p.y, p.z, now());
    lastFire = now();
  }

  function doEnter(i: number) {
    if (enterIndex !== null || now() - T0 < 6 || !brands[i]) return;
    enterIndex = i;
    focus = i;
    fire(centers[i + 1]);
    if (toast) {
      const b = toast.querySelector("b");
      const span = toast.querySelector("span");
      if (b) b.textContent = brands[i].label;
      if (span) span.textContent = "در حال ورود…";
    }
    later(() => toast?.classList.add("on"), 700);
    later(() => onEnter(brands[i].slug), 1700);
  }

  links.forEach((a, i) => {
    const enterLink = () => {
      m.t = now();
      lock = i;
      ring?.classList.add("big");
    };
    const leaveLink = () => {
      if (lock === i) lock = -1;
      ring?.classList.remove("big");
    };
    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }
      event.preventDefault();
      doEnter(i);
    };
    a.addEventListener("mouseenter", enterLink);
    a.addEventListener("mouseleave", leaveLink);
    a.addEventListener("focus", enterLink);
    a.addEventListener("blur", leaveLink);
    a.addEventListener("click", onClick);
    cleanups.push(() => {
      a.removeEventListener("mouseenter", enterLink);
      a.removeEventListener("mouseleave", leaveLink);
      a.removeEventListener("focus", enterLink);
      a.removeEventListener("blur", leaveLink);
      a.removeEventListener("click", onClick);
    });
  });
  goButtons.forEach((btn) => {
    const i = Number(btn.dataset.nxGo);
    const onClick = () => doEnter(i);
    btn.addEventListener("click", onClick);
    cleanups.push(() => btn.removeEventListener("click", onClick));
  });

  const sp = Array.from({ length: nAll }, () => ({ x: 0, y: 0 }));

  const brandDist = (i: number) => Math.hypot(sp[i + 1].x - m.px, sp[i + 1].y - m.py);

  const setHoverAnchor = (i: number) => {
    hoverAnchor.i = i;
    hoverAnchor.x = m.px;
    hoverAnchor.y = m.py;
  };

  const clearHoverAnchor = () => {
    hoverAnchor.i = -1;
  };

  const raycastBrand = () => {
    if (spheres.length <= 1) return -1;
    pointerNDC.set((m.px / window.innerWidth) * 2 - 1, -(m.py / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointerNDC, camera);
    const brandMeshes = spheres.slice(1);
    const hits = raycaster.intersectObjects(brandMeshes, false);
    if (!hits.length) return -1;
    const idx = brandMeshes.indexOf(hits[0].object as THREE.Mesh);
    return idx >= 0 ? idx : -1;
  };

  /** Screen acquire + pointer-anchored sticky hold (safe under strong camera zoom). */
  const nearestBrand = (current: number) => {
    const rayHit = raycastBrand();

    let best = Infinity;
    let found = -1;
    for (let i = 0; i < nB; i++) {
      const d = brandDist(i);
      if (d < best) {
        best = d;
        found = i;
      }
    }
    const screenHit = best < ACQUIRE_R ? found : -1;
    const acquired = rayHit >= 0 ? rayHit : screenHit;

    if (hoverAnchor.i >= 0) {
      const travel = Math.hypot(m.px - hoverAnchor.x, m.py - hoverAnchor.y);
      // Pointer barely moved — keep zoomed brand even if projection drifted.
      if (travel < POINTER_HOLD) return hoverAnchor.i;
      // Still over the same mesh via raycast — refresh anchor, keep focus.
      if (rayHit === hoverAnchor.i) {
        setHoverAnchor(hoverAnchor.i);
        return hoverAnchor.i;
      }
      // Moved onto another brand deliberately.
      if (acquired >= 0 && acquired !== hoverAnchor.i && travel > POINTER_HOLD) {
        setHoverAnchor(acquired);
        return acquired;
      }
      // Left the hold zone and nothing else acquired.
      if (travel > POINTER_LEAVE && acquired < 0 && rayHit < 0) {
        clearHoverAnchor();
        return -1;
      }
      return hoverAnchor.i;
    }

    if (acquired >= 0) {
      setHoverAnchor(acquired);
      return acquired;
    }

    if (current >= 0 && brandDist(current) < ACQUIRE_R * 0.85) {
      setHoverAnchor(current);
      return current;
    }

    return -1;
  };

  listen(window, "pointermove", (e) => {
    m.px = e.clientX;
    m.py = e.clientY;
    m.nx = e.clientX / window.innerWidth - 0.5;
    m.ny = e.clientY / window.innerHeight - 0.5;
    m.t = now();
    const tf = `translate(${e.clientX}px,${e.clientY}px)`;
    if (cur) cur.style.transform = tf;
    if (ring) ring.style.transform = tf;
  });
  listen(window, "pointerdown", (e) => {
    const target = e.target as Element | null;
    if (target?.closest(".nx-idx,.nx-pane,.nx-links,.nx-prog")) return;
    m.px = e.clientX;
    m.py = e.clientY;
    m.t = now();
    const hit = nearestBrand(focus);
    if (hit >= 0 && hit === focus) doEnter(hit);
  });

  const cycle = 3 + 4 * nB;
  const reset = () => {
    T0 = reduced ? now() - 12 : now();
    enterIndex = null;
    focus = -1;
    clearHoverAnchor();
    toast?.classList.remove("on");
    root.classList.remove("is-in", "is-open", "is-tags");
    void root.offsetWidth;
    root.classList.add("is-open");
    if (reduced) {
      root.classList.add("is-in", "is-tags");
    } else {
      later(() => root.classList.add("is-in"), 3000);
      later(() => root.classList.add("is-tags"), 5200);
    }
  };
  if (rpEl) {
    const onReplay = (e: Event) => {
      e.preventDefault();
      reset();
    };
    rpEl.addEventListener("click", onReplay);
    cleanups.push(() => rpEl.removeEventListener("click", onReplay));
  }

  let resizeTimer = 0;
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (boot) build();
  }
  listen(window, "resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 250);
  });
  cleanups.push(() => window.clearTimeout(resizeTimer));

  const v3 = new THREE.Vector3();
  const camT = new THREE.Vector3();
  const camL = new THREE.Vector3();
  const camLc = new THREE.Vector3();

  function loop() {
    if (disposed) return;
    const t = now();
    const tt = t - T0;
    U.uT.value = t;
    U.uGrow.value = ease((tt - 0.7) / 4.6) * 1.25;
    if (tt > 3) root.classList.add("is-in");
    if (tt > 5.2) root.classList.add("is-tags");
    group.updateMatrixWorld();
    centers.forEach((c, i) => {
      v3.copy(c).applyMatrix4(group.matrixWorld).project(camera);
      sp[i].x = (v3.x * 0.5 + 0.5) * window.innerWidth;
      sp[i].y = (-v3.y * 0.5 + 0.5) * window.innerHeight;
    });

    // focus only from pointer hover (or nav lock / enter) — no auto tour
    let f = -1;
    if (enterIndex !== null) f = enterIndex;
    else if (lock >= 0) f = lock;
    else if (tt > 6) f = nearestBrand(focus);
    if (f !== focus && enterIndex === null) {
      const switchingBrands = f >= 0 && focus >= 0;
      if (!switchingBrands || t - lastFocusChange >= FOCUS_SWITCH_GAP) {
        focus = f;
        lastFocusChange = t;
        if (f < 0) clearHoverAnchor();
      }
    }
    if (focus !== shownF) {
      shownF = focus;
      if (focus >= 0) fire(centers[focus + 1]);
      panes.forEach((p, i) => p.classList.toggle("on", i === focus));
      links.forEach((a, i) => a.classList.toggle("on", i === focus));
      if (hvEl) hvEl.textContent = focus >= 0 ? brands[focus].latin : "OVERVIEW";
      if (ghost) {
        ghost.style.opacity = "0";
        later(() => {
          if (shownF === focus && ghost) {
            ghost.textContent = focus >= 0 ? brands[focus].latin : "HANS";
            ghost.style.opacity = "1";
          }
        }, 350);
      }
      tags.forEach((d, i) => d.classList.toggle("h", focus >= 0 && i !== focus));
    }
    if (focus < 0 && tt > 6 && t - lastFire > 3.2 && !reduced) {
      fire(centers[Math.floor(Math.random() * nAll)]);
    }

    // highlights — soft ease in/out with focus
    const hlEase = focus >= 0 ? 0.034 : 0.028;
    for (let i = 0; i < nAll; i++) {
      const target = i === 0 ? (focus < 0 ? 1 : 0) : i - 1 === focus ? 1 : 0;
      H[i] += (target - H[i]) * hlEase;
    }
    U.uFa.value += ((focus >= 0 ? 1 : 0) - U.uFa.value) * hlEase;
    spheres.forEach((s, i) => {
      const arr = i ? 0.5 + i * 0.07 : 0.02;
      const k = ease((U.uGrow.value - arr) / 0.22);
      s.scale.setScalar(Math.max(0.001, k) * (1 + H[i] * 0.08 * (i ? 1 : 0)));
      (s.material as THREE.ShaderMaterial).uniforms.uHl.value = H[i];
    });

    // motion
    const rY = focus >= 0 || reduced ? 0 : Math.sin(t * 0.16) * 0.3 + m.nx * 0.22;
    const rX = focus >= 0 || reduced ? 0 : m.ny * 0.12;
    const rotEase = focus >= 0 ? 0.022 : 0.026;
    group.rotation.y += (rY - group.rotation.y) * rotEase;
    group.rotation.x += (rX - group.rotation.x) * rotEase;
    centers.forEach((c, i) => {
      if (i && !reduced) {
        // Freeze bob while focused so screen-space pick stays stable.
        const amp = focus >= 0 ? 0 : 5;
        const y = c.y + Math.sin(t * 0.8 + i) * amp;
        spheres[i].position.y += (y - spheres[i].position.y) * (focus >= 0 ? 0.042 : 0.055);
      }
    });

    // camera — cinematic ease in on hover, softer ease out on leave
    const wide = window.innerWidth / window.innerHeight > 1.1;
    const dz = 1 + Math.max(0, 1 - tt / 4.4) * 1.3;
    const baseZ = camZ * dz * (wide ? 1.04 : 1.5);
    camT.set(m.nx * 30, m.ny * -20 + 10, baseZ);
    camL.set(0, 0, 0);
    if (focus >= 0) {
      v3.copy(centers[focus + 1]).applyMatrix4(group.matrixWorld);
      const approachZ = enterIndex !== null ? 200 : 330;
      camT.set(v3.x * 0.78, v3.y * 0.78, v3.z + approachZ);
      camL.copy(v3).multiplyScalar(0.92);
    }
    const camEase =
      enterIndex !== null ? 0.042 : focus >= 0 ? 0.016 : 0.02;
    const lookEase =
      enterIndex !== null ? 0.055 : focus >= 0 ? 0.02 : 0.024;
    camera.position.lerp(camT, camEase);
    camLc.lerp(camL, lookEase);
    camera.lookAt(camLc);

    // Cursor affordance when a brand is under the pointer / locked.
    root.style.cursor = focus >= 0 && enterIndex === null ? "pointer" : "";

    // tags
    tags.forEach((d, i) => {
      d.style.transform = `translate(${sp[i + 1].x + (window.innerWidth > 760 ? 72 : 44)}px,${sp[i + 1].y - 6}px)`;
    });

    // progress
    const q = Math.max(0, (tt - 6) % cycle) / cycle;
    if (pbEl) pbEl.style.width = `${tt > 6 ? q * 100 : 0}%`;
    if (tcEl) tcEl.textContent = `00:${String(Math.floor(tt % 60)).padStart(2, "0")}`;
    updTex(t);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  const fontsReady = Promise.race([
    document.fonts.ready,
    new Promise((resolve) => window.setTimeout(resolve, 2500)),
  ]).catch(() => {});
  void fontsReady.then(() => {
    if (disposed) return;
    resize();
    build();
    boot = true;
    T0 = reduced ? now() - 12 : now();
    root.classList.add("is-open");
    if (reduced) root.classList.add("is-in", "is-tags");
    loop();
  });

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
    cleanups.forEach((fn) => fn());
    disposeObjs();
    edgeMat.dispose();
    ptMat.dispose();
    haloMat.dispose();
    textures.forEach((tex) => tex.dispose());
    renderer.dispose();
    root.classList.remove("is-open", "is-in", "is-tags");
    root.style.cursor = "";
    clearHoverAnchor();
    panes.forEach((p) => p.classList.remove("on"));
    links.forEach((a) => a.classList.remove("on"));
    toast?.classList.remove("on");
    if (ghost) {
      ghost.textContent = "HANS";
      ghost.style.opacity = "";
    }
  };
}
