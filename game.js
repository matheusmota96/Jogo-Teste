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
    start:      document.getElementById('startScreen'),
    mode:       document.getElementById('modeScreen'),
    difficulty: document.getElementById('difficultyScreen'),
    cutscene:   document.getElementById('cutsceneScreen'),
    shop:       document.getElementById('shopScreen'),
    over:       document.getElementById('gameOverScreen'),
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
const MODE  = {
    CLASSIC: 'classic', TAX: 'tax', MARIO: 'mario',
    DRUNK: 'drunk', BEE: 'bee', POTATO: 'potato', BOSS: 'boss',
    REVERSE: 'reverse', CHAOS: 'chaos', HACKER: 'hacker', SLEEP: 'sleep',
};
function isFlapMode(m) {
    return m === MODE.CLASSIC || m === MODE.TAX || m === MODE.DRUNK ||
           m === MODE.BEE || m === MODE.POTATO || m === MODE.BOSS ||
           m === MODE.REVERSE || m === MODE.CHAOS || m === MODE.HACKER ||
           m === MODE.SLEEP;
}

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

// FX state shared across chaotic modes (defined here so flap/update/render
// can read it safely; actual mutators live in the chaotic-modes section).
const modeFx = {
    blur: 0, rotate: 0, invert: 0, scale: 1, flipY: false,
    pendingFlap: 0, chaosGravityMul: 1,
    drunkActive: false, drunkTimer: 0, feetEaten: 0, feetSpawnTimer: 0,
    wineTimer: 5, drunkPhase: 0,
    bees: [], beeScreamTimer: 5,
    boss: null, bossSpawned: false, bossKilled: false,
    chaosTimer: 4, chaosEffect: null, chaosEffectTimer: 0, savedBirdR: 0,
    hackerPopupTimer: 3,
    asleep: false, sleepCheckTimer: 8, sleepWakeTaps: 0, sleepWakeTime: 0,
    reverseFlipTimer: 8,
    potatoRainTimer: 3, potatoes: [],
    feetRain: [],
};

let wineBottles = [];
let giantFeet = [];

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

    resetModeFx();

    Object.values(screens).forEach(s => s.classList.remove('active'));
    hud.classList.remove('hidden');
    setHudMode('flap');
    updateHud();
}

// Switch HUD elements between flap-mode and mario-mode
function setHudMode(kind) {
    const isMario = kind === 'mario';
    document.getElementById('hudDistance').classList.toggle('hidden', isMario);
    document.getElementById('hudGun').classList.toggle('hidden', isMario);
    document.getElementById('hudLives').classList.toggle('hidden', !isMario);
    document.getElementById('hudPower').classList.toggle('hidden', !isMario);
    document.getElementById('shootBtn').classList.toggle('hidden', isMario);
    document.getElementById('shootBtnLeft').classList.toggle('hidden', isMario);
    document.getElementById('marioControls').classList.toggle('hidden', !isMario);
}

function updateHud() {
    distanceDisplay.textContent = Math.floor(distance);
    coinsDisplay.textContent = save.coins + coinsEarned;
    gunDisplay.textContent = GUNS[save.equippedGun].name.replace(' Gun', '');
}

// ---------------- Input ----------------
function flap() {
    if (state !== STATE.PLAYING || mode === MODE.MARIO || !bird) return;
    // Sleep mode: taps count toward waking, no flap while asleep
    if (mode === MODE.SLEEP && modeFx.asleep) {
        modeFx.sleepWakeTaps += 1;
        sfx.flap();
        return;
    }
    // Drunk mode: queue flap with delay
    if (mode === MODE.DRUNK && modeFx.drunkActive) {
        modeFx.pendingFlap = 0.18;
        return;
    }
    bird.vy = FLAP_VY;
    bird.flapAnim = 0.18;
    sfx.flap();
}

