/* ============================================================================
   Flappy Bird 2 Advanced — original implementation
   - Canvas2D rendering, no third-party assets
   - Original CSS-art sprites in HTML, original Canvas-drawn sprites in-game
   - Sections: Audio | Persistence | Guns | DOM | State | Input | Shop |
               Cutscene | Spawning | Update | Render | Loop
   ============================================================================ */

// ---------------- Canvas & sizing ----------------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W = 0, H = 0;
function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ---------------- Audio (WebAudio simple SFX) ----------------
// Lazily created on first user gesture so browsers don't block it.
let audioCtx = null;
let audioMuted = false;
function ensureAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch { audioMuted = true; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}
function beep({ freq = 440, type = 'square', duration = 0.1, gain = 0.12, sweep = 0 }) {
    if (audioMuted || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), now + duration);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
}
const sfx = {
    flap:  () => beep({ freq: 580, type: 'triangle', duration: 0.07, gain: 0.08, sweep: 60 }),
    shoot: () => beep({ freq: 880, type: 'square',   duration: 0.07, gain: 0.10, sweep: -400 }),
    hit:   () => beep({ freq: 220, type: 'sawtooth', duration: 0.10, gain: 0.10, sweep: -120 }),
    kill:  () => { beep({ freq: 660, type: 'square', duration: 0.08, gain: 0.10 });
                   setTimeout(() => beep({ freq: 880, type: 'square', duration: 0.10, gain: 0.10 }), 80); },
    coin:  () => beep({ freq: 1320, type: 'sine',    duration: 0.08, gain: 0.08, sweep: 200 }),
    die:   () => beep({ freq: 200, type: 'sawtooth', duration: 0.5,  gain: 0.18, sweep: -180 }),
    surprise: () => { [523, 659, 784, 1047].forEach((f, i) =>
                        setTimeout(() => beep({ freq: f, type: 'square', duration: 0.16, gain: 0.10 }), i * 90)); },
};

// ---------------- Persistence ----------------
const SAVE_KEY = 'flappy2adv_save_v1';
const defaultSave = {
    coins: 0,
    ownedGuns: ['basic'],
    equippedGun: 'basic',
    surpriseSeen: false,
};
let save = loadSave();
function loadSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return { ...defaultSave };
        const parsed = JSON.parse(raw);
        return { ...defaultSave, ...parsed, ownedGuns: parsed.ownedGuns || ['basic'] };
    } catch { return { ...defaultSave }; }
}
function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
}

// ---------------- Gun catalog ----------------
// damage: hp removed per hit
// fireDelay: ms between shots
// speed: bullet speed (px/s)
// piercing: bullet survives multiple enemy hits
const GUNS = {
    basic:   { name: 'Basic Gun',   desc: 'Trusty starter sidearm.',
               price: 0,   damage: 1, fireDelay: 300, speed: 720, color: '#ffeb3b', shape: 'bullet',  piercing: false, secret: false },
    rapid:   { name: 'Rapid Gun',   desc: 'Faster fire rate, light shots.',
               price: 80,  damage: 1, fireDelay: 110, speed: 880, color: '#4fc3f7', shape: 'bullet',  piercing: false, secret: false },
    power:   { name: 'Power Gun',   desc: 'Slow but strong — pierces enemies!',
               price: 180, damage: 3, fireDelay: 480, speed: 760, color: '#ff5252', shape: 'orb',     piercing: true,  secret: false },
    feet:    { name: 'Feet Gun',    desc: 'Cartoon feet projectiles. Hilarious.',
               price: 250, damage: 2, fireDelay: 320, speed: 660, color: '#ffcc80', shape: 'foot',    piercing: false, secret: false },
    rainbow: { name: 'Rainbow Gun', desc: 'SECRET — unlocked at 50m!',
               price: 0,   damage: 4, fireDelay:  90, speed: 940, color: '#e040fb', shape: 'star',    piercing: true,  secret: true },
};

// ---------------- DOM refs ----------------
const screens = {
    start:    document.getElementById('startScreen'),
    mode:     document.getElementById('modeScreen'),
    cutscene: document.getElementById('cutsceneScreen'),
    shop:     document.getElementById('shopScreen'),
    over:     document.getElementById('gameOverScreen'),
};
const hud             = document.getElementById('hud');
const distanceDisplay = document.getElementById('distanceDisplay');
const coinsDisplay    = document.getElementById('coinsDisplay');
const gunDisplay      = document.getElementById('gunDisplay');
const shopCoins       = document.getElementById('shopCoins');
const gunsList        = document.getElementById('gunsList');
const finalDistance   = document.getElementById('finalDistance');
const finalCoins      = document.getElementById('finalCoins');
const gameOverTitle   = document.getElementById('gameOverTitle');
const gameOverMessage = document.getElementById('gameOverMessage');
const jailScene       = document.getElementById('jailScene');
const surpriseNotif   = document.getElementById('surpriseNotif');
const surpriseTitle   = document.getElementById('surpriseTitle');
const surpriseText    = document.getElementById('surpriseText');
const cutsceneDialog  = document.getElementById('cutsceneDialog');
const cutsceneSkipBtn = document.getElementById('cutsceneSkipBtn');

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
}

// ---------------- Game state ----------------
const STATE = { MENU: 'menu', CUTSCENE: 'cutscene', PLAYING: 'playing', OVER: 'over' };
const MODE  = { CLASSIC: 'classic', TAX: 'tax' };

let state = STATE.MENU;
let mode  = MODE.CLASSIC;

let bird = null;
let obstacles = [];
let enemies = [];
let bullets = [];
let particles = [];      // hit/spark particles
let muzzleFlashes = [];  // brief flashes at gun tip
let coinsOnScreen = [];
let distance = 0;
let coinsEarned = 0;
let lastTime = performance.now();
let spawnTimer = 0, enemyTimer = 0, coinTimer = 0, lastShotAt = 0;
let backgroundOffset = 0, groundOffset = 0;
let screenShake = 0;     // seconds of remaining shake
let screenShakeMag = 0;  // pixels

