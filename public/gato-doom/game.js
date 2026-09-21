/* TILCAYO RULES — FPS de laberintos protagonizado por el felino Tilcayo.
   Three.js r128 (UMD, cargado localmente) + PointerLockControls. */

(() => {
  'use strict';

  // ---------------------------------------------------------------------
  // Constantes
  // ---------------------------------------------------------------------
  const CELL = 4;
  const WALL_H = 4;
  const EYE_H = 0.85;             // Tilcayo es pequeño: ve el mundo a ras de suelo
  const PLAYER_RADIUS = 0.35;
  const POINTS_PER_CAT = 7;
  const WEAPON_EVERY = 5;        // un arma nueva cada 5 niveles
  const MAX_K = 20;              // tope de tamaño: laberinto de 41x41
  const AGGRO = 12;              // distancia (en celdas) a la que un gato te persigue
  const RECORDS_KEY = 'tilcayoRules.records';
  const NAME_KEY = 'tilcayoRules.lastName';

  // Laberinto actual (se regenera en cada nivel)
  let maze = [];
  let GRID_W = 0;
  let GRID_H = 0;

  function isWallCell(gx, gz) {
    if (gx < 0 || gz < 0 || gz >= GRID_H || gx >= GRID_W) return true;
    return maze[gz][gx] === 1;
  }
  function cellCenter(gx, gz) {
    return { x: gx * CELL + CELL / 2, z: gz * CELL + CELL / 2 };
  }

  // Laberinto perfecto (backtracker) + algunos muros abiertos para crear ciclos
  function genMaze(k) {
    const W = 2 * k + 1;
    const m = [];
    for (let z = 0; z < W; z++) m.push(new Array(W).fill(1));
    const stack = [[1, 1]];
    m[1][1] = 0;
    while (stack.length) {
      const [x, z] = stack[stack.length - 1];
      const opts = [];
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const nx = x + dx, nz = z + dz;
        if (nx > 0 && nz > 0 && nx < W - 1 && nz < W - 1 && m[nz][nx] === 1) opts.push([dx, dz]);
      }
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dz] = opts[Math.floor(Math.random() * opts.length)];
      m[z + dz / 2][x + dx / 2] = 0;
      m[z + dz][x + dx] = 0;
      stack.push([x + dx, z + dz]);
    }
    const attempts = Math.floor(k * k * 0.5);
    for (let i = 0; i < attempts; i++) {
      const x = 1 + Math.floor(Math.random() * (W - 2));
      const z = 1 + Math.floor(Math.random() * (W - 2));
      if (m[z][x] !== 1) continue;
      const horiz = m[z][x - 1] === 0 && m[z][x + 1] === 0 && m[z - 1][x] === 1 && m[z + 1][x] === 1;
      const vert = m[z - 1][x] === 0 && m[z + 1][x] === 0 && m[z][x - 1] === 1 && m[z][x + 1] === 1;
      if (horiz || vert) m[z][x] = 0;
    }
    return m;
  }

  // Distancias (en celdas) desde una celda a todas las demás; -1 = inalcanzable
  function bfs(sx, sz) {
    const dist = new Int32Array(GRID_W * GRID_H).fill(-1);
    const queue = [[sx, sz]];
    dist[sz * GRID_W + sx] = 0;
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      const d = dist[z * GRID_W + x];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (!isWallCell(nx, nz) && dist[nz * GRID_W + nx] < 0) {
          dist[nz * GRID_W + nx] = d + 1;
          queue.push([nx, nz]);
        }
      }
    }
    return dist;
  }

  function circleHitsWall(x, z, radius) {
    const diag = radius * Math.SQRT1_2;
    const pts = [
      [x - radius, z], [x + radius, z],
      [x, z - radius], [x, z + radius],
      [x - diag, z - diag], [x + diag, z - diag],
      [x - diag, z + diag], [x + diag, z + diag],
      [x, z],
    ];
    for (const [px, pz] of pts) {
      if (isWallCell(Math.floor(px / CELL), Math.floor(pz / CELL))) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------
  // Temas / paisajes (rotan cada nivel)
  // ---------------------------------------------------------------------
  const THEMES = [
    { name: 'Selva tupida', jungle: true, wall: '#1f4a1f', mortar: '#0f2a10', bark: '#4a3320', leaves: ['#3f8a35', '#1f5a25', '#6ab04a'],
      floor: '#2a3a1a', floorLine: '#2a3a1a', ceil: '#0f2a1a', dot: '#4aff8a', fog: 0x0d2a1a, near: 3, far: 20, amb: 0x447755, ambI: 0.8, lights: [0x7aff7a, 0xd0ff5a] },
    { name: 'Bosque de enredaderas', jungle: true, wall: '#173a24', mortar: '#0a1f12', bark: '#3a2a20', leaves: ['#2f7a4a', '#154a30', '#8ad06a'],
      floor: '#20301a', floorLine: '#20301a', ceil: '#0a2418', dot: '#b0ff6a', fog: 0x0a2418, near: 2.5, far: 18, amb: 0x336a55, ambI: 0.8, lights: [0xb0ff7a, 0x6affc0] },
    { name: 'Bosque nublado', jungle: true, wall: '#3a5a4a', mortar: '#1a3a2a', bark: '#4a4034', leaves: ['#5a8a6a', '#3a6a52', '#9ac0a0'],
      floor: '#3a4a3a', floorLine: '#3a4a3a', ceil: '#6a8a7a', dot: '#ffffff', fog: 0x6a8a7a, near: 3, far: 22, amb: 0xaaccbb, ambI: 0.9, lights: [0xe0ffe8, 0xa0e0c0] },
    { name: 'Callejón nocturno', wall: '#5a3624', mortar: '#2c1810', floor: '#3a2a1e', floorLine: '#241a12',
      ceil: '#150d0a', dot: '#000000', fog: 0x0a0604, near: 4, far: 26, amb: 0x554433, ambI: 0.55, lights: [0xff6a3a, 0x3a6aff] },
    { name: 'Quebrada al atardecer', wall: '#b5532f', mortar: '#7a2f18', floor: '#c9a06a', floorLine: '#a07840',
      ceil: '#e8a56a', dot: '#ffe0b0', fog: 0xd08a5a, near: 6, far: 34, amb: 0xffd0a0, ambI: 0.9, lights: [0xffcf8a, 0xff9a5a] },
    { name: 'Salar de Uyuni', wall: '#dfe8ee', mortar: '#9ab0bc', floor: '#f0f4f6', floorLine: '#c0d0d8',
      ceil: '#8ec5e8', dot: '#ffffff', fog: 0xbfe0f0, near: 8, far: 40, amb: 0xffffff, ambI: 1.0, lights: [0xffffff, 0xaee0ff] },
    { name: 'Volcán', wall: '#3a1a1a', mortar: '#c03a10', floor: '#2a1010', floorLine: '#601808',
      ceil: '#1a0505', dot: '#ff6a1a', fog: 0x2a0800, near: 3, far: 22, amb: 0x662211, ambI: 0.7, lights: [0xff4a1a, 0xffa01a] },
    { name: 'Noche de hielo', wall: '#3a5a8a', mortar: '#1a2a4a', floor: '#c8dcf0', floorLine: '#90b0d0',
      ceil: '#050a1a', dot: '#ffffff', fog: 0x0a1428, near: 4, far: 28, amb: 0x5577aa, ambI: 0.8, lights: [0x6ab0ff, 0xb0e0ff] },
  ];

  // ---------------------------------------------------------------------
  // Texturas procedurales
  // ---------------------------------------------------------------------
  function makeCanvas(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }
  function repeating(c, rx, ry) {
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rx, ry);
    return tex;
  }

  function brickTexture(t) {
    const size = 128;
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = t.wall;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = t.mortar;
    ctx.lineWidth = 3;
    const rowH = 16;
    for (let y = 0; y < size; y += rowH) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      const offset = (y / rowH) % 2 === 0 ? 0 : 16;
      for (let x = -offset; x < size; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + rowH); ctx.stroke();
      }
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
    return repeating(c, 1, 1);
  }

  // Pared de selva: troncos, follaje denso y enredaderas colgantes
  function jungleTexture(t) {
    const size = 128;
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = t.wall;
    ctx.fillRect(0, 0, size, size);
    for (const tx of [10, 42, 78, 108]) {
      const w = 10 + Math.random() * 8;
      ctx.fillStyle = t.bark;
      ctx.fillRect(tx - w / 2, 0, w, size);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        const bx = tx - w / 2 + Math.random() * w;
        ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + (Math.random() - 0.5) * 4, size); ctx.stroke();
      }
    }
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = t.leaves[i % t.leaves.length];
      ctx.globalAlpha = 0.55 + Math.random() * 0.4;
      ctx.beginPath();
      ctx.ellipse(Math.random() * size, Math.random() * size, 5 + Math.random() * 9, 2.5 + Math.random() * 4, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    for (let v = 0; v < 7; v++) {
      const vx = Math.random() * size, len = 50 + Math.random() * 70;
      ctx.strokeStyle = t.leaves[1];
      ctx.lineWidth = 1.5 + Math.random() * 1.5;
      ctx.beginPath(); ctx.moveTo(vx, 0);
      ctx.bezierCurveTo(vx + 14, len * 0.3, vx - 14, len * 0.6, vx + (Math.random() - 0.5) * 12, len);
      ctx.stroke();
      ctx.fillStyle = t.leaves[2];
      for (let l = 0; l < 4; l++) {
        ctx.beginPath(); ctx.ellipse(vx + (Math.random() - 0.5) * 10, len * (0.2 + l * 0.22), 3.5, 2, Math.random() * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.18 + ')';
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
    return repeating(c, 1, 1);
  }

  function floorTexture(t) {
    const size = 128;
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = t.floor;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = t.floorLine;
    ctx.lineWidth = 2;
    for (let p = 0; p <= size; p += 32) {
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    }
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
    return repeating(c, GRID_W, GRID_H);
  }

  function ceilingTexture(t) {
    const size = 128;
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = t.ceil;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = t.dot;
      ctx.globalAlpha = 0.15 + Math.random() * 0.5;
      const s = 1 + Math.random() * 2.5;
      ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
    }
    ctx.globalAlpha = 1;
    return repeating(c, GRID_W / 2, GRID_H / 2);
  }

  function hairballTexture() {
    const size = 32;
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c9b896';
    ctx.beginPath(); ctx.arc(16, 16, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a7a5a';
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      const a = Math.random() * Math.PI * 2;
      ctx.moveTo(16, 16);
      ctx.lineTo(16 + Math.cos(a) * 15, 16 + Math.sin(a) * 15);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
  }

  // Felinos enemigos: sprites 2D (billboards), cada especie con su aspecto y tamaño
  function drawCatSprite(look, dead) {
    const c = makeCanvas(128);
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);                       // se dibuja en coordenadas de 64x64
    const cx = 32, cy = 38;
    const spots = [[-10, -10], [8, -12], [-4, -6], [12, -4], [-13, 0], [3, -14], [-8, 4], [10, 4], [0, -2], [-14, -6], [14, -10]];
    if (!dead) {
      if (look.mane) {
        ctx.fillStyle = look.mane;
        ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = look.ear;
      ctx.beginPath(); ctx.moveTo(cx - 16, cy - 14); ctx.lineTo(cx - 22, cy - 30); ctx.lineTo(cx - 6, cy - 20); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 16, cy - 14); ctx.lineTo(cx + 22, cy - 30); ctx.lineTo(cx + 6, cy - 20); ctx.fill();
      if (look.pattern === 'tufts') {
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 22, cy - 30); ctx.lineTo(cx - 25, cy - 38); ctx.moveTo(cx + 22, cy - 30); ctx.lineTo(cx + 25, cy - 38); ctx.stroke();
      }
      ctx.fillStyle = look.body;
      ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = look.patternColor; ctx.fillStyle = look.patternColor; ctx.lineWidth = 1.6;
      if (look.pattern === 'stripes') {
        ctx.beginPath();
        for (const k of [-12, -6, 6, 12]) { ctx.moveTo(cx + k, cy - 17); ctx.lineTo(cx + k * 0.6, cy - 8); }
        ctx.moveTo(cx - 17, cy - 2); ctx.lineTo(cx - 10, cy);
        ctx.moveTo(cx + 17, cy - 2); ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx - 16, cy + 6); ctx.lineTo(cx - 9, cy + 6);
        ctx.moveTo(cx + 16, cy + 6); ctx.lineTo(cx + 9, cy + 6);
        ctx.stroke();
      } else if (look.pattern === 'rosettes') {
        for (const [dx, dy] of spots.slice(0, 8)) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 2.6, 0, Math.PI * 2); ctx.stroke(); ctx.fillRect(cx + dx - 0.6, cy + dy - 0.6, 1.2, 1.2); }
      } else if (look.pattern === 'spots') {
        for (const [dx, dy] of spots) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.5, 0, Math.PI * 2); ctx.fill(); }
      } else if (look.pattern === 'tufts') {
        ctx.beginPath(); ctx.moveTo(cx - 17, cy + 4); ctx.lineTo(cx - 24, cy + 12); ctx.moveTo(cx + 17, cy + 4); ctx.lineTo(cx + 24, cy + 12);
        ctx.moveTo(cx - 8, cy - 12); ctx.lineTo(cx - 6, cy - 6); ctx.moveTo(cx + 8, cy - 12); ctx.lineTo(cx + 6, cy - 6);
        ctx.stroke();
      }
      ctx.fillStyle = look.snout;
      ctx.beginPath(); ctx.ellipse(cx, cy + 8, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = look.eye;
      ctx.beginPath(); ctx.ellipse(cx - 7, cy - 2, 3.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 7, cy - 2, 3.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(cx - 8, cy - 5, 2, 7);
      ctx.fillRect(cx + 6, cy - 5, 2, 7);
      ctx.beginPath(); ctx.arc(cx, cy + 6, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 8); ctx.lineTo(cx - 24, cy + 5);
      ctx.moveTo(cx - 6, cy + 10); ctx.lineTo(cx - 24, cy + 13);
      ctx.moveTo(cx + 6, cy + 8); ctx.lineTo(cx + 24, cy + 5);
      ctx.moveTo(cx + 6, cy + 10); ctx.lineTo(cx + 24, cy + 13);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(cx - 4, cy + 11); ctx.lineTo(cx - 2.5, cy + 16); ctx.lineTo(cx - 1, cy + 11); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 4, cy + 11); ctx.lineTo(cx + 2.5, cy + 16); ctx.lineTo(cx + 1, cy + 11); ctx.fill();
    } else {
      ctx.fillStyle = look.body;
      ctx.beginPath(); ctx.ellipse(cx, cy + 10, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 4); ctx.lineTo(cx - 4, cy + 10); ctx.moveTo(cx - 4, cy + 4); ctx.lineTo(cx - 10, cy + 10);
      ctx.moveTo(cx + 4, cy + 4); ctx.lineTo(cx + 10, cy + 10); ctx.moveTo(cx + 10, cy + 4); ctx.lineTo(cx + 4, cy + 10);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
  }

  // w/h en unidades de mundo: Tilcayo mide ~0.85, así que todos son mucho más grandes que él
  const SPECIES = [
    { name: 'Lince', minLevel: 1, w: 1.7, h: 1.6, hp: 40, speed: 2.3, dmg: 7, body: '#a89478', ear: '#6a5a44', eye: '#e8d020', snout: '#e0d4c0', pattern: 'tufts', patternColor: '#4a3a28' },
    { name: 'Leopardo', minLevel: 1, w: 2.0, h: 1.9, hp: 50, speed: 2.4, dmg: 8, body: '#e0b860', ear: '#a07a30', eye: '#9aff40', snout: '#f4e8c8', pattern: 'spots', patternColor: '#2a1a08' },
    { name: 'Jaguar', minLevel: 3, w: 2.2, h: 2.1, hp: 65, speed: 2.1, dmg: 10, body: '#d8962a', ear: '#8a5a12', eye: '#ffe030', snout: '#f0d8a0', pattern: 'rosettes', patternColor: '#1a1004' },
    { name: 'Pantera', minLevel: 5, w: 2.1, h: 2.0, hp: 60, speed: 2.5, dmg: 9, body: '#1e1e24', ear: '#101014', eye: '#ffe030', snout: '#3a3a44', pattern: 'none', patternColor: '#000' },
    { name: 'Tigre', minLevel: 7, w: 2.7, h: 2.5, hp: 85, speed: 1.9, dmg: 12, body: '#e8761c', ear: '#a04a10', eye: '#ffd020', snout: '#f8f0e0', pattern: 'stripes', patternColor: '#140a04' },
    { name: 'León', minLevel: 9, w: 2.8, h: 2.7, hp: 100, speed: 1.8, dmg: 14, body: '#d8a850', ear: '#a87a30', eye: '#ffb020', snout: '#f0d8a8', pattern: 'none', patternColor: '#000', mane: '#7a4a18' },
  ];
  for (const sp of SPECIES) {
    sp.tex = { alive: drawCatSprite(sp, false), dead: drawCatSprite(sp, true) };
  }

  // ---------------------------------------------------------------------
  // Audio: efectos sintetizados + música andina (quena y zampoña)
  // ---------------------------------------------------------------------
  let actx = null;
  function audioCtx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    return actx;
  }
  function beep({ freq = 440, dur = 0.1, type = 'square', vol = 0.15, glideTo = null, delay = 0 }) {
    try {
      const ctx = audioCtx();
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch (e) { /* audio no disponible */ }
  }
  const sfx = {
    shoot: () => beep({ freq: 300, glideTo: 120, dur: 0.12, type: 'sawtooth', vol: 0.12 }),
    hit: () => beep({ freq: 180, glideTo: 60, dur: 0.1, type: 'square', vol: 0.15 }),
    meowHurt: () => beep({ freq: 500, glideTo: 700, dur: 0.18, type: 'sine', vol: 0.15 }),
    death: () => beep({ freq: 220, glideTo: 40, dur: 0.4, type: 'sawtooth', vol: 0.18 }),
    hurt: () => beep({ freq: 150, dur: 0.15, type: 'square', vol: 0.15 }),
    boom: () => beep({ freq: 140, glideTo: 30, dur: 0.5, type: 'sawtooth', vol: 0.22 }),
    levelUp: () => [392, 494, 587, 784].forEach((f, i) => beep({ freq: f, dur: 0.25, type: 'triangle', vol: 0.15, delay: i * 0.12 })),
    pickup: () => [523, 659, 784, 1047].forEach((f, i) => beep({ freq: f, dur: 0.18, type: 'square', vol: 0.1, delay: i * 0.08 })),
  };

  const music = (() => {
    const EIGHTH = 0.3;              // segundos por corchea (~100 bpm)
    const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const freqOf = (n) => {
      const m = /^([A-G])(#?)(\d)$/.exec(n);
      const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] ? 1 : 0);
      return 440 * Math.pow(2, (midi - 69) / 12);
    };
    const parse = (str) => str.split(' ').map((tok) => {
      const [n, d] = tok.split(':');
      return { f: n === 'R' ? 0 : freqOf(n), d: Number(d) };
    });

    // Huayño en La menor: la quena lleva la melodía; la zampoña hace bordón y paralelas.
    const BARS = [
      { q: 'E5:2 D5:1 C5:1 A4:2 C5:1 D5:1', z: 'A3:8' },
      { q: 'E5:2 E5:1 G5:1 E5:2 D5:2', z: 'A3:4 G3:4' },
      { q: 'C5:2 D5:1 C5:1 A4:2 G4:2', z: 'F3:4 G3:4' },
      { q: 'A4:6 R:2', z: 'A3:8' },
      { q: 'A4:1 C5:1 D5:2 E5:2 D5:1 C5:1', z: 'PAR' },
      { q: 'A4:2 G4:2 A4:4', z: 'PAR' },
      { q: 'E5:1 G5:1 E5:1 D5:1 C5:2 A4:2', z: 'PAR' },
      { q: 'D5:2 C5:2 A4:4', z: 'PAR' },
    ].map((b) => ({ q: parse(b.q), z: b.z === 'PAR' ? 'PAR' : parse(b.z) }));

    let master = null, noiseBuf = null, timer = null, nextTime = 0, bar = 0;

    function setup() {
      const ctx = audioCtx();
      master = ctx.createGain();
      master.gain.value = 0.32;
      // eco tipo quebrada
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.32;
      const fb = ctx.createGain(); fb.gain.value = 0.3;
      const wet = ctx.createGain(); wet.gain.value = 0.28;
      master.connect(ctx.destination);
      master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    // Tubo soplado: seno + armónico suave + soplido filtrado
    function pipe(t, f, dur, { vol, attack, breath, vib, scoop }) {
      const ctx = audioCtx();
      const end = t + dur;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(vol, t + attack);
      env.gain.setValueAtTime(vol * 0.85, Math.max(t + attack, end - 0.12));
      env.gain.linearRampToValueAtTime(0.0001, end);
      env.connect(master);

      const o1 = ctx.createOscillator(); o1.type = 'sine';
      if (scoop) {
        o1.frequency.setValueAtTime(f * 0.96, t);
        o1.frequency.exponentialRampToValueAtTime(f, t + 0.07);
      } else o1.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2;
      const g2 = ctx.createGain(); g2.gain.value = 0.12;
      o1.connect(env); o2.connect(g2); g2.connect(env);

      if (vib) {
        const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2;
        const lg = ctx.createGain();
        lg.gain.setValueAtTime(0, t);
        lg.gain.linearRampToValueAtTime(f * vib, t + Math.min(dur * 0.6, 0.4));
        lfo.connect(lg); lg.connect(o1.frequency);
        lfo.start(t); lfo.stop(end);
      }

      const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2.5;
      const ng = ctx.createGain(); ng.gain.value = breath;
      ns.connect(bp); bp.connect(ng); ng.connect(env);
      ns.start(t, Math.random() * 0.5); ns.stop(end);

      o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
    }

    const quena = (t, f, dur) => pipe(t, f, dur, { vol: 0.42, attack: 0.06, breath: 0.35, vib: 0.007, scoop: true });
    const zampona = (t, f, dur) => pipe(t, f, dur, { vol: 0.34, attack: 0.03, breath: 0.9, vib: 0, scoop: false });

    function scheduleBar() {
      const b = BARS[bar % BARS.length];
      let t = nextTime;
      for (const n of b.q) {
        const dur = n.d * EIGHTH;
        if (n.f) {
          quena(t, n.f, dur * 0.94);
          if (b.z === 'PAR') zampona(t + 0.015, n.f / 2, dur * 0.9);
        }
        t += dur;
      }
      if (b.z !== 'PAR') {
        t = nextTime;
        for (const n of b.z) {
          const dur = n.d * EIGHTH;
          zampona(t, n.f, dur * 0.97);
          zampona(t, n.f * 1.5, dur * 0.97);   // quinta encima
          t += dur;
        }
      }
      nextTime += 8 * EIGHTH;
      bar++;
    }

    function tick() {
      const ctx = audioCtx();
      while (nextTime < ctx.currentTime + 1.5) scheduleBar();
    }

    return {
      start() {
        if (timer) return;
        try {
          if (!master) setup();
          nextTime = audioCtx().currentTime + 0.15;
          tick();
          timer = setInterval(tick, 300);
        } catch (e) { /* audio no disponible */ }
      },
    };
  })();

  function resumeAudio() { try { audioCtx().resume(); } catch (e) { /* noop */ } }
  function suspendAudio() { try { audioCtx().suspend(); } catch (e) { /* noop */ } }

  // ---------------------------------------------------------------------
  // Armas (una nueva cada 5 niveles)
  // ---------------------------------------------------------------------
  const WEAPONS = [
    { name: 'Garras', melee: true, dmg: 30, rate: 0.35, range: 2.4, cost: 0, pellets: 0, spread: 0, color: 0xffffff, barrel: 0xffffff, len: 1.0, size: 0.1 },
    { name: 'Bolas de pelo', dmg: 25, rate: 0.28, speed: 20, cost: 1, pellets: 1, spread: 0, color: 0xc9b896, barrel: 0x6a4a2a, len: 1.0, size: 0.12 },
    { name: 'Honda andina', dmg: 35, rate: 0.2, speed: 30, cost: 1, pellets: 1, spread: 0, color: 0xb0b0b0, barrel: 0x8a6a3a, len: 0.7, size: 0.09 },
    { name: 'Escopeta de charangos', dmg: 18, rate: 0.65, speed: 26, cost: 2, pellets: 6, spread: 0.09, color: 0xffb84a, barrel: 0x4a2a12, len: 1.2, size: 0.07 },
    { name: 'Ametralladora de quinoa', dmg: 16, rate: 0.09, speed: 34, cost: 1, pellets: 1, spread: 0.03, auto: true, color: 0xf0e0a0, barrel: 0x555555, len: 1.4, size: 0.06 },
    { name: 'Bazuca de dinamita', dmg: 110, rate: 0.9, speed: 18, cost: 3, pellets: 1, spread: 0, splash: 4.5, color: 0xff4a2a, barrel: 0x2a4a2a, len: 1.6, size: 0.2 },
  ];
  const projMats = WEAPONS.map((w) => new THREE.MeshBasicMaterial({ color: w.color }));

  // ---------------------------------------------------------------------
  // Escena
  // ---------------------------------------------------------------------
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0604, 4, 26);
  scene.background = new THREE.Color(0x0a0604);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 100);
  const controls = new THREE.PointerLockControls(camera, document.body);
  scene.add(controls.getObject());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Luces persistentes (cantidad fija: evita recompilar shaders entre niveles)
  const ambient = new THREE.AmbientLight(0x554433, 0.55);
  scene.add(ambient);
  const flashlight = new THREE.PointLight(0xffe0b0, 1.1, 12, 2);
  camera.add(flashlight);
  scene.add(camera);
  const mapLights = [];
  for (let i = 0; i < 8; i++) {
    const pl = new THREE.PointLight(0xffffff, 0.6, 9, 2);
    scene.add(pl);
    mapLights.push(pl);
  }
  const exitLight = new THREE.PointLight(0x3aff7a, 1.2, 10, 2);
  scene.add(exitLight);

  // ---------------------------------------------------------------------
  // Jugador y arma
  // ---------------------------------------------------------------------
  const player = {
    pos: new THREE.Vector3(),
    velY: 0,
    onGround: true,
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    ammoRegenTimer: 0,
    alive: true,
    speed: 4.2,
    sprintMult: 1.6,
    kills: 0,
    score: 0,
    weaponIdx: 0,
    lastShot: 0,
  };

  const weaponModel = new THREE.Group();
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.6 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 10), barrelMat);
  barrel.rotation.x = Math.PI / 2.1;
  barrel.position.set(0, 0, -0.3);
  weaponModel.add(barrel);
  const loadedBallMat = new THREE.MeshBasicMaterial({ color: 0xc9b896 });
  const loadedBall = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), loadedBallMat);
  loadedBall.position.set(0, 0.02, -0.55);
  weaponModel.add(loadedBall);
  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0xd9a86a }));
  paw.position.set(0.05, -0.08, -0.12);
  weaponModel.add(paw);
  weaponModel.position.set(0.28, -0.28, -0.5);
  camera.add(weaponModel);

  // Garras blancas (arma inicial, cuerpo a cuerpo)
  const clawsModel = new THREE.Group();
  const clawMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbbbbbb, emissiveIntensity: 0.6, roughness: 0.3 });
  const furPaw = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), new THREE.MeshStandardMaterial({ color: 0xf2ead8 }));
  furPaw.scale.set(1.2, 0.9, 1.3);
  clawsModel.add(furPaw);
  for (const cx of [-0.06, 0, 0.06]) {
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.3, 8), clawMat);
    claw.rotation.x = -Math.PI / 2;
    claw.position.set(cx, 0.02, -0.24);
    clawsModel.add(claw);
  }
  clawsModel.position.set(0.3, -0.3, -0.5);
  camera.add(clawsModel);
  let slashTimer = 0;

  function equipWeapon(idx) {
    player.weaponIdx = idx;
    const w = WEAPONS[idx];
    weaponModel.visible = !w.melee;
    clawsModel.visible = !!w.melee;
    barrelMat.color.setHex(w.barrel);
    barrel.scale.set(1 + w.size * 2, w.len, 1 + w.size * 2);
    barrel.position.z = -0.1 - 0.2 * w.len;
    loadedBallMat.color.setHex(w.color);
    loadedBall.scale.setScalar(w.size / 0.1);
    loadedBall.position.z = -0.3 - 0.25 * w.len;
    player.maxAmmo = 30 + 10 * idx;
    document.getElementById('weaponName').textContent = w.name.toUpperCase();
  }

  // Proyectiles
  const projectiles = [];
  const projGeo = new THREE.SphereGeometry(1, 8, 8);
  let mouseDown = false;

  function shoot() {
    const w = WEAPONS[player.weaponIdx];
    const now = clock.elapsedTime;
    if (!player.alive || now - player.lastShot < w.rate) return;
    if (w.melee) {
      player.lastShot = now;
      slashTimer = 0.18;
      beep({ freq: 900, glideTo: 300, dur: 0.1, type: 'sawtooth', vol: 0.08 });
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      for (const en of enemies) {
        if (!en.alive) continue;
        const dx = en.pos.x - player.pos.x, dz = en.pos.z - player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < w.range && (d < 0.8 || (dx * fwd.x + dz * fwd.z) / d > 0.6)) damageEnemy(en, w.dmg);
      }
      return;
    }
    if (player.ammo < w.cost) {
      player.lastShot = now;
      beep({ freq: 90, dur: 0.08, type: 'square', vol: 0.1 });
      return;
    }
    player.lastShot = now;
    player.ammo -= w.cost;
    sfx.shoot();
    const base = new THREE.Vector3();
    camera.getWorldDirection(base);
    for (let i = 0; i < w.pellets; i++) {
      const dir = base.clone();
      if (w.spread) {
        dir.x += (Math.random() - 0.5) * 2 * w.spread;
        dir.y += (Math.random() - 0.5) * 2 * w.spread;
        dir.z += (Math.random() - 0.5) * 2 * w.spread;
        dir.normalize();
      }
      const mesh = new THREE.Mesh(projGeo, projMats[player.weaponIdx]);
      mesh.scale.setScalar(w.size);
      mesh.position.copy(camera.position).addScaledVector(dir, 0.6);
      scene.add(mesh);
      projectiles.push({ mesh, dir, w, life: 2.5 });
    }
    weaponModel.position.z = -0.35;
    setTimeout(() => { weaponModel.position.z = -0.5; }, 70);
  }

  // ---------------------------------------------------------------------
  // Nivel
  // ---------------------------------------------------------------------
  let level = 1;
  let theme = THEMES[0];
  let levelGroup = null;
  let exitGroup = null;
  let exitPos = { x: 0, z: 0 };
  let crate = null;           // caja con arma nueva (niveles 5, 10, 15...)
  let seen = [];
  let playerField = null;     // distancias BFS desde el jugador
  let playerCellKey = '';
  const enemies = [];

  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    scene.remove(g);
  }

  function clearEntities() {
    for (const en of enemies) { scene.remove(en.sprite); en.mat.dispose(); }
    enemies.length = 0;
    for (const p of projectiles) scene.remove(p.mesh);
    projectiles.length = 0;
  }

  function buildLevel(n) {
    level = n;
    theme = THEMES[(n - 1) % THEMES.length];
    const k = Math.min(4 + n, MAX_K);
    maze = genMaze(k);
    GRID_H = GRID_W = 2 * k + 1;

    if (levelGroup) disposeGroup(levelGroup);
    clearEntities();
    levelGroup = new THREE.Group();
    scene.add(levelGroup);

    // paisaje
    scene.fog.color.setHex(theme.fog);
    scene.fog.near = theme.near;
    scene.fog.far = theme.far;
    scene.background.setHex(theme.fog);
    ambient.color.setHex(theme.amb);
    ambient.intensity = theme.ambI;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_W * CELL, GRID_H * CELL),
      new THREE.MeshStandardMaterial({ map: floorTexture(theme), roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((GRID_W * CELL) / 2, 0, (GRID_H * CELL) / 2);
    levelGroup.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_W * CELL, GRID_H * CELL),
      new THREE.MeshBasicMaterial({ map: ceilingTexture(theme) }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set((GRID_W * CELL) / 2, WALL_H, (GRID_H * CELL) / 2);
    levelGroup.add(ceiling);

    // muros visibles (solo los que tocan un pasillo)
    const wallCells = [];
    for (let gz = 0; gz < GRID_H; gz++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        if (!isWallCell(gx, gz)) continue;
        if (!isWallCell(gx + 1, gz) || !isWallCell(gx - 1, gz) || !isWallCell(gx, gz + 1) || !isWallCell(gx, gz - 1)) {
          wallCells.push([gx, gz]);
        }
      }
    }
    const walls = new THREE.InstancedMesh(
      new THREE.BoxGeometry(CELL, WALL_H, CELL),
      new THREE.MeshStandardMaterial({ map: theme.jungle ? jungleTexture(theme) : brickTexture(theme), roughness: 0.9 }),
      wallCells.length);
    const dummy = new THREE.Object3D();
    wallCells.forEach(([gx, gz], i) => {
      const { x, z } = cellCenter(gx, gz);
      dummy.position.set(x, WALL_H / 2, z);
      dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
    });
    walls.instanceMatrix.needsUpdate = true;
    levelGroup.add(walls);

    // distancias desde el inicio -> salida en la celda más lejana
    const fromStart = bfs(1, 1);
    let far = 0, farIdx = 0;
    const open = [];
    for (let i = 0; i < fromStart.length; i++) {
      if (fromStart[i] < 0) continue;
      open.push(i);
      if (fromStart[i] > far) { far = fromStart[i]; farIdx = i; }
    }
    const exitCell = { gx: farIdx % GRID_W, gz: Math.floor(farIdx / GRID_W) };
    exitPos = cellCenter(exitCell.gx, exitCell.gz);

    // luces repartidas
    mapLights.forEach((pl, i) => {
      const idx = open[Math.floor(Math.random() * open.length)];
      const c = cellCenter(idx % GRID_W, Math.floor(idx / GRID_W));
      pl.position.set(c.x, 2.6, c.z);
      pl.color.setHex(theme.lights[i % 2]);
    });

    // salida: columna luminosa
    exitGroup = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, WALL_H, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x3aff7a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false }));
    beam.position.y = WALL_H / 2;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xb0ffd0, fog: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.0;
    ring.name = 'ring';
    exitGroup.add(beam, ring);
    exitGroup.position.set(exitPos.x, 0, exitPos.z);
    levelGroup.add(exitGroup);
    exitLight.position.set(exitPos.x, 2, exitPos.z);

    // caja de arma nueva
    crate = null;
    const wantedWeapon = Math.floor(n / WEAPON_EVERY);
    if (n % WEAPON_EVERY === 0 && wantedWeapon < WEAPONS.length && player.weaponIdx < wantedWeapon) {
      const cand = open.filter((i) => fromStart[i] >= far * 0.4 && i !== farIdx);
      const idx = cand[Math.floor(Math.random() * cand.length)];
      const c = cellCenter(idx % GRID_W, Math.floor(idx / GRID_W));
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xffd040, emissive: 0xaa7a00, emissiveIntensity: 0.9, roughness: 0.4 }));
      mesh.position.set(c.x, 1.0, c.z);
      levelGroup.add(mesh);
      crate = { mesh, weapon: wantedWeapon, x: c.x, z: c.z };
    }

    // jugador al inicio
    const start = cellCenter(1, 1);
    player.pos.set(start.x, EYE_H, start.z);
    controls.getObject().position.copy(player.pos);
    controls.getObject().rotation.set(0, 0, 0);
    player.velY = 0;
    playerCellKey = '';

    // gatos: más cada nivel, más rápidos y resistentes
    const count = Math.min(2 + 2 * n, 60);
    const minDist = Math.min(8, Math.floor(far * 0.4));
    const spots = open.filter((i) => fromStart[i] >= minDist && i !== farIdx);
    for (let i = 0; i < count; i++) {
      const idx = spots[Math.floor(Math.random() * spots.length)];
      spawnCat(idx % GRID_W, Math.floor(idx / GRID_W), n);
    }

    // niebla de guerra del minimapa
    seen = [];
    for (let z = 0; z < GRID_H; z++) seen.push(new Array(GRID_W).fill(false));

    document.getElementById('level').textContent = n;
    document.getElementById('themeName').textContent = theme.name.toUpperCase();
    updateCatsLeft();
  }

  function spawnCat(gx, gz, n) {
    const pool = SPECIES.filter((sp) => sp.minLevel <= n);
    const sp = pool[Math.floor(Math.random() * pool.length)];
    const mat = new THREE.SpriteMaterial({ map: sp.tex.alive, transparent: true });
    const sprite = new THREE.Sprite(mat);
    const { x, z } = cellCenter(gx, gz);
    sprite.position.set(x, sp.h / 2, z);
    sprite.scale.set(sp.w, sp.h, 1);
    scene.add(sprite);
    enemies.push({
      sprite, mat, tex: sp.tex, w: sp.w, h: sp.h, species: sp.name,
      hp: sp.hp * Math.min(1 + 0.1 * (n - 1), 3),
      speed: sp.speed + Math.min(0.04 * n, 1.2),
      damage: Math.min(sp.dmg + 0.4 * n, 30),
      alive: true, contactTimer: 0, flashTimer: 0,
      pos: new THREE.Vector3(x, sp.h / 2, z),
    });
  }

  function updateCatsLeft() {
    document.getElementById('catsLeft').textContent = enemies.filter((e) => e.alive).length;
  }

  function damageEnemy(en, dmg) {
    if (!en.alive) return;
    en.hp -= dmg;
    en.flashTimer = 0.1;
    sfx.hit();
    if (en.hp <= 0) killEnemy(en);
  }

  function killEnemy(en) {
    en.alive = false;
    en.mat.map = en.tex.dead;
    en.mat.color.setScalar(1);
    en.mat.needsUpdate = true;
    en.sprite.scale.set(en.w * 1.1, en.h * 0.4, 1);
    en.sprite.position.y = 0.2;
    player.kills++;
    player.score += POINTS_PER_CAT;
    player.ammo = Math.min(player.maxAmmo, player.ammo + 2);
    document.getElementById('score').textContent = player.score;
    updateCatsLeft();
    sfx.death();
  }

  function explode(pos, w) {
    sfx.boom();
    for (const en of enemies) {
      if (!en.alive) continue;
      const d = Math.hypot(en.pos.x - pos.x, en.pos.z - pos.z);
      if (d < w.splash) damageEnemy(en, w.dmg * (1 - 0.6 * d / w.splash));
    }
  }

  function nextLevel() {
    sfx.levelUp();
    buildLevel(level + 1);
    player.health = Math.min(player.maxHealth, player.health + 25);
    player.ammo = player.maxAmmo;
    showToast(`NIVEL ${level} — ${theme.name}`, 2600);
  }

  let toastTimer = null;
  function showToast(text, ms) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

  // ---------------------------------------------------------------------
  // Récords (localStorage)
  // ---------------------------------------------------------------------
  function loadRecords() {
    try { return JSON.parse(localStorage.getItem(RECORDS_KEY)) || []; } catch (e) { return []; }
  }
  function saveRecord(name, score, lvl) {
    const rec = { name, score, level: lvl, date: new Date().toISOString().slice(0, 10) };
    const list = loadRecords();
    list.push(rec);
    list.sort((a, b) => b.score - a.score || b.level - a.level);
    try { localStorage.setItem(RECORDS_KEY, JSON.stringify(list.slice(0, 10))); } catch (e) { /* sin almacenamiento */ }
    return rec;
  }
  function renderRanking(mine) {
    const ol = document.getElementById('ranking');
    ol.innerHTML = '';
    let marked = false;
    for (const r of loadRecords().slice(0, 5)) {
      const li = document.createElement('li');
      li.textContent = `${r.name} — ${r.score} pts (nivel ${r.level})`;
      if (mine && !marked && r.name === mine.name && r.score === mine.score && r.date === mine.date) {
        li.className = 'me';
        marked = true;
      }
      ol.appendChild(li);
    }
  }
  function renderBest() {
    const best = loadRecords()[0];
    document.getElementById('bestRecord').textContent =
      best ? `🏆 RÉCORD: ${best.name} — ${best.score} pts (nivel ${best.level})` : '';
  }

  // ---------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------
  const keys = {};
  let sprinting = false;
  window.addEventListener('keydown', (e) => {
    if (gameState !== 'playing' && gameState !== 'paused') return;
    keys[e.code] = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') sprinting = true;
    if (e.code === 'Escape') {
      if (gameState === 'paused' && !e.repeat && performance.now() - pausedAt > 250) die();
      else pauseGame();
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') sprinting = false;
  });
  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    mouseDown = true;
    if (controls.isLocked) shoot();
  });
  document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });

  // ---------------------------------------------------------------------
  // Controles táctiles (iPhone / Android): joystick izquierdo, arrastrar a la
  // derecha para mirar, botones de disparo / salto / correr / pausa.
  // ---------------------------------------------------------------------
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) {
    document.body.classList.add('touch');
    controls.lock = function () { this.isLocked = true; this.dispatchEvent({ type: 'lock' }); };
    controls.unlock = function () { if (!this.isLocked) return; this.isLocked = false; this.dispatchEvent({ type: 'unlock' }); };

    const ui = document.createElement('div');
    ui.id = 'touchUI';
    ui.innerHTML =
      '<div id="joyBase"><div id="joyKnob"></div></div>' +
      '<button id="tFire" type="button">FUEGO</button>' +
      '<button id="tJump" type="button">SALTO</button>' +
      '<button id="tRun" type="button">CORRER</button>' +
      '<button id="tPause" type="button">II</button>';
    document.body.appendChild(ui);
    const joyBase = document.getElementById('joyBase');
    const joyKnob = document.getElementById('joyKnob');

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    let joyId = null, joyX = 0, joyY = 0;
    let lookId = null, lookX = 0, lookY = 0;

    function setMove(dx, dy) {
      keys['KeyA'] = dx < -18;
      keys['KeyD'] = dx > 18;
      keys['KeyW'] = dy < -18;
      keys['KeyS'] = dy > 18;
    }
    function clearMove() { keys['KeyA'] = keys['KeyD'] = keys['KeyW'] = keys['KeyS'] = false; }

    document.addEventListener('touchstart', (e) => {
      if (gameState !== 'playing') return;
      for (const t of e.changedTouches) {
        if (t.target.closest && t.target.closest('#touchUI button')) continue;
        if (t.clientX < window.innerWidth * 0.5) {
          if (joyId === null) {
            joyId = t.identifier; joyX = t.clientX; joyY = t.clientY;
            joyBase.style.display = 'block';
            joyBase.style.left = (joyX - 55) + 'px';
            joyBase.style.top = (joyY - 55) + 'px';
            joyKnob.style.transform = 'translate(0px, 0px)';
          }
        } else if (lookId === null) {
          lookId = t.identifier; lookX = t.clientX; lookY = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          let dx = t.clientX - joyX, dy = t.clientY - joyY;
          const len = Math.hypot(dx, dy), max = 50;
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          joyKnob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
          setMove(dx, dy);
        } else if (t.identifier === lookId && gameState === 'playing') {
          euler.setFromQuaternion(camera.quaternion);
          euler.y -= (t.clientX - lookX) * 0.006;
          euler.x -= (t.clientY - lookY) * 0.006;
          euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
          camera.quaternion.setFromEuler(euler);
          lookX = t.clientX; lookY = t.clientY;
        }
      }
      if (gameState === 'playing') e.preventDefault();
    }, { passive: false });

    function endTouch(e) {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyId = null; joyBase.style.display = 'none'; clearMove(); }
        if (t.identifier === lookId) lookId = null;
      }
    }
    document.addEventListener('touchend', endTouch);
    document.addEventListener('touchcancel', endTouch);

    function hold(id, down, up) {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); down(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); up(); }, { passive: false });
      el.addEventListener('touchcancel', up);
    }
    hold('tFire', () => { mouseDown = true; if (gameState === 'playing') shoot(); }, () => { mouseDown = false; });
    hold('tJump', () => { keys['Space'] = true; }, () => { keys['Space'] = false; });
    hold('tRun', () => { sprinting = true; }, () => { sprinting = false; });
    hold('tPause', () => { pauseGame(); }, () => {});
  }

  // ---------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------
  const healthFill = document.getElementById('healthFill');
  const ammoCount = document.getElementById('ammoCount');
  const minimap = document.getElementById('minimap');
  const mmCtx = minimap.getContext('2d');
  const hurtFlash = document.getElementById('hurtFlash');

  function updateHUD() {
    healthFill.style.width = Math.max(0, (player.health / player.maxHealth) * 100) + '%';
    ammoCount.textContent = WEAPONS[player.weaponIdx].melee ? '∞' : player.ammo;
  }

  function markSeen() {
    const pgx = Math.floor(player.pos.x / CELL), pgz = Math.floor(player.pos.z / CELL);
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = pgx + dx, z = pgz + dz;
        if (x >= 0 && z >= 0 && x < GRID_W && z < GRID_H) seen[z][x] = true;
      }
    }
  }

  function drawMinimap() {
    const w = minimap.width, h = minimap.height;
    const cw = w / GRID_W, ch = h / GRID_H;
    mmCtx.fillStyle = '#0c0804';
    mmCtx.fillRect(0, 0, w, h);
    for (let gz = 0; gz < GRID_H; gz++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        if (!seen[gz][gx]) continue;
        mmCtx.fillStyle = isWallCell(gx, gz) ? '#6a4a30' : '#241810';
        mmCtx.fillRect(gx * cw, gz * ch, cw + 0.5, ch + 0.5);
      }
    }
    const egx = Math.floor(exitPos.x / CELL), egz = Math.floor(exitPos.z / CELL);
    if (seen[egz][egx]) {
      mmCtx.fillStyle = '#3aff7a';
      mmCtx.fillRect(egx * cw, egz * ch, cw + 0.5, ch + 0.5);
    }
    if (crate && seen[Math.floor(crate.z / CELL)][Math.floor(crate.x / CELL)]) {
      mmCtx.fillStyle = '#ffd040';
      mmCtx.fillRect(crate.x / CELL * cw - 2, crate.z / CELL * ch - 2, 4, 4);
    }
    for (const en of enemies) {
      if (!en.alive || !seen[Math.floor(en.pos.z / CELL)][Math.floor(en.pos.x / CELL)]) continue;
      mmCtx.fillStyle = '#ff5030';
      mmCtx.beginPath(); mmCtx.arc(en.pos.x / CELL * cw, en.pos.z / CELL * ch, 2.5, 0, Math.PI * 2); mmCtx.fill();
    }
    const yaw = controls.getObject().rotation.y;
    mmCtx.save();
    mmCtx.translate(player.pos.x / CELL * cw, player.pos.z / CELL * ch);
    mmCtx.rotate(-yaw);
    mmCtx.fillStyle = '#3affff';
    mmCtx.beginPath();
    mmCtx.moveTo(0, -5); mmCtx.lineTo(4, 4); mmCtx.lineTo(-4, 4);
    mmCtx.closePath(); mmCtx.fill();
    mmCtx.restore();
  }

  // ---------------------------------------------------------------------
  // Estados de juego
  // ---------------------------------------------------------------------
  const startScreen = document.getElementById('startScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const deathScreen = document.getElementById('deathScreen');
  const nameInput = document.getElementById('playerName');
  const saveBtn = document.getElementById('saveBtn');
  let gameState = 'start'; // start | playing | paused | dead
  let recordSaved = false;
  let pausedAt = 0;

  document.getElementById('startBtn').addEventListener('click', () => {
    resumeAudio();
    controls.lock();
  });
  document.getElementById('resumeBtn').addEventListener('click', () => controls.lock());
  document.getElementById('retryBtn').addEventListener('click', () => {
    if (!recordSaved) submitRecord();
    newRun();
    resumeAudio();
    controls.lock();
  });
  saveBtn.addEventListener('click', submitRecord);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitRecord(); });

  controls.addEventListener('lock', () => {
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    resumeAudio();
    music.start();
    if (gameState === 'start') newRun();
    else if (gameState === 'paused') gameState = 'playing';
  });
  controls.addEventListener('unlock', () => {
    if (gameState === 'playing') pauseGame();
  });

  function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    pausedAt = performance.now();
    pauseScreen.classList.remove('hidden');
    mouseDown = false;
    suspendAudio();
  }

  function damagePlayer(amount) {
    if (!player.alive) return;
    player.health -= amount;
    sfx.hurt();
    hurtFlash.classList.add('on');
    setTimeout(() => hurtFlash.classList.remove('on'), 60);
    if (player.health <= 0) {
      player.health = 0;
      die();
    }
  }

  function die() {
    player.alive = false;
    gameState = 'dead';
    pauseScreen.classList.add('hidden');
    resumeAudio();
    mouseDown = false;
    for (const k in keys) keys[k] = false;
    sprinting = false;
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('finalKills').textContent = player.kills;
    document.getElementById('finalScore').textContent = player.score;
    recordSaved = false;
    saveBtn.disabled = false;
    nameInput.disabled = false;
    try { nameInput.value = localStorage.getItem(NAME_KEY) || ''; } catch (e) { nameInput.value = ''; }
    renderRanking(null);
    deathScreen.classList.remove('hidden');
    controls.unlock();
    setTimeout(() => nameInput.focus(), 50);
  }

  function submitRecord() {
    if (recordSaved) return;
    const name = nameInput.value.trim() || 'Anónimo';
    try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* noop */ }
    const rec = saveRecord(name, player.score, level);
    recordSaved = true;
    saveBtn.disabled = true;
    nameInput.disabled = true;
    renderRanking(rec);
    renderBest();
  }

  function newRun() {
    player.health = player.maxHealth;
    player.kills = 0;
    player.score = 0;
    player.alive = true;
    player.lastShot = 0;
    equipWeapon(0);
    player.ammo = player.maxAmmo;
    document.getElementById('score').textContent = '0';
    deathScreen.classList.add('hidden');
    buildLevel(1);
    showToast(`NIVEL 1 — ${theme.name}`, 2600);
    gameState = 'playing';
  }

  // ---------------------------------------------------------------------
  // Loop principal
  // ---------------------------------------------------------------------
  const clock = new THREE.Clock();
  const GRAVITY = 18;
  const JUMP_SPEED = 6.2;

  function updatePlayer(dt) {
    const obj = controls.getObject();
    const forward = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    const strafe = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);

    let speed = player.speed * (sprinting ? player.sprintMult : 1);
    if (forward !== 0 && strafe !== 0) speed *= Math.SQRT1_2;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(dir, forward);
    move.addScaledVector(right, strafe);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);

    const pos = obj.position;
    const nx = pos.x + move.x;
    if (!circleHitsWall(nx, pos.z, PLAYER_RADIUS)) pos.x = nx;
    const nz = pos.z + move.z;
    if (!circleHitsWall(pos.x, nz, PLAYER_RADIUS)) pos.z = nz;

    if (keys['Space'] && player.onGround) {
      player.velY = JUMP_SPEED;
      player.onGround = false;
    }
    player.velY -= GRAVITY * dt;
    pos.y += player.velY * dt;
    if (pos.y <= EYE_H) {
      pos.y = EYE_H;
      player.velY = 0;
      player.onGround = true;
    }
    player.pos.copy(pos);

    const moving = move.lengthSq() > 0.0001 && player.onGround;
    const t = clock.elapsedTime;
    weaponModel.position.x = 0.28 + (moving ? Math.sin(t * 10) * 0.015 : 0);
    weaponModel.position.y = -0.28 + (moving ? Math.abs(Math.sin(t * 10)) * 0.02 : 0);
    slashTimer = Math.max(0, slashTimer - dt);
    const sl = slashTimer / 0.18;
    clawsModel.position.set(0.3 - sl * 0.25 + (moving ? Math.sin(t * 10) * 0.015 : 0), -0.3 + (moving ? Math.abs(Math.sin(t * 10)) * 0.02 : 0) + sl * 0.05, -0.5 - sl * 0.1);
    clawsModel.rotation.set(0, sl * 0.6, -sl * 1.1);

    player.ammoRegenTimer += dt;
    if (player.ammoRegenTimer > 0.8 && player.ammo < player.maxAmmo) {
      player.ammoRegenTimer = 0;
      player.ammo++;
    }

    if (mouseDown && WEAPONS[player.weaponIdx].auto) shoot();

    // campo de distancias hacia el jugador (para que los gatos sorteen el laberinto)
    const pgx = Math.floor(pos.x / CELL), pgz = Math.floor(pos.z / CELL);
    const key = pgx + ',' + pgz;
    if (key !== playerCellKey) {
      playerCellKey = key;
      playerField = bfs(pgx, pgz);
    }
    markSeen();

    // animación de salida y caja
    exitGroup.getObjectByName('ring').position.y = 1.2 + Math.sin(t * 2) * 0.5;
    if (crate) {
      crate.mesh.rotation.y += dt * 1.5;
      crate.mesh.position.y = 1.0 + Math.sin(t * 3) * 0.12;
      if (Math.hypot(pos.x - crate.x, pos.z - crate.z) < 1.2) {
        levelGroup.remove(crate.mesh);
        equipWeapon(crate.weapon);
        player.ammo = player.maxAmmo;
        sfx.pickup();
        showToast(`¡ARMA NUEVA: ${WEAPONS[crate.weapon].name.toUpperCase()}!`, 3000);
        crate = null;
      }
    }

    if (Math.hypot(pos.x - exitPos.x, pos.z - exitPos.z) < 1.3) nextLevel();
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life -= dt;
      let dead = p.life <= 0;
      const total = p.w.speed * dt;
      const steps = Math.max(1, Math.ceil(total / 0.3));
      for (let s = 0; s < steps && !dead; s++) {
        p.mesh.position.addScaledVector(p.dir, total / steps);
        const pp = p.mesh.position;
        if (pp.y < 0 || pp.y > WALL_H || circleHitsWall(pp.x, pp.z, 0.1)) {
          if (p.w.splash) explode(pp, p.w);
          dead = true;
          break;
        }
        for (const en of enemies) {
          if (!en.alive) continue;
          if (Math.hypot(pp.x - en.pos.x, pp.z - en.pos.z) < en.w * 0.4 + p.w.size && pp.y < en.h + 0.3) {
            if (p.w.splash) explode(pp, p.w);
            else damageEnemy(en, p.w.dmg);
            dead = true;
            break;
          }
        }
        if (dead) break;
      }
      if (dead) {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
      }
    }
  }

  function moveEnemy(en, tx, tz, dt) {
    const dx = tx - en.pos.x, dz = tz - en.pos.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return;
    const step = en.speed * dt;
    const nx = en.pos.x + (dx / len) * step;
    if (!circleHitsWall(nx, en.pos.z, 0.4)) en.pos.x = nx;
    const nz = en.pos.z + (dz / len) * step;
    if (!circleHitsWall(en.pos.x, nz, 0.4)) en.pos.z = nz;
  }

  function updateEnemies(dt) {
    for (const en of enemies) {
      if (!en.alive) continue;

      if (en.flashTimer > 0) {
        en.flashTimer -= dt;
        en.mat.color.setScalar(3);
      } else {
        en.mat.color.setScalar(1);
      }

      const egx = Math.floor(en.pos.x / CELL), egz = Math.floor(en.pos.z / CELL);
      const d = playerField ? playerField[egz * GRID_W + egx] : -1;
      if (d >= 0 && d <= AGGRO) {
        if (d <= 1) {
          moveEnemy(en, player.pos.x, player.pos.z, dt);
        } else {
          let best = d, bx = -1, bz = -1;
          for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = egx + ox, nz = egz + oz;
            if (isWallCell(nx, nz)) continue;
            const nd = playerField[nz * GRID_W + nx];
            if (nd >= 0 && nd < best) { best = nd; bx = nx; bz = nz; }
          }
          if (bx >= 0) {
            const c = cellCenter(bx, bz);
            moveEnemy(en, c.x, c.z, dt);
          }
        }
      }
      en.sprite.position.set(en.pos.x, en.h / 2, en.pos.z);

      en.contactTimer -= dt;
      const dist = Math.hypot(player.pos.x - en.pos.x, player.pos.z - en.pos.z);
      if (dist < en.w * 0.5 + 0.5 && en.contactTimer <= 0) {
        en.contactTimer = 1.1;
        damagePlayer(en.damage);
        sfx.meowHurt();
      }
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (gameState === 'playing') {
      updatePlayer(dt);
      updateProjectiles(dt);
      updateEnemies(dt);
      updateHUD();
      drawMinimap();
    }
    renderer.render(scene, camera);
  }

  // Estado inicial (pantalla de inicio): un laberinto de fondo ya construido
  equipWeapon(0);
  buildLevel(1);
  renderBest();
  updateHUD();
  animate();
})();