function tryShoot() {
    if (state !== STATE.PLAYING || mode === MODE.MARIO) return;
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

// Shoot buttons (right + left side, both always shoot)
function wireShootButton(btn) {
    btn.addEventListener('click', e => {
        e.stopPropagation();
        ensureAudio();
        tryShoot();
    });
    btn.addEventListener('touchstart', e => {
        e.preventDefault();
        e.stopPropagation();
        ensureAudio();
        tryShoot();
    }, { passive: false });
}
const shootBtn = document.getElementById('shootBtn');
const shootBtnLeft = document.getElementById('shootBtnLeft');
wireShootButton(shootBtn);
wireShootButton(shootBtnLeft);

// ---------------- Menu wiring ----------------
document.getElementById('playBtn').addEventListener('click', () => { ensureAudio(); showScreen('mode'); });
document.getElementById('shopBtnFromStart').addEventListener('click', () => { ensureAudio(); renderShop(); showScreen('shop'); });
document.getElementById('backFromMode').addEventListener('click', () => showScreen('start'));
document.getElementById('backFromShop').addEventListener('click', () => showScreen('start'));
document.getElementById('backFromDiff').addEventListener('click',   () => showScreen('mode'));
// Mode select grid is wired in the chaotic-modes section at the bottom of the file.
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        ensureAudio();
        startMarioMode(btn.dataset.diff);
    });
});
document.getElementById('restartBtn').addEventListener('click', () => {
    if (mode === MODE.MARIO) startMarioMode(mario.difficulty);
    else startGame(mode);
});
document.getElementById('menuBtn').addEventListener('click', () => {
    hud.classList.add('hidden');
    setHudMode('flap');
    resetModeFx();
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
    // Per-mode FX & special spawns/inputs
    updateModeFx(dt);
    if (state !== STATE.PLAYING) return; // a mode hook may have ended the game

    // Drunk delayed flap
    if (modeFx.pendingFlap > 0 && bird) {
        modeFx.pendingFlap -= dt;
        if (modeFx.pendingFlap <= 0) {
            bird.vy = FLAP_VY * 0.85;
            bird.flapAnim = 0.18;
            sfx.flap();
        }
    }

    const speed = SPEED_BASE + Math.min(220, distance / 6);
    distance += (speed * dt) / 30;

    backgroundOffset = (backgroundOffset + speed * dt * 0.25) % W;
    groundOffset = (groundOffset + speed * dt) % 40;

    // Bird physics (gravity modulated by chaos mode)
    const gMul = modeFx.chaosGravityMul || 1;
    bird.vy = Math.min(MAX_VY * gMul, bird.vy + GRAVITY * gMul * dt);
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
    // Hide chaotic-mode overlays so the game-over screen reads cleanly
    document.getElementById('drunkHud').classList.add('hidden');
    document.getElementById('drunkOverlay').classList.add('hidden');
    document.getElementById('soberOverlay').classList.add('hidden');
    document.getElementById('sleepOverlay').classList.add('hidden');
    document.getElementById('chaosPopup').classList.add('hidden');
    const hl = document.getElementById('hackerLayer');
    hl.classList.add('hidden'); hl.innerHTML = '';
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
        if (mode === MODE.POTATO) {
            drawPotatoEnemy(e);
        } else {
            switch (e.type) {
                case 'bat':      drawBat(e); break;
                case 'wasp':     drawWasp(e); break;
                case 'ufo':      drawUfo(e); break;
                case 'auditor':  drawAuditor(e); break;
                case 'taxpaper': drawTaxPaperSprite(e); break;
                case 'drone':    drawDrone(e); break;
            }
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
        if (mode === MODE.POTATO) {
            drawPotatoBullet(b);
        } else if (gun.shape === 'foot') {
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
    applyCanvasFx();
    ctx.save();
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
        renderModeExtras();
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
        if (mode === MODE.MARIO) updateMario(dt);
        else update(dt);
    } else if (state === STATE.CUTSCENE) {
        updateCutscene(dt);
    } else {
        // Idle ambient scroll for menu screens
        backgroundOffset = (backgroundOffset + 50 * dt) % W;
        groundOffset = (groundOffset + 80 * dt) % 40;
    }

    if (mode === MODE.MARIO && state !== STATE.MENU && state !== STATE.CUTSCENE && mario) {
        renderMario();
    } else {
        render();
    }
    requestAnimationFrame(loop);
}

// ============================================================================
// SUPER BIRD BROS — Mario-inspired platformer mode
// ============================================================================

let mario = null;

const marioInput = { left: false, right: false, jump: false, fire: false };

const MARIO_PHYS = {
    GRAVITY: 1900,
    WALK_ACCEL: 1500,
    WALK_SPEED: 240,
    AIR_ACCEL: 1000,
    FRICTION: 1600,
    JUMP_VY: -680,
    MAX_VY: 1000,
    BOUNCE_VY: -440,
};

// ----- Level builder -----
// Hand-tuned levels per difficulty.  Returns platforms, enemies, coins,
// power-ups and a flag at the right edge.
function buildMarioLevel(difficulty) {
    const groundY = H - 80;
    const lvl = {
        difficulty, groundY,
        width: 0,
        platforms: [], enemies: [], coins: [], powerups: [],
        flag: null,
    };

    if (difficulty === 'easy') {
        lvl.width = 1900;
        lvl.platforms.push({ x: 0, y: groundY, w: 1900, h: 80, type: 'ground' });
        lvl.platforms.push({ x: 320,  y: groundY - 110, w: 100, h: 18, type: 'block' });
        lvl.platforms.push({ x: 520,  y: groundY - 170, w: 80,  h: 18, type: 'qblock' });
        lvl.platforms.push({ x: 740,  y: groundY - 110, w: 120, h: 18, type: 'block' });
        lvl.platforms.push({ x: 1050, y: groundY - 150, w: 100, h: 18, type: 'block' });
        lvl.platforms.push({ x: 1300, y: groundY - 110, w: 100, h: 18, type: 'qblock' });
        lvl.platforms.push({ x: 900,  y: groundY - 60,  w: 60,  h: 60, type: 'pipe' });
        lvl.enemies.push({ x: 600,  y: groundY - 32, type: 'goomba', range: [550, 800] });
        lvl.enemies.push({ x: 1150, y: groundY - 32, type: 'goomba', range: [1080, 1280] });
        for (let i = 0; i < 8; i++) lvl.coins.push({ x: 200 + i * 50, y: groundY - 200, collected: false });
        for (let i = 0; i < 4; i++) lvl.coins.push({ x: 760 + i * 30, y: groundY - 150, collected: false });
        lvl.powerups.push({ x: 540, y: groundY - 200, type: 'mushroom', collected: false });
        lvl.flag = { x: 1820 };

    } else if (difficulty === 'medium') {
        lvl.width = 2700;
        lvl.platforms.push({ x: 0,    y: groundY, w: 700,  h: 80, type: 'ground' });
        lvl.platforms.push({ x: 820,  y: groundY, w: 600,  h: 80, type: 'ground' });
        lvl.platforms.push({ x: 1500, y: groundY, w: 1200, h: 80, type: 'ground' });
        lvl.platforms.push({ x: 720,  y: groundY - 60,  w: 80,  h: 60, type: 'pipe' });
        lvl.platforms.push({ x: 270,  y: groundY - 130, w: 100, h: 18, type: 'block' });
        lvl.platforms.push({ x: 460,  y: groundY - 200, w: 80,  h: 18, type: 'qblock' });
        lvl.platforms.push({ x: 920,  y: groundY - 130, w: 100, h: 18, type: 'block' });
        lvl.platforms.push({ x: 1100, y: groundY - 220, w: 80,  h: 18, type: 'qblock' });
        lvl.platforms.push({ x: 1300, y: groundY - 130, w: 100, h: 18, type: 'block' });
        lvl.platforms.push({ x: 1700, y: groundY - 130, w: 80,  h: 18, type: 'block' });
        lvl.platforms.push({ x: 1900, y: groundY - 200, w: 80,  h: 18, type: 'qblock' });
        lvl.platforms.push({ x: 2200, y: groundY - 130, w: 100, h: 18, type: 'block' });
        lvl.enemies.push({ x: 400,  y: groundY - 32, type: 'goomba', range: [320, 600] });
        lvl.enemies.push({ x: 980,  y: groundY - 32, type: 'goomba', range: [840, 1380] });
        lvl.enemies.push({ x: 1230, y: groundY - 32, type: 'goomba', range: [840, 1380] });
        lvl.enemies.push({ x: 1750, y: groundY - 32, type: 'koopa',  range: [1520, 2300] });
        lvl.enemies.push({ x: 2050, y: groundY - 32, type: 'goomba', range: [1520, 2300] });
        lvl.enemies.push({ x: 2350, y: groundY - 32, type: 'goomba', range: [1520, 2400] });
        for (let i = 0; i < 6; i++) lvl.coins.push({ x: 100 + i * 60, y: groundY - 240, collected: false });
        for (let i = 0; i < 5; i++) lvl.coins.push({ x: 940 + i * 30, y: groundY - 170, collected: false });
        for (let i = 0; i < 4; i++) lvl.coins.push({ x: 1730 + i * 30, y: groundY - 240, collected: false });
        lvl.powerups.push({ x: 480,  y: groundY - 230, type: 'mushroom', collected: false });
        lvl.powerups.push({ x: 1320, y: groundY - 170, type: 'fire',     collected: false });
        lvl.flag = { x: 2620 };

    } else {
        lvl.width = 3400;
        lvl.platforms.push({ x: 0,    y: groundY, w: 380,  h: 80, type: 'ground' });
        lvl.platforms.push({ x: 480,  y: groundY, w: 240,  h: 80, type: 'ground' });
        lvl.platforms.push({ x: 800,  y: groundY, w: 320,  h: 80, type: 'ground' });
        lvl.platforms.push({ x: 1200, y: groundY, w: 520,  h: 80, type: 'ground' });
        lvl.platforms.push({ x: 1840, y: groundY, w: 200,  h: 80, type: 'ground' });
        lvl.platforms.push({ x: 2140, y: groundY, w: 1260, h: 80, type: 'ground' });
        lvl.platforms.push({ x: 200,  y: groundY - 130, w: 80, h: 18, type: 'block' });
        lvl.platforms.push({ x: 380,  y: groundY - 200, w: 80, h: 18, type: 'qblock' });
        lvl.platforms.push({ x: 600,  y: groundY - 160, w: 60, h: 18, type: 'block' });
        lvl.platforms.push({ x: 740,  y: groundY - 250, w: 60, h: 18, type: 'block' });
        lvl.platforms.push({ x: 900,  y: groundY - 160, w: 60, h: 18, type: 'block' });
        lvl.platforms.push({ x: 1080, y: groundY - 240, w: 80, h: 18, type: 'qblock' });
        lvl.platforms.push({ x: 1320, y: groundY - 180, w: 80, h: 18, type: 'block' });
        lvl.platforms.push({ x: 1500, y: groundY - 250, w: 80, h: 18, type: 'block' });
        lvl.platforms.push({ x: 1750, y: groundY - 130, w: 100, h: 18, type: 'block' });
        lvl.platforms.push({ x: 2000, y: groundY - 200, w: 80, h: 18, type: 'qblock' });
        lvl.platforms.push({ x: 2300, y: groundY - 160, w: 80, h: 18, type: 'block' });
        lvl.platforms.push({ x: 2500, y: groundY - 250, w: 60, h: 18, type: 'block' });
        lvl.platforms.push({ x: 2700, y: groundY - 180, w: 80, h: 18, type: 'block' });
        lvl.platforms.push({ x: 2900, y: groundY - 130, w: 100, h: 18, type: 'block' });
        lvl.platforms.push({ x: 1700, y: groundY - 80, w: 60, h: 80, type: 'pipe' });
        lvl.enemies.push({ x: 300,  y: groundY - 32, type: 'goomba', range: [50, 380] });
        lvl.enemies.push({ x: 600,  y: groundY - 32, type: 'goomba', range: [510, 700] });
        lvl.enemies.push({ x: 900,  y: groundY - 32, type: 'goomba', range: [810, 1100] });
        lvl.enemies.push({ x: 1300, y: groundY - 32, type: 'koopa',  range: [1210, 1700] });
        lvl.enemies.push({ x: 1500, y: groundY - 32, type: 'goomba', range: [1210, 1700] });
        lvl.enemies.push({ x: 1900, y: groundY - 32, type: 'goomba', range: [1860, 2030] });
        lvl.enemies.push({ x: 2400, y: groundY - 32, type: 'koopa',  range: [2160, 2700] });
        lvl.enemies.push({ x: 2600, y: groundY - 32, type: 'goomba', range: [2160, 2700] });
        lvl.enemies.push({ x: 2820, y: groundY - 32, type: 'goomba', range: [2710, 3380] });
        lvl.enemies.push({ x: 3080, y: groundY - 32, type: 'goomba', range: [2710, 3380] });
        for (let i = 0; i < 26; i++) {
            lvl.coins.push({ x: 80 + i * 110, y: groundY - 100 - (i % 3) * 40, collected: false });
        }
        lvl.powerups.push({ x: 2020, y: groundY - 230, type: 'fire', collected: false });
        lvl.flag = { x: 3320 };
    }
    return lvl;
}

// ----- Mario lifecycle -----
function startMarioMode(difficulty) {
    mode = MODE.MARIO;
    state = STATE.PLAYING;
    // Clear any chaotic-mode FX from previous run
    canvas.style.filter = '';
    canvas.style.transform = '';
    resetModeFx();

    const level = buildMarioLevel(difficulty);
    mario = {
        difficulty, level,
        bird: {
            x: 80, y: level.groundY - 60,
            vx: 0, vy: 0,
            w: 36, h: 40,
            onGround: false,
            facing: 1,
            power: 'small',
            invuln: 0,
            lives: 3,
            t: 0,
            fireCooldown: 0,
        },
        camera: { x: 0 },
        coinsCollected: 0,
        won: false,
        fireballs: [],
    };
    marioInput.left = marioInput.right = marioInput.jump = marioInput.fire = false;
    particles = [];

    Object.values(screens).forEach(s => s.classList.remove('active'));
    hud.classList.remove('hidden');
    setHudMode('mario');
    updateMarioHud();
}

function updateMarioHud() {
    if (!mario) return;
    document.getElementById('livesDisplay').textContent = mario.bird.lives;
    document.getElementById('powerDisplay').textContent =
        mario.bird.power === 'fire' ? 'Fire' : mario.bird.power === 'big' ? 'Big' : 'Small';
    coinsDisplay.textContent = save.coins + mario.coinsCollected;
    document.getElementById('mFireBtn').classList.toggle('hidden', mario.bird.power !== 'fire');
}

// ----- Mario update -----
function updateMario(dt) {
    if (!mario || mario.won) return;
    const m = mario;
    const b = m.bird;
    const lvl = m.level;
    b.t += dt;
    if (b.invuln > 0) b.invuln -= dt;
    if (b.fireCooldown > 0) b.fireCooldown -= dt;

    // Horizontal movement
    const accel = b.onGround ? MARIO_PHYS.WALK_ACCEL : MARIO_PHYS.AIR_ACCEL;
    if (marioInput.left && !marioInput.right) {
        b.vx = Math.max(-MARIO_PHYS.WALK_SPEED, b.vx - accel * dt);
        b.facing = -1;
    } else if (marioInput.right && !marioInput.left) {
        b.vx = Math.min(MARIO_PHYS.WALK_SPEED, b.vx + accel * dt);
        b.facing = 1;
    } else if (b.onGround) {
        if (b.vx > 0) b.vx = Math.max(0, b.vx - MARIO_PHYS.FRICTION * dt);
        else if (b.vx < 0) b.vx = Math.min(0, b.vx + MARIO_PHYS.FRICTION * dt);
    }

    // Jump (only when on ground)
    if (marioInput.jump && b.onGround) {
        b.vy = MARIO_PHYS.JUMP_VY;
        b.onGround = false;
        sfx.flap();
    }

    // Fire (fireball)
    if (marioInput.fire && b.power === 'fire' && b.fireCooldown <= 0) {
        m.fireballs.push({
            x: b.x + (b.facing > 0 ? b.w : 0),
            y: b.y + b.h * 0.4,
            vx: 480 * b.facing,
            vy: -120,
            life: 1.6,
            r: 9,
            spin: 0,
            bounces: 0,
        });
        b.fireCooldown = 0.35;
        sfx.shoot();
    }

    // Gravity
    b.vy = Math.min(MARIO_PHYS.MAX_VY, b.vy + MARIO_PHYS.GRAVITY * dt);

    // Move + collide (axis-separated for clean wall stops)
    b.x += b.vx * dt;
    resolveMarioPlatforms('x');
    b.y += b.vy * dt;
    b.onGround = false;
    resolveMarioPlatforms('y');

    // Camera follows the bird
    m.camera.x = Math.max(0, Math.min(lvl.width - W, b.x + b.w / 2 - W * 0.4));

    // Pit fall = die
    if (b.y > H + 80) { loseLife('You fell!'); return; }

    // Update enemies
    for (const e of lvl.enemies) {
        if (e.dead) { e.deathT = (e.deathT || 0) - dt; continue; }
        e.t = (e.t || 0) + dt;
        if (e.vx === undefined) e.vx = -60;
        e.x += e.vx * dt;
        if (e.x <= e.range[0]) { e.x = e.range[0]; e.vx = Math.abs(e.vx); }
        if (e.x >= e.range[1]) { e.x = e.range[1]; e.vx = -Math.abs(e.vx); }
    }

    // Bird vs enemies
    const bw = b.w, bh = b.h;
    for (const e of lvl.enemies) {
        if (e.dead) continue;
        const ew = 32, eh = 32;
        if (b.x < e.x + ew && b.x + bw > e.x && b.y < e.y + eh && b.y + bh > e.y) {
            // Stomp from above
            if (b.vy > 0 && (b.y + bh - e.y) < 22) {
                e.dead = true;
                e.deathT = 0.4;
                b.vy = MARIO_PHYS.BOUNCE_VY;
                m.coinsCollected += 1;
                spawnParticles(e.x + ew / 2, e.y + eh / 2, 12, '#8d6e63');
                sfx.kill();
            } else if (b.invuln <= 0) {
                hurtMarioBird();
            }
        }
    }

    // Bird vs power-ups
    for (const p of lvl.powerups) {
        if (p.collected) continue;
        if (b.x < p.x + 28 && b.x + bw > p.x && b.y < p.y + 28 && b.y + bh > p.y) {
            p.collected = true;
            applyPowerup(p.type);
            spawnParticles(p.x + 14, p.y + 14, 16, p.type === 'mushroom' ? '#d32f2f' : '#ff9800');
            sfx.surprise();
        }
    }

    // Bird vs coins
    for (const c of lvl.coins) {
        if (c.collected) continue;
        if (b.x < c.x + 14 && b.x + bw > c.x - 14 && b.y < c.y + 14 && b.y + bh > c.y - 14) {
            c.collected = true;
            m.coinsCollected += 1;
            spawnParticles(c.x, c.y, 6, '#ffd54f');
            sfx.coin();
        }
    }

    // Fireballs: physics + collision
    for (const f of m.fireballs) {
        f.x += f.vx * dt;
        f.vy += MARIO_PHYS.GRAVITY * 0.5 * dt;
        f.y += f.vy * dt;
        f.life -= dt;
        f.spin += dt * 12;
        for (const p of lvl.platforms) {
            if (f.x > p.x && f.x < p.x + p.w && f.y + f.r > p.y && f.y < p.y + p.h && f.vy > 0) {
                f.y = p.y - f.r;
                f.vy = -300;
                f.bounces += 1;
                if (f.bounces > 2) f.life = 0;
            }
        }
        for (const e of lvl.enemies) {
            if (e.dead) continue;
            if (f.x > e.x && f.x < e.x + 32 && f.y > e.y && f.y < e.y + 32) {
                e.dead = true;
                e.deathT = 0.4;
                m.coinsCollected += 2;
                spawnParticles(e.x + 16, e.y + 16, 14, '#ff5722');
                f.life = 0;
                sfx.kill();
            }
        }
    }
    m.fireballs = m.fireballs.filter(f => f.life > 0 && f.x < lvl.width + 50);

    // Particle update (reuse existing system)
    for (const p of particles) {
        if (p.kind === 'spark') {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 280 * dt;
        } else if (p.kind === 'ring') {
            p.r += 120 * dt;
        }
        p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);

    // Reach flag = win
    if (lvl.flag && b.x + bw >= lvl.flag.x) {
        m.won = true;
        save.coins += m.coinsCollected;
        persist();
        winLevel();
        return;
    }

    updateMarioHud();
}

// AABB resolution against all platforms on a single axis at a time
function resolveMarioPlatforms(axis) {
    const b = mario.bird;
    for (const p of mario.level.platforms) {
        if (b.x + b.w <= p.x || b.x >= p.x + p.w) continue;
        if (b.y + b.h <= p.y || b.y >= p.y + p.h) continue;
        if (axis === 'x') {
            if (b.vx > 0) b.x = p.x - b.w;
            else if (b.vx < 0) b.x = p.x + p.w;
            b.vx = 0;
        } else {
            if (b.vy > 0) {
                b.y = p.y - b.h;
                b.vy = 0;
                b.onGround = true;
            } else if (b.vy < 0) {
                b.y = p.y + p.h;
                b.vy = 0;
            }
        }
    }
}

function applyPowerup(type) {
    const b = mario.bird;
    if (type === 'mushroom') {
        if (b.power === 'small') {
            b.power = 'big';
            const oldH = b.h;
            b.h = 56;
            b.y -= (b.h - oldH);
        }
    } else if (type === 'fire') {
        if (b.h < 56) { b.y -= (56 - b.h); b.h = 56; }
        b.power = 'fire';
    }
    updateMarioHud();
}

function hurtMarioBird() {
    const b = mario.bird;
    b.invuln = 1.5;
    if (b.power === 'fire') { b.power = 'big'; }
    else if (b.power === 'big') {
        b.power = 'small';
        const oldH = b.h;
        b.h = 40;
        b.y += (oldH - b.h);
    } else {
        loseLife('Hit by enemy!');
        return;
    }
    sfx.hit();
    updateMarioHud();
}

function loseLife(reason) {
    const b = mario.bird;
    b.lives -= 1;
    sfx.die();
    if (b.lives <= 0) {
        gameOverMario(reason);
    } else {
        b.x = Math.max(40, mario.camera.x + 80);
        b.y = mario.level.groundY - 80;
        b.vx = 0; b.vy = 0;
        b.power = 'small';
        b.h = 40;
        b.invuln = 1.6;
        updateMarioHud();
    }
}

function gameOverMario(reason) {
    state = STATE.OVER;
    save.coins += mario.coinsCollected;
    persist();
    finalDistance.textContent = '—';
    finalCoins.textContent = mario.coinsCollected;
    gameOverTitle.textContent = 'GAME OVER';
    gameOverMessage.textContent = reason;
    jailScene.classList.add('hidden');
    hud.classList.add('hidden');
    setHudMode('flap');
    showScreen('over');
}

function winLevel() {
    state = STATE.OVER;
    finalDistance.textContent = '—';
    finalCoins.textContent = mario.coinsCollected;
    gameOverTitle.textContent = 'LEVEL COMPLETE!';
    gameOverMessage.textContent = `You beat ${mario.difficulty.toUpperCase()} mode!`;
    jailScene.classList.add('hidden');
    hud.classList.add('hidden');
    setHudMode('flap');
    showScreen('over');
    sfx.surprise();
}

// ----- Mario render -----
function renderMario() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#5dade2');
    sky.addColorStop(1, '#aed6f1');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    drawMarioHills();
    drawMarioClouds();

    ctx.translate(-mario.camera.x, 0);

    drawMarioPlatforms();
    drawMarioCoins();
    drawMarioPowerups();
    drawMarioFlag();
    drawMarioEnemies();
    drawMarioFireballs();
    drawMarioBird();
    drawParticles();

    ctx.restore();
}

function drawMarioHills() {
    const off = mario.camera.x * 0.3;
    ctx.fillStyle = '#7cb342';
    for (let i = 0; i < 8; i++) {
        const x = i * 350 - (off % 350);
        ctx.beginPath();
        ctx.moveTo(x, H - 80);
        ctx.quadraticCurveTo(x + 100, H - 80 - 110, x + 200, H - 80);
        ctx.fill();
    }
}

function drawMarioClouds() {
    const off = mario.camera.x * 0.15;
    for (let i = 0; i < 7; i++) {
        const x = (i * 240) - (off % 240);
        const y = 60 + (i % 3) * 50;
        drawCloud(x, y, 50 + (i % 2) * 20);
    }
}

function drawMarioPlatforms() {
    for (const p of mario.level.platforms) {
        if (p.type === 'ground') drawGroundBlock(p.x, p.y, p.w, p.h);
        else if (p.type === 'block') drawBrickBlock(p.x, p.y, p.w, p.h);
        else if (p.type === 'qblock') drawQuestionBlock(p.x, p.y, p.w, p.h);
        else if (p.type === 'pipe') drawPipeBlock(p.x, p.y, p.w, p.h);
    }
}

function drawGroundBlock(x, y, w, h) {
    ctx.fillStyle = '#43a047';
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(x, y + 12, w, h - 12);
    ctx.fillStyle = '#6d4c41';
    for (let yy = y + 18; yy < y + h - 4; yy += 14) {
        for (let xx = x + 6; xx < x + w - 6; xx += 22) {
            ctx.fillRect(xx, yy, 6, 4);
        }
    }
    ctx.fillStyle = '#2e7d32';
    for (let xx = x + 4; xx < x + w; xx += 10) {
        ctx.fillRect(xx, y - 2, 2, 4);
    }
    ctx.fillStyle = '#66bb6a';
    ctx.fillRect(x, y, w, 3);
}

function drawBrickBlock(x, y, w, h) {
    ctx.fillStyle = '#d84315';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#a82a04';
    ctx.fillRect(x, y, w, 3);
    ctx.fillRect(x, y + h - 3, w, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let xx = x + 14; xx < x + w; xx += 14) {
        ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
    ctx.strokeStyle = '#5d2f02';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawQuestionBlock(x, y, w, h) {
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, '#ffd54f');
    grad.addColorStop(1, '#f9a825');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#5d4037';
    [[x + 4, y + 4], [x + w - 6, y + 4], [x + 4, y + h - 6], [x + w - 6, y + h - 6]].forEach(([rx, ry]) => {
        ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', x + w / 2, y + h / 2 + 5);
    ctx.textAlign = 'start';
}

function drawPipeBlock(x, y, w, h) {
    ctx.fillStyle = '#43a047';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(x, y, 6, h);
    ctx.fillRect(x + w - 6, y, 6, h);
    ctx.fillStyle = '#43a047';
    ctx.fillRect(x - 6, y, w + 12, 14);
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 6, y, w + 12, 14);
    ctx.strokeRect(x, y + 14, w, h - 14);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 4, y + 18, 4, h - 22);
}

function drawMarioCoins() {
    for (const c of mario.level.coins) {
        if (c.collected) continue;
        const t = (performance.now() / 200) + c.x * 0.01;
        const sx = Math.abs(Math.cos(t)) * 10 + 4;
        ctx.fillStyle = '#ffc107';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, sx, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f57f17'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(c.x, c.y, sx, 12, 0, 0, Math.PI * 2); ctx.stroke();
        if (Math.cos(t) > 0.3) {
            ctx.fillStyle = '#f57f17';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('$', c.x, c.y + 4);
            ctx.textAlign = 'start';
        }
    }
}

function drawMarioPowerups() {
    for (const p of mario.level.powerups) {
        if (p.collected) continue;
        if (p.type === 'mushroom') drawMushroomSprite(p.x, p.y);
        else if (p.type === 'fire') drawFireFlowerSprite(p.x, p.y);
    }
}

function drawMushroomSprite(x, y) {
    ctx.fillStyle = '#fff8e1';
    ctx.fillRect(x + 6, y + 16, 16, 12);
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 6, y + 16, 16, 12);
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(x, y + 16);
    ctx.quadraticCurveTo(x + 14, y - 4, x + 28, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + 9, y + 8, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 19, y + 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 24, y + 12, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.fillRect(x + 10, y + 20, 2, 4);
    ctx.fillRect(x + 16, y + 20, 2, 4);
}

function drawFireFlowerSprite(x, y) {
    ctx.fillStyle = '#43a047';
    ctx.fillRect(x + 12, y + 14, 4, 14);
    const petals = [[14, 6], [22, 14], [14, 22], [6, 14]];
    for (const [px, py] of petals) {
        ctx.fillStyle = '#ff9800';
        ctx.beginPath(); ctx.arc(x + px, y + py, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#bf360c'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(x + 14, y + 14, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#bf360c'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(x + 12, y + 13, 1, 0, Math.PI * 2);
    ctx.arc(x + 16, y + 13, 1, 0, Math.PI * 2); ctx.fill();
}

function drawMarioFlag() {
    if (!mario.level.flag) return;
    const fx = mario.level.flag.x;
    const fy = mario.level.groundY - 220;
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(fx - 2, fy, 4, 220);
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(fx, fy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.stroke();
    const wave = Math.sin(performance.now() / 200) * 4;
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.moveTo(fx, fy + 10);
    ctx.lineTo(fx + 50, fy + 18 + wave);
    ctx.lineTo(fx + 50, fy + 32 + wave);
    ctx.lineTo(fx, fy + 40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    drawStar(fx + 32, fy + 26 + wave, 5, 6, 2.5);
    ctx.fill();
}

function drawMarioEnemies() {
    for (const e of mario.level.enemies) {
        if (e.dead) {
            if (e.deathT > 0) {
                ctx.save();
                ctx.translate(e.x + 16, e.y + 32 - 6);
                ctx.scale(1, 0.3);
                if (e.type === 'goomba') drawGoombaSprite(-16, -16);
                else if (e.type === 'koopa') drawKoopaSprite(-16, -16);
                ctx.restore();
            }
            continue;
        }
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.type === 'goomba') {
            drawGoombaSprite(0, 0);
        } else if (e.type === 'koopa') {
            drawKoopaSprite(0, 0);
        }
        ctx.restore();
    }
}

function drawGoombaSprite(x, y) {
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 22);
    ctx.lineTo(x + 4, y + 14);
    ctx.quadraticCurveTo(x + 16, y - 2, x + 28, y + 14);
    ctx.lineTo(x + 28, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#a1887f';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 18, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + 11, y + 11, 3, 0, Math.PI * 2); ctx.arc(x + 21, y + 11, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(x + 11, y + 11, 1.5, 0, Math.PI * 2); ctx.arc(x + 21, y + 11, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#212121'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6,  y + 7); ctx.lineTo(x + 14, y + 9);
    ctx.moveTo(x + 26, y + 7); ctx.lineTo(x + 18, y + 9);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 18); ctx.lineTo(x + 14, y + 22); ctx.lineTo(x + 16, y + 18); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 18); ctx.lineTo(x + 18, y + 22); ctx.lineTo(x + 20, y + 18); ctx.fill();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath(); ctx.ellipse(x + 9, y + 26, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 23, y + 26, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
}

function drawKoopaSprite(x, y) {
    const shellGrad = ctx.createRadialGradient(x + 14, y + 14, 4, x + 16, y + 16, 16);
    shellGrad.addColorStop(0, '#aed581');
    shellGrad.addColorStop(1, '#558b2f');
    ctx.fillStyle = shellGrad;
    ctx.beginPath(); ctx.arc(x + 16, y + 18, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#33691e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#33691e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x + 16, y + 18, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath(); ctx.arc(x + 24, y + 10, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(x + 26, y + 9, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8f00';
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 11); ctx.lineTo(x + 32, y + 12); ctx.lineTo(x + 28, y + 13); ctx.fill();
    ctx.fillStyle = '#ff8f00';
    ctx.beginPath(); ctx.ellipse(x + 10, y + 30, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 22, y + 30, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
}

function drawMarioFireballs() {
    for (const f of mario.fireballs) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.spin);
        const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, f.r);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.4, '#ffeb3b');
        grad.addColorStop(1, '#e65100');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b71c1c'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
    }
}

function drawMarioBird() {
    const b = mario.bird;
    if (b.invuln > 0 && Math.floor(b.invuln * 10) % 2 === 0) return;

    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
    if (b.facing < 0) ctx.scale(-1, 1);

    const tint = b.power === 'fire' ? '#fff' : b.power === 'big' ? '#fff59d' : null;
    const accent = b.power === 'fire' ? '#ff5252' : '#fbc02d';

    const scale = b.power === 'small' ? 0.85 : 1.05;
    ctx.scale(scale, scale);

    const bob = b.onGround && Math.abs(b.vx) > 10 ? Math.sin(b.t * 16) * 1.5 : 0;
    ctx.translate(0, bob);

    // Body
    const grad = ctx.createRadialGradient(-6, -6, 4, 0, 0, 26);
    grad.addColorStop(0, tint || '#fff59d');
    grad.addColorStop(0.5, '#ffeb3b');
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f57f17'; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(-2, 6, 12, 6, 0, 0, Math.PI * 2); ctx.fill();

    // Wing
    const flapping = !b.onGround;
    const wingY = flapping ? Math.sin(b.t * 18) * 6 : 4;
    ctx.save();
    ctx.translate(-3, wingY);
    ctx.rotate(flapping ? Math.sin(b.t * 18) * 0.5 : 0.2);
    const wg = ctx.createLinearGradient(0, -8, 0, 8);
    wg.addColorStop(0, '#fbc02d');
    wg.addColorStop(1, '#f57f17');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e65100'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();

    // Legs
    ctx.fillStyle = '#f57f17';
    if (b.onGround && Math.abs(b.vx) > 10) {
        const lp = Math.sin(b.t * 16);
        ctx.fillRect(-6, 14, 4, 6 + lp * 2);
        ctx.fillRect( 2, 14, 4, 6 - lp * 2);
    } else {
        ctx.fillRect(-6, 14, 4, 6);
        ctx.fillRect( 2, 14, 4, 6);
    }

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(7, -5, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(9, -5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(10, -6, 1.2, 0, Math.PI * 2); ctx.fill();

    // Beak
    ctx.fillStyle = '#ff7043';
    ctx.strokeStyle = '#bf360c'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.lineTo(32, -4);
    ctx.lineTo(32, 4);
    ctx.lineTo(18, 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Hat (Big/Fire)
    if (b.power !== 'small') {
        ctx.fillStyle = b.power === 'fire' ? '#fff' : '#d32f2f';
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, -14);
        ctx.lineTo(20, -16);
        ctx.lineTo(22, -10);
        ctx.lineTo(-10, -8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillRect(14, -10, 14, 4); ctx.strokeRect(14, -10, 14, 4);
        if (b.power === 'fire') {
            ctx.fillStyle = '#ff5252';
            drawStar(4, -12, 5, 4, 1.8); ctx.fill();
        }
    }

    ctx.restore();
}

// ----- Mario input bindings -----
function bindMarioHold(btn, key) {
    const set = v => { marioInput[key] = v; };
    btn.addEventListener('mousedown',  e => { e.preventDefault(); ensureAudio(); set(true); });
    btn.addEventListener('mouseup',    () => set(false));
    btn.addEventListener('mouseleave', () => set(false));
    btn.addEventListener('touchstart', e => { e.preventDefault(); ensureAudio(); set(true); }, { passive: false });
    btn.addEventListener('touchend',   e => { e.preventDefault(); set(false); });
    btn.addEventListener('touchcancel',() => set(false));
}
bindMarioHold(document.getElementById('mLeftBtn'),  'left');
bindMarioHold(document.getElementById('mRightBtn'), 'right');
bindMarioHold(document.getElementById('mJumpBtn'),  'jump');
bindMarioHold(document.getElementById('mFireBtn'),  'fire');

// Mario keyboard (overrides flap-mode key handling when in MARIO mode)
window.addEventListener('keydown', e => {
    if (mode !== MODE.MARIO) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA')  { e.preventDefault(); marioInput.left  = true; }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); marioInput.right = true; }
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); marioInput.jump = true; }
    if (e.code === 'KeyF' || e.code === 'KeyZ' || e.code === 'KeyX' ||
        e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); marioInput.fire = true; }
});
window.addEventListener('keyup', e => {
    if (mode !== MODE.MARIO) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA')  marioInput.left  = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') marioInput.right = false;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') marioInput.jump = false;
    if (e.code === 'KeyF' || e.code === 'KeyZ' || e.code === 'KeyX' ||
        e.code === 'ShiftLeft' || e.code === 'ShiftRight') marioInput.fire = false;
});