// World constants
const GRAVITY = 1700;
const FLAP_VY = -540;
const MAX_VY  = 900;
const SPEED_BASE = 220;
const GROUND_H = 70;
const CEILING_PAD = 8;
const PIPE_GAP_BASE = 200;

// Cutscene state
const cutscene = {
    t: 0,
    duration: 6.2,
    dialogues: [
        { at: 0.0, text: 'The taxes are coming...' },
        { at: 2.0, text: 'Run before they audit you!' },
        { at: 4.2, text: 'GO! GO! GO!' },
    ],
    currentIdx: -1,
    bird: { x: 100, y: 0, vy: 0, t: 0 },
    chasers: [],
};

// Held-key tracker (allows holding F to auto-fire)
const keys = { fire: false };

// ---------------- Init / reset ----------------
function startGame(selectedMode) {
    mode = selectedMode;
    state = STATE.PLAYING;

    bird = {
        x: W * 0.28, y: H * 0.45, vy: 0, r: 22, rot: 0, flapAnim: 0,
    };
    obstacles = [];
    enemies = [];
    bullets = [];
    particles = [];
    muzzleFlashes = [];
    coinsOnScreen = [];

    distance = 0;
    coinsEarned = 0;
    spawnTimer = 0;
    enemyTimer = 1.2;
    coinTimer = 0.8;
    lastShotAt = 0;
    screenShake = 0;
    screenShakeMag = 0;

    Object.values(screens).forEach(s => s.classList.remove('active'));
    hud.classList.remove('hidden');
    updateHud();
}

function updateHud() {
    distanceDisplay.textContent = Math.floor(distance);
    coinsDisplay.textContent = save.coins + coinsEarned;
    gunDisplay.textContent = GUNS[save.equippedGun].name.replace(' Gun', '');
}

// ---------------- Input ----------------
function flap() {
    if (state !== STATE.PLAYING) return;
    bird.vy = FLAP_VY;
    bird.flapAnim = 0.18;
    sfx.flap();
}

function tryShoot() {
    if (state !== STATE.PLAYING) return;
    const gun = GUNS[save.equippedGun];
    const now = performance.now();
    if (now - lastShotAt < gun.fireDelay) return;
    lastShotAt = now;

    // Spawn bullet from the bird's beak
    const bx = bird.x + 26;
    const by = bird.y + 2;
    bullets.push({
        x: bx, y: by,
        vx: gun.speed,
        vy: 0,
        r: gun.shape === 'orb' ? 14 : gun.shape === 'foot' ? 13 : gun.shape === 'star' ? 14 : 9,
        damage: gun.damage,
        gunKey: save.equippedGun,
        piercing: gun.piercing,
        hits: new Set(),     // enemies already hit (for piercing)
        life: 1.8,
        spin: Math.random() * Math.PI * 2,
        trail: [],
    });

    // Muzzle flash + screen shake + sound
    muzzleFlashes.push({ x: bx, y: by, life: 0.10, color: gun.color });
    screenShake = Math.max(screenShake, 0.06);
    screenShakeMag = 3;
    sfx.shoot();
}

// Keyboard (down)
window.addEventListener('keydown', e => {
    ensureAudio();
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (state === STATE.PLAYING) flap();
    }
    if (e.code === 'KeyF' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        keys.fire = true;
        if (state === STATE.PLAYING) tryShoot();
    }
});
window.addEventListener('keyup', e => {
    if (e.code === 'KeyF' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.fire = false;
});

// Mouse: left = flap, right = shoot
canvas.addEventListener('mousedown', e => {
    ensureAudio();
    if (state !== STATE.PLAYING) return;
    if (e.button === 2) tryShoot();
    else flap();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Touch (canvas) = flap
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    ensureAudio();
    if (state === STATE.PLAYING) flap();
}, { passive: false });

// Shoot button (always shoots)
const shootBtn = document.getElementById('shootBtn');
shootBtn.addEventListener('click', e => {
    e.stopPropagation();
    ensureAudio();
    tryShoot();
});
shootBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    ensureAudio();
    tryShoot();
}, { passive: false });

// ---------------- Menu wiring ----------------
document.getElementById('playBtn').addEventListener('click', () => { ensureAudio(); showScreen('mode'); });
document.getElementById('shopBtnFromStart').addEventListener('click', () => { ensureAudio(); renderShop(); showScreen('shop'); });
document.getElementById('backFromMode').addEventListener('click', () => showScreen('start'));
document.getElementById('backFromShop').addEventListener('click', () => showScreen('start'));
document.getElementById('classicModeBtn').addEventListener('click', () => { ensureAudio(); startGame(MODE.CLASSIC); });
document.getElementById('taxModeBtn').addEventListener('click',     () => { ensureAudio(); startCutscene(); });
document.getElementById('restartBtn').addEventListener('click', () => startGame(mode));
document.getElementById('menuBtn').addEventListener('click', () => {
    hud.classList.add('hidden');
    showScreen('start');
    state = STATE.MENU;
});
cutsceneSkipBtn.addEventListener('click', () => endCutscene());

// ---------------- Cutscene ----------------
function startCutscene() {
    state = STATE.CUTSCENE;
    cutscene.t = 0;
    cutscene.currentIdx = -1;
    cutscene.bird = { x: W * 0.6, y: H * 0.5, vy: 0, t: 0 };
    cutscene.chasers = [];
    // Pre-populate a few chasers behind the bird
    for (let i = 0; i < 4; i++) {
        cutscene.chasers.push({
            x: cutscene.bird.x - 80 - i * 60,
            y: H * 0.4 + (i * 30 % 80),
            t: Math.random() * Math.PI * 2,
            type: i % 3, // 0 paper, 1 briefcase, 2 stamp
        });
    }
    cutsceneDialog.textContent = '';
    showScreen('cutscene');
}