// ============================================================================
// CHAOTIC MODES — mode catalog, FX system, per-mode logic
// ============================================================================

const MODES_CATALOG = [
    { key: 'classic', name: 'CLASSIC',     desc: 'Infinite flight & guns',         icon: 'target',   theme: '' },
    { key: 'tax',     name: 'TAX ESCAPE',  desc: 'Run from auditors',              icon: 'doc',      theme: 'tax' },
    { key: 'mario',   name: 'BIRD BROS',   desc: 'Mario-style platformer',         icon: 'mushroom', theme: 'mario' },
    { key: 'drunk',   name: 'DRUNK MODE',  desc: 'Eat 200 feet to sober up',       icon: 'wine',     theme: 'drunk' },
    { key: 'bee',     name: 'BEE MODE',    desc: 'BZZZZZZ. They want you.',        icon: 'bee',      theme: 'bee' },
    { key: 'potato',  name: 'POTATO MODE', desc: 'Why is everything starchy',      icon: 'potato',   theme: 'potato' },
    { key: 'boss',    name: 'BOSS MODE',   desc: 'One enormous menace',            icon: 'boss',     theme: 'boss' },
    { key: 'reverse', name: 'REVERSE',     desc: 'Down is up. Up is down.',        icon: 'reverse',  theme: 'reverse' },
    { key: 'chaos',   name: 'CHAOS',       desc: 'Random nonsense, every 5 sec',   icon: 'chaos',    theme: 'chaos' },
    { key: 'hacker',  name: 'FAKE HACKER', desc: 'Definitely not real hacking',    icon: 'hacker',   theme: 'hacker' },
    { key: 'sleep',   name: 'SLEEP MODE',  desc: 'Try to stay awake',              icon: 'sleep',    theme: 'sleep' },
];

const LOADING_TIPS = [
    'Feet improve aerodynamics.',
    'Taxes increase enemy spawn rate.',
    'Bird law is very complicated.',
    'Pressing F harder does nothing extra.',
    'Wine is technically a vegetable.',
    'In space, no one can hear you flap.',
    'Bees have nine knees. (citation needed)',
    'A potato is 96% loyalty by mass.',
    'Auditors fear cake. Bring cake.',
    'The bird cannot read. Do not show it your taxes.',
    'Pro tip: do not get drunk.',
    'Pro tip: get drunk.',
    'If you see a giant foot, that is your foot.',
    'Sleep is for the weak. And for sleep mode.',
    'Hackers are usually fine. Probably.',
    'The bird is judging you, quietly.',
    'Microwaves are at 9pm tonight.',
    'You miss 100% of the feet you do not eat.',
    'Pigeons run six of the world’s top banks.',
];

const ACHIEVEMENTS_POOL = [
    'First steps', 'Look ma, no hands', 'Mildly inebriated',
    'Bee enthusiast', 'Chronic potato', 'Hacker pro 9000',
    'Sleep deprived', 'Reverse cardio', 'Boss cuddler',
    'Chaos theorist', 'Aerodynamic feet', 'Tax evader of the year',
    'Slightly committed', 'Almost competent', 'Did the thing',
];