function updateCutscene(dt) {
    cutscene.t += dt;
    // Advance dialogues
    for (let i = 0; i < cutscene.dialogues.length; i++) {
        if (cutscene.t >= cutscene.dialogues[i].at && cutscene.currentIdx < i) {
            cutscene.currentIdx = i;
            cutsceneDialog.textContent = cutscene.dialogues[i].text;
            // Re-trigger the pop animation
            cutsceneDialog.style.animation = 'none';
            cutsceneDialog.offsetHeight;
            cutsceneDialog.style.animation = '';
        }
    }

    // Animate bird (panicked flying)
    cutscene.bird.t += dt;
    cutscene.bird.y = H * 0.5 + Math.sin(cutscene.bird.t * 6) * 30;

    // Animate chasers (papers flapping in pursuit)
    for (const c of cutscene.chasers) {
        c.t += dt;
        c.x += 30 * dt; // catch up slowly
        c.y += Math.sin(c.t * 4) * 0.6;
    }

    // Background scrolls fast (urgency)
    backgroundOffset = (backgroundOffset + 220 * dt) % W;
    groundOffset = (groundOffset + 280 * dt) % 40;

    if (cutscene.t >= cutscene.duration) endCutscene();
}

function drawCutscene() {
    // Sky already drawn by drawBackground (using TAX mode visual)
    // Draw bird
    const cb = cutscene.bird;
    drawBirdAt(cb.x, cb.y, Math.sin(cb.t * 6) * 0.2, true);

    // Sweat drops behind bird
    for (let i = 0; i < 3; i++) {
        const sx = cb.x - 30 - i * 8;
        const sy = cb.y - 20 + i * 12 + Math.sin(cb.t * 8 + i) * 5;
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.ellipse(sx, sy, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Chasers
    for (const c of cutscene.chasers) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(Math.sin(c.t * 4) * 0.3);
        if (c.type === 0) drawTaxPaperSprite();
        else if (c.type === 1) drawBriefcaseSprite();
        else drawAuditStampSprite();
        ctx.restore();
    }
}

function endCutscene() {
    startGame(MODE.TAX);
}

// ---------------- Shop ----------------
function renderShop() {
    shopCoins.textContent = save.coins;
    gunsList.innerHTML = '';

    Object.entries(GUNS).forEach(([key, gun]) => {
        if (gun.secret && !save.ownedGuns.includes(key)) return;
        const owned = save.ownedGuns.includes(key);
        const equipped = save.equippedGun === key;

        const card = document.createElement('div');
        card.className = 'gun-card' + (equipped ? ' equipped' : '');

        // Mini preview
        const preview = document.createElement('div');
        preview.className = 'gun-preview';
        const prevCanvas = document.createElement('canvas');
        prevCanvas.width = 50; prevCanvas.height = 50;
        preview.appendChild(prevCanvas);
        drawGunPreview(prevCanvas, key);
        card.appendChild(preview);

        const info = document.createElement('div');
        info.className = 'gun-info';
        info.innerHTML = `
            <div class="gun-name">${gun.name}</div>
            <div class="gun-desc">${gun.desc}</div>
            <div class="gun-stats">
                <div class="gun-stat dmg">DMG ${gun.damage}</div>
                <div class="gun-stat rate">RATE ${(1000 / gun.fireDelay).toFixed(1)}/s</div>
                <div class="gun-stat spd">SPD ${gun.speed}</div>
                ${gun.piercing ? '<div class="gun-stat">PIERCING</div>' : ''}
            </div>
        `;
        card.appendChild(info);

        const btn = document.createElement('button');
        btn.className = 'gun-action';
        if (equipped) {
            btn.textContent = 'EQUIPPED';
            btn.classList.add('equipped');
        } else if (owned) {
            btn.textContent = 'EQUIP';
            btn.classList.add('equip');
            btn.addEventListener('click', () => {
                save.equippedGun = key; persist(); renderShop();
            });
        } else {
            const canAfford = save.coins >= gun.price;
            btn.textContent = canAfford ? `BUY ${gun.price}` : `${gun.price}c`;
            btn.classList.add(canAfford ? 'buy' : 'locked');
            if (canAfford) {
                btn.addEventListener('click', () => {
                    save.coins -= gun.price;
                    save.ownedGuns.push(key);
                    save.equippedGun = key;
                    persist(); renderShop();
                    sfx.coin();
                });
            }
        }
        card.appendChild(btn);
        gunsList.appendChild(card);
    });
}

function drawGunPreview(c, key) {
    const pctx = c.getContext('2d');
    pctx.clearRect(0, 0, c.width, c.height);
    pctx.translate(c.width / 2, c.height / 2);
    drawGunIcon(pctx, key);
}

// Stylized small gun icon used in the shop preview canvas
function drawGunIcon(g, key) {
    const gun = GUNS[key];
    g.save();
    // Body
    g.fillStyle = '#37474f';
    g.strokeStyle = '#000';
    g.lineWidth = 2;
    g.beginPath();
    g.rect(-18, -8, 28, 12);
    g.fill(); g.stroke();
    // Grip
    g.fillStyle = '#5d4037';
    g.beginPath();
    g.rect(-14, 4, 10, 12);
    g.fill(); g.stroke();
    // Barrel hole / accent (gun-specific)
    g.fillStyle = gun.color;
    g.beginPath(); g.arc(11, -2, 4, 0, Math.PI * 2); g.fill();
    // Detail per gun
    if (key === 'rapid') {
        g.fillStyle = '#fff'; g.fillRect(-10, -6, 14, 2);
    } else if (key === 'power') {
        g.fillStyle = '#ff5252'; g.beginPath(); g.arc(0, -2, 3, 0, Math.PI * 2); g.fill();
    } else if (key === 'feet') {
        // tiny foot below barrel
        g.translate(14, 2);
        g.scale(0.45, 0.45);
        drawFootSprite(g);
    } else if (key === 'rainbow') {
        const colors = ['#ff5252','#ff9800','#ffeb3b','#4caf50','#2196f3','#9c27b0'];
        for (let i = 0; i < 6; i++) {
            g.fillStyle = colors[i];
            g.fillRect(-16 + i * 4, -6, 4, 8);
        }
    }
    g.restore();
}

// ---------------- Spawning helpers ----------------
function spawnObstaclePair() {
    const minTop = 60;
    const maxTop = H - GROUND_H - PIPE_GAP_BASE - 80;
    const top = minTop + Math.random() * Math.max(60, maxTop - minTop);
    const gap = Math.max(150, PIPE_GAP_BASE - Math.min(60, distance / 30));
    const width = 70;

    let kind = 'pipe';
    if (mode === MODE.TAX) {
        const r = Math.random();
        kind = r < 0.45 ? 'paperTower' : r < 0.75 ? 'briefcaseStack' : 'stampWall';
    }

    obstacles.push({
        x: W + 20,
        topH: top,
        bottomY: top + gap,
        width,
        kind,
        passed: false,
    });
}

function spawnEnemy() {
    const fromTop = 50 + Math.random() * (H - GROUND_H - 120);
    let type;
    if (mode === MODE.CLASSIC) {
        const r = Math.random();
        type = r < 0.55 ? 'bat' : r < 0.85 ? 'wasp' : 'ufo';
    } else {
        const r = Math.random();
        type = r < 0.40 ? 'auditor' : r < 0.75 ? 'taxpaper' : 'drone';
    }
    enemies.push({
        x: W + 30,
        y: fromTop,
        baseY: fromTop,
        vx: -(SPEED_BASE + 60 + Math.min(180, distance / 4)),
        type,
        hp: type === 'ufo' || type === 'drone' ? 3 : type === 'wasp' || type === 'auditor' ? 2 : 1,
        maxHp: type === 'ufo' || type === 'drone' ? 3 : type === 'wasp' || type === 'auditor' ? 2 : 1,
        t: 0,
        r: 26,
        dead: false,
        hitFlash: 0,
    });
}

function spawnCoin() {
    coinsOnScreen.push({
        x: W + 20,
        y: 80 + Math.random() * (H - GROUND_H - 140),
        r: 12,
        t: Math.random() * Math.PI * 2,
    });
}

function spawnParticles(x, y, n, color) {
    for (let i = 0; i < n; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 280,
            vy: (Math.random() - 0.5) * 280,
            life: 0.45 + Math.random() * 0.4,
            color,
            r: 2 + Math.random() * 3,
            kind: 'spark',
        });
    }
}