const FAKE_HACK_MESSAGES = [
    'INITIATING ATTACK\n> root@bird:~# rm -rf /\n> permission denied (you are a bird)',
    'SYSTEM HACKED\nSocial engineering: 100%\nFirewall: bypassed\nCake: located',
    'WARNING\nNation-state actor detected.\nTheir nation: Australia.',
    'TRACE ROUTE\nIP: 192.168.1.bird\nLocation: a tree, somewhere',
    'EXPLOIT FOUND\nCVE-2026-FEET\nSeverity: HOT',
    'UPLOADING\n[========>........] 47%\nfeet.zip: 6.2 GB',
    'BREACH DETECTED\nUnauthorized access in:\n- fridge\n- oven\n- microwave',
    'DECRYPTING WI-FI\npassword: hunter2\n... too easy',
    'BIRD.EXE has stopped\nresponding. Continue\npretending nothing\nhappened?',
    'THE GOVERNMENT\nis on line 1.\nThey would like\ntheir tax forms back.',
];

const CHAOS_POPUPS = [
    { t: 'Windows', b: 'Your computer has\nbeen replaced with\na microwave.' },
    { t: 'ERROR 404',  b: 'Bird not found.\nFinding bird... 87%' },
    { t: 'UPDATE',     b: 'Important update\navailable: Feet 2.0' },
    { t: 'WARNING',    b: 'You have 1 (one) too\nmany toes.' },
    { t: 'CAPTCHA',    b: 'Prove you are NOT\na bird.' },
    { t: 'NOTICE',     b: 'Your warranty has\nexpired.\nIt was on the bird.' },
    { t: 'PRINTER',    b: 'Out of paper.\nOut of bird.' },
    { t: 'IRS',        b: 'You owe us 12 feet.\nClick here to pay.' },
];

const CHAOS_EFFECTS = [
    'giantBird', 'tinyBird', 'hyperGravity', 'moonGravity',
    'invertColors', 'spinning', 'feetRain', 'fakeError',
];

// ----- Mode select grid -----
function buildModeGrid() {
    const grid = document.getElementById('modeGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (const m of MODES_CATALOG) {
        const card = document.createElement('button');
        card.className = `mode-card${m.theme ? ' theme-' + m.theme : ''}`;
        card.innerHTML = `
            <div class="mode-card-icon"><div class="ico-${m.icon}"></div></div>
            <div class="mode-card-name">${m.name}</div>
            <div class="mode-card-desc">${m.desc}</div>
        `;
        card.addEventListener('click', () => onModeClick(m.key));
        grid.appendChild(card);
    }
}

function onModeClick(modeKey) {
    ensureAudio();
    if (modeKey === 'mario') { showScreen('difficulty'); return; }
    showLoadingTip(() => {
        if (modeKey === 'tax') startCutscene();
        else startGame(modeKey);
    });
}

// ----- Loading tip -----
function showLoadingTip(cb) {
    const overlay = document.getElementById('loadingTip');
    const tip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    document.getElementById('loadingTipText').textContent = tip;
    overlay.classList.remove('hidden');
    let dismissed = false;
    const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        overlay.classList.add('hidden');
        overlay.removeEventListener('click', dismiss);
        cb();
    };
    overlay.addEventListener('click', dismiss);
    setTimeout(dismiss, 1800);
}

// ----- Achievement toast -----
let achievementCooldown = 0;
function showAchievement(text) {
    const toast = document.getElementById('achievementToast');
    document.getElementById('achievementText').textContent = text;
    toast.classList.remove('hidden');
    toast.style.animation = 'none';
    void toast.offsetHeight;
    toast.style.animation = '';
    sfx.surprise();
    setTimeout(() => toast.classList.add('hidden'), 2800);
}

function maybeAchievement(dt) {
    achievementCooldown -= dt;
    if (achievementCooldown <= 0 && Math.random() < dt * 0.18) {
        showAchievement(ACHIEVEMENTS_POOL[Math.floor(Math.random() * ACHIEVEMENTS_POOL.length)]);
        achievementCooldown = 18 + Math.random() * 30;
    }
}

// ----- FX application -----
function applyCanvasFx() {
    const f = [];
    if (modeFx.blur > 0) f.push(`blur(${modeFx.blur}px)`);
    if (modeFx.invert > 0) f.push(`invert(${modeFx.invert})`);
    canvas.style.filter = f.join(' ');
    const tr = [];
    if (modeFx.rotate) tr.push(`rotate(${modeFx.rotate}deg)`);
    if (modeFx.scale !== 1) tr.push(`scale(${modeFx.scale})`);
    if (modeFx.flipY) tr.push('scaleY(-1)');
    canvas.style.transform = tr.join(' ');
}

function resetModeFx() {
    modeFx.blur = 0; modeFx.rotate = 0; modeFx.invert = 0;
    modeFx.scale = 1; modeFx.flipY = false;
    modeFx.pendingFlap = 0; modeFx.chaosGravityMul = 1;
    modeFx.drunkActive = false; modeFx.drunkTimer = 0;
    modeFx.feetEaten = 0; modeFx.feetSpawnTimer = 0;
    modeFx.wineTimer = 5; modeFx.drunkPhase = 0;
    modeFx.bees = []; modeFx.beeScreamTimer = 5;
    modeFx.boss = null; modeFx.bossSpawned = false; modeFx.bossKilled = false;
    modeFx.chaosTimer = 4; modeFx.chaosEffect = null; modeFx.chaosEffectTimer = 0;
    modeFx.savedBirdR = 0;
    modeFx.hackerPopupTimer = 3;
    modeFx.asleep = false; modeFx.sleepCheckTimer = 8;
    modeFx.sleepWakeTaps = 0; modeFx.sleepWakeTime = 0;
    modeFx.reverseFlipTimer = 8;
    modeFx.potatoRainTimer = 3; modeFx.potatoes = [];
    modeFx.feetRain = [];
    wineBottles = [];
    giantFeet = [];
    achievementCooldown = 12;
    document.getElementById('drunkHud').classList.add('hidden');
    document.getElementById('drunkOverlay').classList.add('hidden');
    document.getElementById('soberOverlay').classList.add('hidden');
    document.getElementById('sleepOverlay').classList.add('hidden');
    const hl = document.getElementById('hackerLayer');
    hl.classList.add('hidden'); hl.innerHTML = '';
    document.getElementById('chaosPopup').classList.add('hidden');
    canvas.style.filter = '';
    canvas.style.transform = '';
}

// ----- Per-mode dispatcher -----
function updateModeFx(dt) {
    if (state !== STATE.PLAYING) return;
    if (mode === MODE.DRUNK) updateDrunkMode(dt);
    else if (mode === MODE.BEE) updateBeeMode(dt);
    else if (mode === MODE.POTATO) updatePotatoMode(dt);
    else if (mode === MODE.BOSS) updateBossMode(dt);
    else if (mode === MODE.REVERSE) updateReverseMode(dt);
    else if (mode === MODE.CHAOS) updateChaosMode(dt);
    else if (mode === MODE.HACKER) updateHackerMode(dt);
    else if (mode === MODE.SLEEP) updateSleepMode(dt);

    if (mode !== MODE.MARIO && state === STATE.PLAYING) maybeAchievement(dt);
}

function renderModeExtras() {
    if (mode === MODE.DRUNK) renderDrunkExtras();
    else if (mode === MODE.BEE) renderBeeExtras();
    else if (mode === MODE.POTATO) renderPotatoExtras();
    else if (mode === MODE.BOSS) renderBossExtras();
    else if (mode === MODE.CHAOS) renderChaosExtras();
    else if (mode === MODE.HACKER) drawSunglasses();
    else if (mode === MODE.SLEEP) drawSleepyEye();
}

// ============================================================================
// DRUNK MODE
// ============================================================================
function updateDrunkMode(dt) {
    if (!modeFx.drunkActive) {
        modeFx.wineTimer -= dt;
        if (modeFx.wineTimer <= 0) {
            spawnWineBottle();
            modeFx.wineTimer = 4 + Math.random() * 4;
        }
    }
    // Move wine bottles
    const speed = SPEED_BASE + Math.min(220, distance / 6);
    for (const w of wineBottles) {
        w.x -= speed * dt;
        w.t += dt;
        w.y += Math.sin(w.t * 3) * 0.4;
    }
    wineBottles = wineBottles.filter(w => w.x > -50);
    // Wine vs bird
    for (const w of wineBottles) {
        if (Math.hypot(w.x - bird.x, w.y - bird.y) < bird.r + 18) {
            w.x = -9999;
            triggerDrunk();
        }
    }

    if (modeFx.drunkActive) {
        modeFx.drunkTimer -= dt;
        document.getElementById('drunkTimer').textContent = Math.max(0, Math.ceil(modeFx.drunkTimer));
        document.getElementById('feetEaten').textContent = modeFx.feetEaten;
        if (modeFx.drunkTimer <= 0) { gameOver('You stayed drunk forever.'); return; }

        // Spawn lots of feet
        modeFx.feetSpawnTimer -= dt;
        if (modeFx.feetSpawnTimer <= 0) {
            spawnGiantFoot();
            modeFx.feetSpawnTimer = 0.18 + Math.random() * 0.18;
        }
        for (const f of giantFeet) {
            f.x -= (200 + 80 * Math.sin(f.t * 4)) * dt;
            f.y += Math.sin(f.t * 6) * 1.5;
            f.t += dt;
            f.rot += dt * 4 * f.spinDir;
        }
        giantFeet = giantFeet.filter(f => f.x > -60);
        for (const f of giantFeet) {
            if (Math.hypot(f.x - bird.x, f.y - bird.y) < bird.r + 32) {
                f.x = -9999;
                modeFx.feetEaten += 1;
                spawnParticles(bird.x, bird.y, 5, '#ffcc99');
                sfx.coin();
                if (modeFx.feetEaten >= 200) soberUp();
            }
        }

        // Drunk visual + bird wobble
        modeFx.drunkPhase += dt * 4;
        modeFx.rotate = Math.sin(modeFx.drunkPhase) * 6;
        modeFx.blur = 2.2;
        modeFx.scale = 1 + Math.sin(modeFx.drunkPhase * 0.7) * 0.04;
        bird.vy += Math.sin(modeFx.drunkPhase * 3) * 60 * dt;
    } else {
        modeFx.rotate *= 0.9; modeFx.blur *= 0.9; modeFx.scale = 1 + (modeFx.scale - 1) * 0.9;
    }
}

function spawnWineBottle() {
    wineBottles.push({
        x: W + 30, y: 90 + Math.random() * (H - GROUND_H - 160),
        t: 0,
    });
}
function spawnGiantFoot() {
    giantFeet.push({
        x: W + 60,
        y: 60 + Math.random() * (H - GROUND_H - 120),
        t: 0,
        rot: Math.random() * Math.PI * 2,
        spinDir: Math.random() < 0.5 ? -1 : 1,
        scale: 1.2 + Math.random() * 0.7,
    });
}

function triggerDrunk() {
    if (modeFx.drunkActive) return;
    modeFx.drunkActive = true;
    modeFx.drunkTimer = 60;
    modeFx.feetEaten = 0;
    const overlay = document.getElementById('drunkOverlay');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('hidden'), 1500);
    document.getElementById('drunkHud').classList.remove('hidden');
    sfx.surprise();
    sfx.die(); // dramatic
}

function soberUp() {
    modeFx.drunkActive = false;
    modeFx.drunkTimer = 0;
    document.getElementById('drunkHud').classList.add('hidden');
    const sober = document.getElementById('soberOverlay');
    sober.classList.remove('hidden');
    sober.style.animation = 'none';
    void sober.offsetHeight;
    sober.style.animation = '';
    setTimeout(() => sober.classList.add('hidden'), 1500);
    coinsEarned += 30; // reward
    sfx.surprise();
}

function renderDrunkExtras() {
    for (const w of wineBottles) drawWineBottle(w.x, w.y);
    for (const f of giantFeet)   drawGiantFoot(f);
}

function drawWineBottle(x, y) {
    // Body
    ctx.fillStyle = '#4a148c';
    ctx.strokeStyle = '#1a1024';
    ctx.lineWidth = 2;
    ctx.fillRect(x - 9, y - 5, 18, 30);
    ctx.strokeRect(x - 9, y - 5, 18, 30);
    // Neck
    ctx.fillRect(x - 4, y - 18, 8, 14);
    ctx.strokeRect(x - 4, y - 18, 8, 14);
    // Cork
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(x - 4, y - 22, 8, 5);
    // Label
    ctx.fillStyle = '#fff8e1';
    ctx.fillRect(x - 9, y + 4, 18, 10);
    ctx.strokeRect(x - 9, y + 4, 18, 10);
    ctx.fillStyle = '#6a1b9a';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WINE', x, y + 11);
    ctx.textAlign = 'start';
}

function drawGiantFoot(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.scale(f.scale, f.scale);
    drawFootSprite(ctx);
    ctx.restore();
}