function spawnHitSplash(x, y, color) {
    // Big ring + radial sparks
    particles.push({
        x, y, vx: 0, vy: 0,
        life: 0.25, color, r: 6, kind: 'ring',
    });
    spawnParticles(x, y, 10, color);
}

// ---------------- Update ----------------
function update(dt) {
    const speed = SPEED_BASE + Math.min(220, distance / 6);
    distance += (speed * dt) / 30;

    backgroundOffset = (backgroundOffset + speed * dt * 0.25) % W;
    groundOffset = (groundOffset + speed * dt) % 40;

    // Bird physics
    bird.vy = Math.min(MAX_VY, bird.vy + GRAVITY * dt);
    bird.y += bird.vy * dt;
    bird.rot = Math.max(-0.5, Math.min(1.2, bird.vy / 600));
    if (bird.flapAnim > 0) bird.flapAnim -= dt;

    // Bounds
    if (bird.y - bird.r < CEILING_PAD) return gameOver('You hit the ceiling!');
    if (bird.y + bird.r > H - GROUND_H) return gameOver('You hit the ground!');

    // Held-fire (auto-fire while F/Shift held)
    if (keys.fire) tryShoot();

    // Spawn timers
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        spawnObstaclePair();
        spawnTimer = Math.max(1.05, 1.65 - distance / 400) + Math.random() * 0.4;
    }
    enemyTimer -= dt;
    if (enemyTimer <= 0) {
        spawnEnemy();
        enemyTimer = Math.max(0.7, 2.4 - distance / 150) + Math.random() * 0.6;
    }
    coinTimer -= dt;
    if (coinTimer <= 0) {
        spawnCoin();
        coinTimer = 1.2 + Math.random() * 1.4;
    }

    // Move obstacles
    for (const o of obstacles) o.x -= speed * dt;
    obstacles = obstacles.filter(o => o.x + o.width > -10);

    // Move enemies (sine wobble)
    for (const e of enemies) {
        e.t += dt;
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.t * 3) * 18;
        if (e.hitFlash > 0) e.hitFlash -= dt;
    }
    enemies = enemies.filter(e => e.x > -60 && !e.dead);

    // Bullets
    for (const b of bullets) {
        // Trail
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 6) b.trail.shift();
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        b.spin += dt * 12;
    }
    bullets = bullets.filter(b => b.x < W + 20 && b.life > 0);

    // Coins
    for (const c of coinsOnScreen) {
        c.x -= speed * dt;
        c.t += dt * 4;
    }
    coinsOnScreen = coinsOnScreen.filter(c => c.x > -20);

    // Particles
    for (const p of particles) {
        if (p.kind === 'spark') {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 280 * dt;
        } else if (p.kind === 'ring') {
            p.r += 120 * dt;
        }
        p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);

    // Muzzle flashes
    for (const m of muzzleFlashes) m.life -= dt;
    muzzleFlashes = muzzleFlashes.filter(m => m.life > 0);

    // Screen shake decay
    if (screenShake > 0) screenShake -= dt;

    // ---- Collisions ----
    // Bullet vs enemy
    for (const b of bullets) {
        for (const e of enemies) {
            if (e.dead) continue;
            if (b.hits.has(e)) continue;
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
                e.hp -= b.damage;
                e.hitFlash = 0.12;
                spawnHitSplash(e.x, e.y, GUNS[b.gunKey].color);
                screenShake = Math.max(screenShake, 0.10);
                screenShakeMag = 4;
                sfx.hit();
                b.hits.add(e);
                if (!b.piercing) b.life = 0;
                if (e.hp <= 0) {
                    e.dead = true;
                    coinsEarned += 3;
                    spawnParticles(e.x, e.y, 16, '#ffd54f');
                    spawnParticles(e.x, e.y, 8, GUNS[b.gunKey].color);
                    sfx.kill();
                }
                if (!b.piercing) break;
            }
        }
    }

    // Bird vs obstacle
    for (const o of obstacles) {
        if (bird.x + bird.r > o.x && bird.x - bird.r < o.x + o.width) {
            if (bird.y - bird.r < o.topH || bird.y + bird.r > o.bottomY) {
                return gameOver(mode === MODE.TAX ? 'The auditors caught you!' : 'You hit a pipe!');
            }
            if (!o.passed && bird.x > o.x + o.width) {
                o.passed = true;
                coinsEarned += 1;
            }
        }
    }

    // Bird vs enemy
    for (const e of enemies) {
        if (e.dead) continue;
        if (Math.hypot(bird.x - e.x, bird.y - e.y) < bird.r + e.r * 0.7) {
            return gameOver(mode === MODE.TAX ? 'An auditor tackled you!' : 'An enemy got you!');
        }
    }

    // Bird vs coin
    for (const c of coinsOnScreen) {
        if (Math.hypot(bird.x - c.x, bird.y - c.y) < bird.r + c.r) {
            c.x = -9999;
            coinsEarned += 2;
            spawnParticles(bird.x, bird.y, 6, '#ffd54f');
            sfx.coin();
        }
    }

    // 50m surprise
    if (!save.surpriseSeen && distance >= 50) triggerSurprise();

    updateHud();
}