// ============================================================================
// BEE MODE
// ============================================================================
function updateBeeMode(dt) {
    const targetCount = Math.min(60, 10 + Math.floor(distance / 5));
    if (modeFx.bees.length < targetCount && Math.random() < dt * 6) {
        modeFx.bees.push({
            x: W + 30 + Math.random() * 80,
            y: Math.random() * (H - GROUND_H - 20),
            vx: -120 - Math.random() * 80,
            vy: (Math.random() - 0.5) * 60,
            t: Math.random() * Math.PI * 2,
            r: 11,
        });
    }
    for (const b of modeFx.bees) {
        b.t += dt;
        const dx = bird.x - b.x;
        const dy = bird.y - b.y;
        const d = Math.hypot(dx, dy) + 0.001;
        b.vx += (dx / d) * 90 * dt;
        b.vy += (dy / d) * 90 * dt;
        b.vx = Math.max(-340, Math.min(180, b.vx));
        b.vy = Math.max(-260, Math.min(260, b.vy));
        b.x += b.vx * dt;
        b.y += b.vy * dt + Math.sin(b.t * 14) * 0.6;
    }
    modeFx.bees = modeFx.bees.filter(b => b.x > -30 && b.x < W + 200);
    for (const b of modeFx.bees) {
        if (Math.hypot(b.x - bird.x, b.y - bird.y) < bird.r + b.r * 0.5) {
            gameOver('Stung by bees!'); return;
        }
    }
    modeFx.beeScreamTimer -= dt;
    if (modeFx.beeScreamTimer <= 0) {
        beep({ freq: 300 + Math.random() * 600, type: 'sawtooth', duration: 0.18, gain: 0.07, sweep: -200 });
        modeFx.beeScreamTimer = 3 + Math.random() * 4;
    }
}

function renderBeeExtras() {
    for (const b of modeFx.bees) drawBee(b);
}

function drawBee(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    // Body (yellow + black stripes)
    ctx.fillStyle = '#fdd835';
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.fillRect(-8, -7, 3, 14);
    ctx.fillRect(-1, -7, 3, 14);
    ctx.fillRect(6, -7, 3, 14);
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2); ctx.stroke();
    // Wings
    const wing = Math.sin(b.t * 30) * 3;
    ctx.fillStyle = 'rgba(220,240,255,0.85)';
    ctx.beginPath(); ctx.ellipse(-2, -8 + wing, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -8 + wing, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    // Stinger
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-18, -2); ctx.lineTo(-18, 2); ctx.fill();
    // Tiny eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(8, -2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ============================================================================
// POTATO MODE
// ============================================================================
function updatePotatoMode(dt) {
    modeFx.potatoRainTimer -= dt;
    if (modeFx.potatoRainTimer <= 0) {
        modeFx.potatoes.push({
            x: Math.random() * W,
            y: -30,
            vy: 200 + Math.random() * 200,
            vx: -60 + Math.random() * 120,
            t: 0,
            r: 14,
            rot: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 4,
        });
        modeFx.potatoRainTimer = 0.45 + Math.random() * 0.5;
    }
    for (const p of modeFx.potatoes) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 600 * dt;
        p.t += dt;
        p.rot += p.spin * dt;
    }
    modeFx.potatoes = modeFx.potatoes.filter(p => p.y < H + 40);
    for (const p of modeFx.potatoes) {
        if (Math.hypot(p.x - bird.x, p.y - bird.y) < bird.r + p.r) {
            gameOver('Hit by a falling potato.'); return;
        }
    }
}

function renderPotatoExtras() {
    for (const p of modeFx.potatoes) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        drawPotato(0, 0, p.r);
        ctx.restore();
    }
}

function drawPotato(x, y, r) {
    ctx.fillStyle = '#a1887f';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.stroke();
    // Spots
    ctx.fillStyle = '#5d4037';
    [[r * 0.3, -r * 0.2], [-r * 0.4, r * 0.1], [r * 0.5, r * 0.3], [-r * 0.2, -r * 0.4]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, r * 0.08, 0, Math.PI * 2); ctx.fill();
    });
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
}

function drawPotatoEnemy(e) {
    drawPotato(0, 0, 22);
    // Angry potato face
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-5, -3, 3.5, 0, Math.PI * 2); ctx.arc(6, -3, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(-5, -3, 1.6, 0, Math.PI * 2); ctx.arc(6, -3, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#212121'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-9, -8); ctx.lineTo(-2, -6);
    ctx.moveTo(11, -8); ctx.lineTo(4, -6);
    ctx.stroke();
    // Mouth
    ctx.beginPath();
    ctx.moveTo(-3, 7); ctx.lineTo(0, 4); ctx.lineTo(3, 7); ctx.lineTo(6, 4); ctx.stroke();
}

function drawPotatoBullet(b) {
    ctx.rotate(b.spin * 0.3);
    drawPotato(0, 0, b.r + 2);
}

// ============================================================================
// BOSS MODE
// ============================================================================
function updateBossMode(dt) {
    if (!modeFx.bossSpawned && distance > 4) {
        spawnBoss();
        modeFx.bossSpawned = true;
    }
    if (!modeFx.boss) return;
    const b = modeFx.boss;
    b.t += dt;
    b.y = b.baseY + Math.sin(b.t * 1.4) * 80;

    b.attackTimer -= dt;
    if (b.attackTimer <= 0) {
        b.projectiles.push({
            x: b.x - 60, y: b.y,
            vx: -340 - Math.random() * 100,
            vy: (bird.y - b.y) * 0.4,
            life: 4, r: 12,
        });
        b.attackTimer = 0.9 + Math.random() * 0.7;
        sfx.shoot();
    }
    for (const p of b.projectiles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    }
    b.projectiles = b.projectiles.filter(p => p.life > 0 && p.x > -50);
    for (const p of b.projectiles) {
        if (Math.hypot(p.x - bird.x, p.y - bird.y) < bird.r + p.r) {
            gameOver('Hit by the boss!'); return;
        }
    }
    if (bird.x + bird.r > b.x - 80 && bird.y > b.y - 80 && bird.y < b.y + 80) {
        gameOver('Touched the boss. Bad idea.'); return;
    }
    // Bullets vs boss
    for (const bullet of bullets) {
        if (Math.abs(bullet.x - b.x) < 80 && Math.abs(bullet.y - b.y) < 80) {
            b.hp -= bullet.damage;
            bullet.life = 0;
            spawnHitSplash(bullet.x, bullet.y, '#ff5252');
            sfx.hit();
            if (b.hp <= 0) { bossDefeated(); return; }
        }
    }
}

function spawnBoss() {
    const types = ['foot', 'taxman', 'pigeon', 'microwave'];
    const type = types[Math.floor(Math.random() * types.length)];
    modeFx.boss = {
        x: W - 110,
        baseY: H * 0.4,
        y: H * 0.4,
        hp: 50, maxHp: 50,
        type, t: 0,
        attackTimer: 1.6,
        projectiles: [],
    };
    showAchievement('Boss has appeared');
}

function bossDefeated() {
    modeFx.bossKilled = true;
    state = STATE.OVER;
    save.coins += coinsEarned + 200;
    persist();
    finalDistance.textContent = Math.floor(distance);
    finalCoins.textContent = coinsEarned + 200;
    gameOverTitle.textContent = 'BOSS DEFEATED!';
    gameOverMessage.textContent = 'You absolute legend.';
    jailScene.classList.add('hidden');
    hud.classList.add('hidden');
    setHudMode('flap');
    showScreen('over');
    sfx.surprise();
}

function renderBossExtras() {
    if (!modeFx.boss) return;
    const b = modeFx.boss;
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.type === 'foot') drawHugeFoot();
    else if (b.type === 'taxman') drawHugeTaxman();
    else if (b.type === 'pigeon') drawHugePigeon();
    else if (b.type === 'microwave') drawHugeMicrowave();
    ctx.restore();
    for (const p of b.projectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, p.r);
        grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, '#ff9800'); grad.addColorStop(1, '#b71c1c');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5d2f02'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
    }
    // HP bar
    const hpW = Math.min(280, W - 40), hpH = 14;
    const hx = W / 2 - hpW / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(hx, 12, hpW, hpH);
    ctx.fillStyle = '#f44336';
    ctx.fillRect(hx, 12, hpW * (b.hp / b.maxHp), hpH);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(hx, 12, hpW, hpH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GIANT ' + b.type.toUpperCase(), W / 2, 24);
    ctx.textAlign = 'start';
}

function drawHugeFoot() {
    // Big foot — reuse foot sprite scaled up
    ctx.save();
    ctx.scale(4, 4);
    drawFootSprite(ctx);
    ctx.restore();
    // Angry eyes on the foot
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -10, 12, 0, Math.PI * 2); ctx.arc(40, -10, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(2, -8, 5, 0, Math.PI * 2); ctx.arc(42, -8, 5, 0, Math.PI * 2); ctx.fill();
}