// ---------------- Surprise ----------------
function triggerSurprise() {
    save.surpriseSeen = true;
    if (!save.ownedGuns.includes('rainbow')) save.ownedGuns.push('rainbow');
    save.equippedGun = 'rainbow';
    coinsEarned += 50;
    persist();

    surpriseTitle.textContent = 'SECRET UNLOCKED!';
    surpriseText.textContent  = 'Rainbow Gun equipped + 50 bonus coins!';
    surpriseNotif.classList.remove('hidden');
    setTimeout(() => surpriseNotif.classList.add('hidden'), 2400);
    sfx.surprise();
}

// ---------------- Game over ----------------
function gameOver(reason) {
    if (state !== STATE.PLAYING) return;
    state = STATE.OVER;

    save.coins += coinsEarned;
    persist();

    finalDistance.textContent = Math.floor(distance);
    finalCoins.textContent    = coinsEarned;

    if (mode === MODE.TAX) {
        gameOverTitle.textContent   = "YOU'RE IN JAIL, LOSER";
        gameOverMessage.textContent = "GET A JOB!";
        jailScene.classList.remove('hidden');
    } else {
        gameOverTitle.textContent   = 'GAME OVER';
        gameOverMessage.textContent = reason;
        jailScene.classList.add('hidden');
    }

    hud.classList.add('hidden');
    showScreen('over');
    sfx.die();
}

// ---------------- Render: backgrounds, ground ----------------
function drawBackground() {
    ctx.save();
    // Parallax clouds
    for (let i = 0; i < 6; i++) {
        const cx = ((i * (W / 3)) - backgroundOffset * 0.4) % (W + 200);
        const x = cx < -200 ? cx + W + 200 : cx;
        const y = 60 + (i % 3) * 50;
        drawCloud(x, y, 50 + (i % 2) * 20);
    }

    if (mode === MODE.TAX || state === STATE.CUTSCENE) {
        // City skyline (Tax mode)
        ctx.fillStyle = '#90a4ae';
        for (let i = 0; i < 8; i++) {
            const bw = 80;
            const x = ((i * 110) - backgroundOffset * 0.6) % (W + 200);
            const xx = x < -bw ? x + W + 200 : x;
            const bh = 90 + ((i * 37) % 70);
            ctx.fillRect(xx, H - GROUND_H - bh, bw, bh);
            // Windows
            ctx.fillStyle = '#ffeb3b';
            for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
                ctx.fillRect(xx + 12 + c * 22, H - GROUND_H - bh + 12 + r * 18, 10, 10);
            }
            ctx.fillStyle = '#90a4ae';
        }
    } else {
        // Hills
        ctx.fillStyle = '#7cb342';
        ctx.beginPath();
        ctx.moveTo(0, H - GROUND_H);
        for (let x = 0; x <= W; x += 30) {
            const y = H - GROUND_H - 30 - Math.sin((x + backgroundOffset * 0.7) * 0.02) * 18;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H - GROUND_H);
        ctx.fill();
    }
    ctx.restore();
}

function drawCloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
    ctx.arc(x + s * 0.4, y - s * 0.15, s * 0.4, 0, Math.PI * 2);
    ctx.arc(x + s * 0.8, y, s * 0.45, 0, Math.PI * 2);
    ctx.arc(x + s * 0.45, y + s * 0.1, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawGround() {
    const taxLike = mode === MODE.TAX || state === STATE.CUTSCENE;
    ctx.fillStyle = taxLike ? '#37474f' : '#deb887';
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
    ctx.fillStyle = taxLike ? '#fdd835' : '#a1887f';
    for (let x = -groundOffset; x < W; x += 40) {
        ctx.fillRect(x, H - GROUND_H + 10, 24, 6);
    }
    ctx.fillStyle = taxLike ? '#263238' : '#8d6e63';
    ctx.fillRect(0, H - GROUND_H, W, 4);
}

// ---------------- Render: obstacles ----------------
function drawObstacles() {
    for (const o of obstacles) {
        if (o.kind === 'pipe') {
            drawPipe(o.x, 0, o.width, o.topH, false);
            drawPipe(o.x, o.bottomY, o.width, H - GROUND_H - o.bottomY, true);
        } else if (o.kind === 'paperTower') {
            drawPaperTower(o.x, 0, o.width, o.topH);
            drawPaperTower(o.x, o.bottomY, o.width, H - GROUND_H - o.bottomY);
        } else if (o.kind === 'briefcaseStack') {
            drawBriefcaseStack(o.x, 0, o.width, o.topH);
            drawBriefcaseStack(o.x, o.bottomY, o.width, H - GROUND_H - o.bottomY);
        } else if (o.kind === 'stampWall') {
            drawStampWall(o.x, 0, o.width, o.topH);
            drawStampWall(o.x, o.bottomY, o.width, H - GROUND_H - o.bottomY);
        }
    }
}

function drawPipe(x, y, w, h, bottom) {
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#388e3c';
    if (!bottom) ctx.fillRect(x - 4, y + h - 18, w + 8, 18);
    else         ctx.fillRect(x - 4, y, w + 8, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    if (!bottom) ctx.fillRect(x + 6, y, 6, h - 20);
    else         ctx.fillRect(x + 6, y + 20, 6, h - 20);
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
}

function drawPaperTower(x, y, w, h) {
    ctx.fillStyle = '#fffde7';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 1;
    for (let yy = y + 6; yy < y + h; yy += 12) {
        ctx.beginPath(); ctx.moveTo(x + 6, yy); ctx.lineTo(x + w - 6, yy); ctx.stroke();
    }
    // Red TAX stamps
    ctx.font = 'bold 12px sans-serif';
    for (let yy = y + 30; yy < y + h - 10; yy += 60) {
        ctx.save();
        ctx.translate(x + w / 2, yy);
        ctx.rotate(-0.25);
        ctx.fillStyle = 'rgba(198,40,40,0.85)';
        ctx.strokeStyle = '#b71c1c';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(-18, -10, 36, 20); ctx.stroke();
        ctx.fillText('TAX', -12, 4);
        ctx.restore();
    }
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
}

function drawBriefcaseStack(x, y, w, h) {
    let yy = y;
    const caseH = 36;
    while (yy < y + h) {
        const ch = Math.min(caseH, y + h - yy);
        // Briefcase body
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x, yy, w, ch);
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
        ctx.strokeRect(x, yy, w, ch);
        // Handle
        if (ch >= 20) {
            ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + w / 2, yy + 5, 10, Math.PI, 0);
            ctx.stroke();
        }
        // Lock
        if (ch >= 16) {
            ctx.fillStyle = '#ffc107';
            ctx.fillRect(x + w / 2 - 4, yy + ch - 14, 8, 6);
            ctx.strokeRect(x + w / 2 - 4, yy + ch - 14, 8, 6);
        }
        yy += caseH;
    }
}

function drawStampWall(x, y, w, h) {
    // Background paper
    ctx.fillStyle = '#fff8e1';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    // Audit stamps
    ctx.font = 'bold 10px sans-serif';
    let yy = y + 18;
    while (yy < y + h - 4) {
        ctx.save();
        ctx.translate(x + w / 2, yy);
        ctx.rotate((Math.random() - 0.5) * 0.35);
        ctx.strokeStyle = '#c62828';
        ctx.fillStyle = 'rgba(198,40,40,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c62828';
        ctx.fillText('AUDIT', -13, 3);
        ctx.restore();
        yy += 38;
    }
}

// ---------------- Render: bird (canvas sprite) ----------------
function drawBird() {
    drawBirdAt(bird.x, bird.y, bird.rot, bird.flapAnim > 0);
}

function drawBirdAt(x, y, rot, flapping) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // Body
    const bodyGrad = ctx.createRadialGradient(-6, -6, 4, 0, 0, 26);
    bodyGrad.addColorStop(0, '#fff59d');
    bodyGrad.addColorStop(0.5, '#ffeb3b');
    bodyGrad.addColorStop(1, '#fbc02d');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f57f17'; ctx.lineWidth = 2.5; ctx.stroke();

    // Belly highlight
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(-3, 6, 14, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Wing (animated)
    const wingY = flapping ? -10 : 4;
    const wingRot = flapping ? -0.4 : 0.2;
    ctx.save();
    ctx.translate(-3, wingY);
    ctx.rotate(wingRot);
    const wingGrad = ctx.createLinearGradient(0, -10, 0, 10);
    wingGrad.addColorStop(0, '#fbc02d');
    wingGrad.addColorStop(1, '#f57f17');
    ctx.fillStyle = wingGrad;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e65100'; ctx.lineWidth = 2; ctx.stroke();
    // Wing feather lines
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(8, 2);
    ctx.moveTo(-7, 3); ctx.lineTo(7, 5);
    ctx.stroke();
    ctx.restore();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(8, -5, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(10, -5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(11, -6, 1.5, 0, Math.PI * 2); ctx.fill();

    // Beak
    ctx.fillStyle = '#ff7043';
    ctx.strokeStyle = '#bf360c'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, -2);
    ctx.lineTo(36, -4);
    ctx.lineTo(36, 4);
    ctx.lineTo(20, 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Beak crease
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(36, 0); ctx.stroke();

    ctx.restore();
}

// ---------------- Render: enemies ----------------
function drawEnemies() {
    for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.hitFlash > 0) {
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 14;
        }
        switch (e.type) {
            case 'bat':      drawBat(e); break;
            case 'wasp':     drawWasp(e); break;
            case 'ufo':      drawUfo(e); break;
            case 'auditor':  drawAuditor(e); break;
            case 'taxpaper': drawTaxPaperSprite(e); break;
            case 'drone':    drawDrone(e); break;
        }
        ctx.restore();
        // HP bar for multi-hp enemies
        if (e.maxHp > 1 && e.hp < e.maxHp) {
            const bw = 30, bh = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw, bh);
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw * (e.hp / e.maxHp), bh);
        }
    }
}

function drawBat(e) {
    ctx.fillStyle = '#4527a0';
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#311b92'; ctx.lineWidth = 2; ctx.stroke();
    const wing = Math.sin(e.t * 12) * 8;
    ctx.fillStyle = '#5e35b1';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-26, -12 + wing); ctx.lineTo(-14, 0); ctx.lineTo(-22, 6 + wing); ctx.lineTo(-6, 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(26, -12 + wing); ctx.lineTo(14, 0); ctx.lineTo(22, 6 + wing); ctx.lineTo(6, 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Eyes (red glowing)
    ctx.fillStyle = '#ff5252';
    ctx.beginPath(); ctx.arc(-5, -3, 2.5, 0, Math.PI * 2); ctx.arc(5, -3, 2.5, 0, Math.PI * 2); ctx.fill();
    // Fangs
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(-1, 8); ctx.lineTo(1, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, 4); ctx.lineTo(3, 8); ctx.lineTo(5, 4); ctx.closePath(); ctx.fill();
}

function drawWasp(e) {
    ctx.fillStyle = '#fdd835';
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#827717'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#212121';
    ctx.fillRect(-12, -10, 6, 20); ctx.fillRect(0, -10, 6, 20);
    const wing = Math.sin(e.t * 24) * 4;
    ctx.fillStyle = 'rgba(220,240,255,0.75)';
    ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-2, -10 + wing, 11, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(6, -10 + wing, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Stinger
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-28, -3); ctx.lineTo(-28, 3); ctx.fill();
    // Eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(12, -2, 2.5, 0, Math.PI * 2); ctx.fill();
}

function drawUfo(e) {
    // Body
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath(); ctx.ellipse(0, 4, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#424242'; ctx.lineWidth = 2; ctx.stroke();
    // Dome
    const dome = ctx.createLinearGradient(0, -14, 0, 4);
    dome.addColorStop(0, '#b3e5fc');
    dome.addColorStop(1, '#0288d1');
    ctx.fillStyle = dome;
    ctx.beginPath(); ctx.arc(0, -2, 14, Math.PI, 0); ctx.fill();
    ctx.stroke();
    // Lights
    ctx.fillStyle = e.t % 1 < 0.5 ? '#ffeb3b' : '#ff5252';
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.arc(i * 8, 7, 3, 0, Math.PI * 2); ctx.fill();
    }
}

function drawAuditor(e) {
    // Head
    const skin = ctx.createRadialGradient(-2, -12, 2, 0, -10, 10);
    skin.addColorStop(0, '#ffe0b2');
    skin.addColorStop(1, '#fdd0a2');
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.stroke();
    // Hair
    ctx.fillStyle = '#3e2723';
    ctx.beginPath(); ctx.arc(0, -16, 10, Math.PI, 0); ctx.fill();
    // Suit
    ctx.fillStyle = '#212121';
    ctx.fillRect(-13, -2, 26, 22);
    ctx.strokeRect(-13, -2, 26, 22);
    // Shirt collar
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(4, -2); ctx.lineTo(0, 10); ctx.fill();
    // Tie
    ctx.fillStyle = '#c62828';
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(2, -2); ctx.lineTo(3, 10); ctx.lineTo(0, 12); ctx.lineTo(-3, 10); ctx.fill();
    // Briefcase
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(8, 8, 14, 12);
    ctx.strokeRect(8, 8, 14, 12);
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(15, 8, 3, Math.PI, 0); ctx.stroke();
    // Glasses
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-4, -12, 3, 0, Math.PI * 2); ctx.arc(4, -12, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, -12); ctx.lineTo(1, -12); ctx.stroke();
    // Angry brow
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -16); ctx.lineTo(-1, -14);
    ctx.moveTo(7, -16);  ctx.lineTo(1, -14);
    ctx.stroke();
}

function drawTaxPaperSprite(e) {
    const t = e ? e.t : 0;
    ctx.save();
    if (e) ctx.rotate(Math.sin(t * 5) * 0.3);
    // Paper
    ctx.fillStyle = '#fffde7';
    ctx.fillRect(-15, -20, 30, 40);
    // Lines
    ctx.strokeStyle = '#9e9e9e'; ctx.lineWidth = 1;
    for (let y = -14; y < 18; y += 5) {
        ctx.beginPath(); ctx.moveTo(-11, y); ctx.lineTo(11, y); ctx.stroke();
    }
    // IRS header
    ctx.fillStyle = '#c62828';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('IRS', -8, -10);
    // Stamp
    ctx.strokeStyle = '#c62828'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(6, 12, 5, 0, Math.PI * 2); ctx.stroke();
    // Border
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
    ctx.strokeRect(-15, -20, 30, 40);
    // Angry face on the paper (chasing)
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(-4, 4, 1.5, 0, Math.PI * 2); ctx.arc(4, 4, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(3, 8); ctx.stroke();
    ctx.restore();
}

function drawBriefcaseSprite() {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-18, -12, 36, 24);
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
    ctx.strokeRect(-18, -12, 36, 24);
    ctx.beginPath(); ctx.arc(0, -12, 8, Math.PI, 0); ctx.lineWidth = 3; ctx.stroke();
    // Lock
    ctx.fillStyle = '#ffc107';
    ctx.fillRect(-3, 0, 6, 5); ctx.strokeRect(-3, 0, 6, 5);
}

function drawAuditStampSprite() {
    ctx.strokeStyle = '#c62828'; ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(198,40,40,0.2)';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#c62828';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('AUDIT', -13, 4);
}