function drawHugeTaxman() {
    // Giant suit man face
    ctx.fillStyle = '#fdd0a2';
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath(); ctx.arc(0, -50, 60, Math.PI, 0); ctx.fill();
    // Glasses
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(-22, -8, 16, 0, Math.PI * 2); ctx.arc(22, -8, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(33,33,33,0.55)';
    ctx.beginPath(); ctx.arc(-22, -8, 14, 0, Math.PI * 2); ctx.arc(22, -8, 14, 0, Math.PI * 2); ctx.fill();
    // Frown
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 50, 18, Math.PI, 0); ctx.stroke();
    // Mustache
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(-12, 24, 14, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(12, 24, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tax form floating around
    ctx.fillStyle = '#fffde7';
    ctx.fillRect(-90, -34, 24, 32);
    ctx.strokeStyle = '#c62828'; ctx.lineWidth = 2;
    ctx.strokeRect(-90, -34, 24, 32);
    ctx.fillStyle = '#c62828';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('TAX', -86, -16);
}

function drawHugePigeon() {
    // Giant pigeon
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath(); ctx.ellipse(0, 0, 70, 56, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#37474f'; ctx.lineWidth = 4; ctx.stroke();
    // Head
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath(); ctx.arc(45, -34, 32, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    // Beak
    ctx.fillStyle = '#ff7043';
    ctx.beginPath(); ctx.moveTo(75, -36); ctx.lineTo(100, -34); ctx.lineTo(75, -28); ctx.fill(); ctx.stroke();
    // Eye (bloodshot)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(52, -38, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath(); ctx.arc(54, -36, 4, 0, Math.PI * 2); ctx.fill();
    // Wing
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.moveTo(-30, 0); ctx.lineTo(-60, -30); ctx.lineTo(-50, 20); ctx.fill(); ctx.stroke();
    // Feet
    ctx.strokeStyle = '#ff7043'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-20, 50); ctx.lineTo(-20, 70); ctx.moveTo(20, 50); ctx.lineTo(20, 70); ctx.stroke();
}

function drawHugeMicrowave() {
    // Giant microwave
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-90, -60, 180, 120);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeRect(-90, -60, 180, 120);
    // Door (window)
    ctx.fillStyle = '#212121';
    ctx.fillRect(-78, -48, 130, 96);
    ctx.strokeRect(-78, -48, 130, 96);
    // Mesh
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (let xx = -78; xx <= 52; xx += 8) {
        ctx.beginPath(); ctx.moveTo(xx, -48); ctx.lineTo(xx, 48); ctx.stroke();
    }
    for (let yy = -48; yy <= 48; yy += 8) {
        ctx.beginPath(); ctx.moveTo(-78, yy); ctx.lineTo(52, yy); ctx.stroke();
    }
    // Glow inside (something is in there...)
    ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
    ctx.fillRect(-78, -48, 130, 96);
    // Angry eyes inside
    ctx.fillStyle = '#ff5252';
    ctx.beginPath(); ctx.arc(-30, 0, 10, 0, Math.PI * 2); ctx.arc(20, 0, 10, 0, Math.PI * 2); ctx.fill();
    // Control panel
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(54, -48, 32, 96);
    ctx.strokeRect(54, -48, 32, 96);
    ctx.fillStyle = '#f44336';
    ctx.fillRect(60, -40, 20, 16);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('999', 61, -28);
    // Buttons
    ctx.fillStyle = '#212121';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        ctx.fillRect(62 + c * 10, -10 + r * 14, 6, 8);
    }
}

// ============================================================================
// REVERSE MODE
// ============================================================================
function updateReverseMode(dt) {
    modeFx.flipY = true;
    modeFx.reverseFlipTimer -= dt;
    if (modeFx.reverseFlipTimer <= 0) {
        modeFx.rotate = (modeFx.rotate + 180) % 360;
        modeFx.reverseFlipTimer = 6 + Math.random() * 6;
        showAchievement('Down is up.');
    }
}

// ============================================================================
// CHAOS MODE
// ============================================================================
function updateChaosMode(dt) {
    // Tick raining feet always (may persist after the effect window ends)
    if (modeFx.feetRain.length > 0) {
        for (const f of modeFx.feetRain) {
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            f.vy += 600 * dt;
            f.rot += f.spin * dt;
            if (bird && Math.hypot(f.x - bird.x, f.y - bird.y) < bird.r + 20) {
                f.x = -9999;
                gameOver('Smashed by a falling foot.');
                return;
            }
        }
        modeFx.feetRain = modeFx.feetRain.filter(f => f.y < H + 40 && f.x > -50);
    }

    if (!modeFx.chaosEffect) {
        modeFx.chaosTimer -= dt;
        if (modeFx.chaosTimer <= 0) startChaosEffect();
    } else {
        modeFx.chaosEffectTimer -= dt;
        applyChaosEffect(dt);
        if (modeFx.chaosEffectTimer <= 0) {
            endChaosEffect();
            modeFx.chaosTimer = 1.8 + Math.random() * 3.5;
        }
    }
}

function startChaosEffect() {
    const e = CHAOS_EFFECTS[Math.floor(Math.random() * CHAOS_EFFECTS.length)];
    modeFx.chaosEffect = e;
    modeFx.chaosEffectTimer = 2 + Math.random() * 3;
    switch (e) {
        case 'giantBird':
            modeFx.savedBirdR = bird.r;
            bird.r = bird.r * 1.8;
            break;
        case 'tinyBird':
            modeFx.savedBirdR = bird.r;
            bird.r = bird.r * 0.55;
            break;
        case 'hyperGravity': modeFx.chaosGravityMul = 2.5; break;
        case 'moonGravity':  modeFx.chaosGravityMul = 0.35; break;
        case 'invertColors': modeFx.invert = 1; break;
        case 'spinning':     /* per-frame */ break;
        case 'feetRain':     /* per-frame */ break;
        case 'fakeError':
            const popup = CHAOS_POPUPS[Math.floor(Math.random() * CHAOS_POPUPS.length)];
            showChaosPopup(popup.t, popup.b);
            modeFx.chaosEffectTimer = 0.3; // popup self-dismisses
            break;
    }
    sfx.surprise();
}

function applyChaosEffect(dt) {
    if (modeFx.chaosEffect === 'spinning') modeFx.rotate += dt * 90;
    if (modeFx.chaosEffect === 'feetRain') {
        if (Math.random() < dt * 12) {
            modeFx.feetRain.push({
                x: Math.random() * W,
                y: -40,
                vy: 220 + Math.random() * 240,
                vx: -50 + Math.random() * 100,
                rot: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 6,
                scale: 0.9 + Math.random() * 0.6,
            });
        }
    }
}

function endChaosEffect() {
    if (modeFx.chaosEffect === 'giantBird' || modeFx.chaosEffect === 'tinyBird') {
        if (bird) bird.r = modeFx.savedBirdR;
    }
    modeFx.chaosEffect = null;
    modeFx.chaosGravityMul = 1;
    modeFx.invert = 0;
    modeFx.rotate = 0;
}

function renderChaosExtras() {
    for (const f of modeFx.feetRain) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.scale(f.scale, f.scale);
        drawFootSprite(ctx);
        ctx.restore();
    }
}

function showChaosPopup(title, body) {
    const popup = document.getElementById('chaosPopup');
    document.getElementById('chaosPopupTitle').textContent = title;
    document.getElementById('chaosPopupBody').innerHTML = body.replace(/\n/g, '<br>');
    popup.classList.remove('hidden');
    popup.style.left = (10 + Math.random() * 60) + '%';
    popup.style.top = (15 + Math.random() * 50) + '%';
    popup.style.animation = 'none';
    void popup.offsetHeight;
    popup.style.animation = '';
    setTimeout(() => popup.classList.add('hidden'), 2200);
}

// ============================================================================
// FAKE HACKER MODE
// ============================================================================
function updateHackerMode(dt) {
    modeFx.hackerPopupTimer -= dt;
    if (modeFx.hackerPopupTimer <= 0) {
        spawnHackerPopup();
        modeFx.hackerPopupTimer = 1.2 + Math.random() * 2.5;
    }
}

function spawnHackerPopup() {
    const layer = document.getElementById('hackerLayer');
    layer.classList.remove('hidden');
    const msg = FAKE_HACK_MESSAGES[Math.floor(Math.random() * FAKE_HACK_MESSAGES.length)];
    const win = document.createElement('div');
    win.className = 'hacker-window';
    win.style.left = (10 + Math.random() * Math.max(40, W - 260)) + 'px';
    win.style.top  = (50 + Math.random() * Math.max(60, H - 240)) + 'px';
    win.innerHTML = `
        <div class="hacker-window-bar">terminal — bird@hacker</div>
        <div class="hacker-window-body">${msg.replace(/\n/g, '<br>')}</div>
    `;
    layer.appendChild(win);
    setTimeout(() => { if (win.parentNode) win.parentNode.removeChild(win); }, 4200);
    beep({ freq: 1200, type: 'square', duration: 0.04, gain: 0.05 });
}

function drawSunglasses() {
    if (!bird) return;
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);
    // Glasses bridge
    ctx.fillStyle = '#000';
    ctx.fillRect(-2, -8, 22, 5);
    // Lenses
    ctx.fillStyle = '#212121';
    ctx.fillRect(-2, -7, 8, 7);
    ctx.fillRect(10, -7, 8, 7);
    // Lens shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-1, -6, 3, 2);
    ctx.fillRect(11, -6, 3, 2);
    ctx.restore();
}

// ============================================================================
// SLEEP MODE
// ============================================================================
function updateSleepMode(dt) {
    if (modeFx.asleep) {
        modeFx.sleepWakeTime -= dt;
        if (modeFx.sleepWakeTaps >= 5) {
            // Awake!
            modeFx.asleep = false;
            document.getElementById('sleepOverlay').classList.add('hidden');
            modeFx.sleepCheckTimer = 6 + Math.random() * 6;
            sfx.surprise();
        } else if (modeFx.sleepWakeTime <= 0) {
            // Stayed asleep — bird is doomed.  Hide overlay; gravity handles it.
            modeFx.asleep = false;
            document.getElementById('sleepOverlay').classList.add('hidden');
            // Ensure bird falls
            if (bird) bird.vy = Math.max(bird.vy, 200);
        }
    } else {
        modeFx.sleepCheckTimer -= dt;
        if (modeFx.sleepCheckTimer <= 0) {
            modeFx.asleep = true;
            modeFx.sleepWakeTaps = 0;
            modeFx.sleepWakeTime = 2.5;
            document.getElementById('sleepOverlay').classList.remove('hidden');
            beep({ freq: 100, type: 'sawtooth', duration: 0.5, gain: 0.1, sweep: -40 });
        }
    }
}

function drawSleepyEye() {
    if (!modeFx.asleep || !bird) return;
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);
    // Cover the eye with closed eye (line)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(8, -5, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(14, -5); ctx.stroke();
    ctx.restore();
}

// ----- Build mode grid + extra wiring on script load -----
buildModeGrid();

requestAnimationFrame(loop);