function drawDrone(e) {
    // Body
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-16, -5, 32, 10);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.strokeRect(-16, -5, 32, 10);
    // Camera
    ctx.fillStyle = '#263238';
    ctx.beginPath(); ctx.arc(0, 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f44336';
    ctx.beginPath(); ctx.arc(0, 4, 1.5, 0, Math.PI * 2); ctx.fill();
    // Arms
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(-22, -8);
    ctx.moveTo(16, 0);  ctx.lineTo(22, -8);
    ctx.stroke();
    // Rotor blades (motion-blurred)
    const rot = Math.sin(e.t * 30) * 14;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-22 - rot, -8); ctx.lineTo(-22 + rot, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22 - rot, -8); ctx.lineTo(22 + rot, -8); ctx.stroke();
    // Antenna
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -14); ctx.stroke();
    ctx.fillStyle = '#f44336';
    ctx.beginPath(); ctx.arc(0, -14, 2, 0, Math.PI * 2); ctx.fill();
}

// ---------------- Render: bullets ----------------
function drawBullets() {
    for (const b of bullets) {
        const gun = GUNS[b.gunKey];
        // Trail
        ctx.save();
        for (let i = 0; i < b.trail.length; i++) {
            const t = b.trail[i];
            const alpha = (i + 1) / b.trail.length * 0.4;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = gun.color;
            ctx.beginPath(); ctx.arc(t.x, t.y, b.r * 0.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        ctx.save();
        ctx.translate(b.x, b.y);
        if (gun.shape === 'foot') {
            ctx.rotate(b.spin * 0.4);
            drawFootSprite(ctx);
        } else if (gun.shape === 'orb') {
            const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, b.r);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.5, gun.color);
            grad.addColorStop(1, gun.color);
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2; ctx.stroke();
        } else if (gun.shape === 'star') {
            ctx.rotate(b.spin);
            const colors = ['#ff5252','#ff9800','#ffeb3b','#4caf50','#2196f3','#9c27b0'];
            ctx.fillStyle = colors[Math.floor(b.spin * 3) % colors.length];
            drawStar(0, 0, 5, b.r + 3, b.r * 0.5);
            ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        } else {
            // Plain bullet (basic, rapid)
            ctx.fillStyle = gun.color;
            ctx.beginPath(); ctx.ellipse(0, 0, b.r + 3, b.r - 1, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath(); ctx.ellipse(-2, -1.5, 2.5, 1.2, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

// Cartoon foot drawn as canvas paths (replaces emoji)
function drawFootSprite(g) {
    g.save();
    // Sole base
    g.fillStyle = '#ffcc99';
    g.strokeStyle = '#5d4037';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
    // Heel pad
    g.fillStyle = '#e8a07a';
    g.beginPath();
    g.ellipse(-10, 0, 5, 7, 0, 0, Math.PI * 2);
    g.fill();
    // Toes (cartoonish, 5 of them at the front)
    const toes = [
        [11, -7, 4],
        [15, -3, 3.5],
        [16, 1, 3.2],
        [15, 5, 3],
        [12, 8, 2.6],
    ];
    g.fillStyle = '#ffcc99';
    for (const [tx, ty, tr] of toes) {
        g.beginPath(); g.arc(tx, ty, tr, 0, Math.PI * 2); g.fill(); g.stroke();
        // Tiny nail
        g.fillStyle = '#fff3e0';
        g.beginPath(); g.arc(tx + 1, ty - 1, tr * 0.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffcc99';
    }
    g.restore();
}

function drawStar(cx, cy, spikes, outer, inner) {
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outer);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
        rot += step;
    }
    ctx.closePath();
}

// ---------------- Render: coins ----------------
function drawCoins() {
    for (const c of coinsOnScreen) {
        const sx = Math.abs(Math.cos(c.t)) * c.r + 4;
        ctx.fillStyle = '#ffc107';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, sx, c.r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff59d';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, sx * 0.5, c.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f57f17'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(c.x, c.y, sx, c.r, 0, 0, Math.PI * 2); ctx.stroke();
        // Dollar mark when frontal
        if (Math.cos(c.t) > 0.3) {
            ctx.fillStyle = '#f57f17';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('$', c.x - 3, c.y + 4);
        }
    }
}

// ---------------- Render: particles & flashes ----------------
function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life * 1.5);
        if (p.kind === 'spark') {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
        } else if (p.kind === 'ring') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;
}

function drawMuzzleFlashes() {
    for (const m of muzzleFlashes) {
        const a = Math.max(0, m.life / 0.10);
        ctx.save();
        ctx.globalAlpha = a;
        const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 22);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.4, m.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(m.x, m.y, 22, 0, Math.PI * 2); ctx.fill();
        // Spark lines
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const ang = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(m.x + Math.cos(ang) * 6, m.y + Math.sin(ang) * 6);
            ctx.lineTo(m.x + Math.cos(ang) * 18, m.y + Math.sin(ang) * 18);
            ctx.stroke();
        }
        ctx.restore();
    }
}

// ---------------- Compose render ----------------
function render() {
    ctx.save();
    // Apply screen shake
    if (screenShake > 0) {
        const sm = screenShakeMag * (screenShake / 0.10);
        ctx.translate((Math.random() - 0.5) * sm, (Math.random() - 0.5) * sm);
    }
    ctx.clearRect(-20, -20, W + 40, H + 40);
    drawBackground();

    if (state === STATE.PLAYING) {
        drawObstacles();
        drawCoins();
        drawEnemies();
        drawBullets();
        drawMuzzleFlashes();
        drawParticles();
        if (bird) drawBird();
    } else if (state === STATE.CUTSCENE) {
        drawCutscene();
    }

    drawGround();
    ctx.restore();
}

// ---------------- Loop ----------------
function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    if (state === STATE.PLAYING) {
        update(dt);
    } else if (state === STATE.CUTSCENE) {
        updateCutscene(dt);
    } else {
        // Idle ambient scroll for menu screens
        backgroundOffset = (backgroundOffset + 50 * dt) % W;
        groundOffset = (groundOffset + 80 * dt) % 40;
    }

    render();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
