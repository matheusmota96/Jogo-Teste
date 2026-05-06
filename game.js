/* ========================================================================
   Flappy Bird 2 Advanced — original implementation
   No copyrighted assets; everything drawn with Canvas2D + emoji.
   ======================================================================== */

// ---------- Canvas & sizing ----------
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

// ---------- Persistence ----------
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
        return { ...defaultSave, ...JSON.parse(raw) };
    } catch {
        return { ...defaultSave };
    }
}
function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
}

// ---------- Gun catalog ----------
// damage: hits required to kill an enemy with hp=1 dies in 1 hit; bigger = more hp killed
// fireDelay: ms between shots
// speed: bullet speed (px/s)
const GUNS = {
    basic:  { name: 'Basic Gun',  icon: '🔫', desc: 'Trusty starter sidearm.',         price: 0,    damage: 1, fireDelay: 320, speed: 700, color: '#ffeb3b', shape: 'bullet', secret: false },
    rapid:  { name: 'Rapid Gun',  icon: '🧨', desc: 'Faster fire rate, light shots.',  price: 80,   damage: 1, fireDelay: 130, speed: 820, color: '#4fc3f7', shape: 'bullet', secret: false },
    power:  { name: 'Power Gun',  icon: '💥', desc: 'Slow but powerful — pierces!',    price: 180,  damage: 3, fireDelay: 480, speed: 760, color: '#ff5252', shape: 'orb',    secret: false },
    feet:   { name: 'Feet Gun',   icon: '🦶', desc: 'Cartoon feet. Hilarious.',         price: 250,  damage: 2, fireDelay: 360, speed: 640, color: '#ffcc80', shape: 'foot',   secret: false },
    rainbow:{ name: 'Rainbow Gun',icon: '🌈', desc: 'SECRET — unlocked at 50m!',         price: 0,    damage: 4, fireDelay: 110, speed: 900, color: '#e040fb', shape: 'star',   secret: true },
};

// ---------- DOM refs ----------
const screens = {
    start: document.getElementById('startScreen'),
    mode:  document.getElementById('modeScreen'),
    shop:  document.getElementById('shopScreen'),
    over:  document.getElementById('gameOverScreen'),
};
const hud = document.getElementById('hud');
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

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
}

// ---------- Game state ----------
const STATE = { MENU: 'menu', PLAYING: 'playing', OVER: 'over' };
const MODE  = { CLASSIC: 'classic', TAX: 'tax' };

let state = STATE.MENU;
let mode  = MODE.CLASSIC;

let bird = null;
let obstacles = [];
let enemies = [];
let bullets = [];
let particles = [];
let coinsOnScreen = [];
let distance = 0;
let coinsEarned = 0;
let lastTime = performance.now();
let spawnTimer = 0, enemyTimer = 0, coinTimer = 0, lastShotAt = 0;
let backgroundOffset = 0;
let groundOffset = 0;

// World constants
const GRAVITY = 1700;        // px/s²
const FLAP_VY = -540;        // px/s
const MAX_VY  = 900;
const SPEED_BASE = 220;      // initial scroll speed (px/s)
const GROUND_H = 70;
const CEILING_PAD = 8;
const PIPE_GAP_BASE = 200;

// ---------- Init / reset ----------
function startGame(selectedMode) {
    mode = selectedMode;
    state = STATE.PLAYING;

    bird = {
        x: W * 0.28,
        y: H * 0.45,
        vy: 0,
        r: 22,
        rot: 0,
        flapAnim: 0,
    };
    obstacles = [];
    enemies = [];
    bullets = [];
    particles = [];
    coinsOnScreen = [];

    distance = 0;
    coinsEarned = 0;
    spawnTimer = 0;
    enemyTimer = 1.2;
    coinTimer = 0.8;
    lastShotAt = 0;
    lastTime = performance.now();

    Object.values(screens).forEach(s => s.classList.remove('active'));
    hud.classList.remove('hidden');
    updateHud();
}

function updateHud() {
    distanceDisplay.textContent = Math.floor(distance);
    coinsDisplay.textContent = save.coins + coinsEarned;
    gunDisplay.textContent = GUNS[save.equippedGun].name.replace(' Gun', '');
}

// ---------- Input ----------
function flap() {
    if (state !== STATE.PLAYING) return;
    bird.vy = FLAP_VY;
    bird.flapAnim = 0.18;
}

function tryShoot() {
    if (state !== STATE.PLAYING) return;
    const gun = GUNS[save.equippedGun];
    const now = performance.now();
    if (now - lastShotAt < gun.fireDelay) return;
    lastShotAt = now;

    bullets.push({
        x: bird.x + 18,
        y: bird.y,
        vx: gun.speed,
        vy: 0,
        r: gun.shape === 'orb' ? 12 : 7,
        damage: gun.damage,
        gunKey: save.equippedGun,
        life: 1.6,
        spin: 0,
    });
    spawnParticles(bird.x + 22, bird.y, 4, gun.color);
}

window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); }
    if (e.code === 'KeyF') { e.preventDefault(); tryShoot(); }
});

canvas.addEventListener('mousedown', e => {
    if (state !== STATE.PLAYING) return;
    // Left click: flap; Right click: shoot
    if (e.button === 2) { tryShoot(); }
    else { flap(); }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    flap();
}, { passive: false });

document.getElementById('shootBtn').addEventListener('click', e => {
    e.stopPropagation();
    tryShoot();
});
document.getElementById('shootBtn').addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    tryShoot();
}, { passive: false });

// ---------- Menu wiring ----------
document.getElementById('playBtn').addEventListener('click', () => showScreen('mode'));
document.getElementById('shopBtnFromStart').addEventListener('click', () => { renderShop(); showScreen('shop'); });
document.getElementById('backFromMode').addEventListener('click', () => showScreen('start'));
document.getElementById('backFromShop').addEventListener('click', () => showScreen('start'));
document.getElementById('classicModeBtn').addEventListener('click', () => startGame(MODE.CLASSIC));
document.getElementById('taxModeBtn').addEventListener('click', () => startGame(MODE.TAX));
document.getElementById('restartBtn').addEventListener('click', () => startGame(mode));
document.getElementById('menuBtn').addEventListener('click', () => {
    hud.classList.add('hidden');
    showScreen('start');
    state = STATE.MENU;
});

// ---------- Shop ----------
function renderShop() {
    shopCoins.textContent = save.coins;
    gunsList.innerHTML = '';

    Object.entries(GUNS).forEach(([key, gun]) => {
        if (gun.secret && !save.ownedGuns.includes(key)) return; // hidden until unlocked
        const owned = save.ownedGuns.includes(key);
        const equipped = save.equippedGun === key;

        const card = document.createElement('div');
        card.className = 'gun-card';
        card.innerHTML = `
            <div class="gun-icon">${gun.icon}</div>
            <div class="gun-info">
                <div class="gun-name">${gun.name}</div>
                <div class="gun-desc">${gun.desc}</div>
            </div>
        `;

        const btn = document.createElement('button');
        btn.className = 'gun-action';

        if (equipped) {
            btn.textContent = 'EQUIPPED';
            btn.classList.add('equipped');
        } else if (owned) {
            btn.textContent = 'EQUIP';
            btn.classList.add('equip');
            btn.addEventListener('click', () => {
                save.equippedGun = key;
                persist();
                renderShop();
            });
        } else {
            const canAfford = save.coins >= gun.price;
            btn.textContent = canAfford ? `BUY 💰${gun.price}` : `💰${gun.price}`;
            btn.classList.add(canAfford ? 'buy' : 'locked');
            if (canAfford) {
                btn.addEventListener('click', () => {
                    save.coins -= gun.price;
                    save.ownedGuns.push(key);
                    save.equippedGun = key;
                    persist();
                    renderShop();
                });
            }
        }
        card.appendChild(btn);
        gunsList.appendChild(card);
    });
}

// ---------- Spawning helpers ----------
function spawnObstaclePair() {
    // Pipes (Classic) or stacked tax-paper towers (Tax)
    const minTop = 60;
    const maxTop = H - GROUND_H - PIPE_GAP_BASE - 80;
    const top = minTop + Math.random() * Math.max(60, maxTop - minTop);
    const gap = Math.max(150, PIPE_GAP_BASE - Math.min(60, distance / 30));
    const width = 70;

    obstacles.push({
        x: W + 20,
        topH: top,
        bottomY: top + gap,
        width,
        passed: false,
    });
}

function spawnEnemy() {
    // Enemy types differ by mode
    const fromTop = 50 + Math.random() * (H - GROUND_H - 120);
    let type;
    if (mode === MODE.CLASSIC) {
        const roll = Math.random();
        type = roll < 0.55 ? 'bat' : roll < 0.85 ? 'wasp' : 'ufo';
    } else {
        const roll = Math.random();
        type = roll < 0.45 ? 'auditor' : roll < 0.8 ? 'taxpaper' : 'drone';
    }
    enemies.push({
        x: W + 30,
        y: fromTop,
        baseY: fromTop,
        vx: -(SPEED_BASE + 60 + Math.min(180, distance / 4)),
        type,
        hp: type === 'ufo' || type === 'drone' ? 3 : type === 'wasp' || type === 'auditor' ? 2 : 1,
        t: 0,
        r: 22,
        dead: false,
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
            vx: (Math.random() - 0.5) * 260,
            vy: (Math.random() - 0.5) * 260,
            life: 0.5 + Math.random() * 0.4,
            color,
            r: 2 + Math.random() * 3,
        });
    }
}

// ---------- Update ----------
function update(dt) {
    const speed = SPEED_BASE + Math.min(220, distance / 6);
    distance += (speed * dt) / 30; // 1m per ~30px scrolled

    backgroundOffset = (backgroundOffset + speed * dt * 0.25) % W;
    groundOffset = (groundOffset + speed * dt) % 40;

    // Bird
    bird.vy = Math.min(MAX_VY, bird.vy + GRAVITY * dt);
    bird.y += bird.vy * dt;
    bird.rot = Math.max(-0.5, Math.min(1.2, bird.vy / 600));
    if (bird.flapAnim > 0) bird.flapAnim -= dt;

    // Bounds
    if (bird.y - bird.r < CEILING_PAD) { return gameOver('You hit the ceiling!'); }
    if (bird.y + bird.r > H - GROUND_H) { return gameOver('You hit the ground!'); }

    // Spawn obstacles
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        spawnObstaclePair();
        const minGapTime = Math.max(1.05, 1.65 - distance / 400);
        spawnTimer = minGapTime + Math.random() * 0.4;
    }

    // Spawn enemies (more frequent over time)
    enemyTimer -= dt;
    if (enemyTimer <= 0) {
        spawnEnemy();
        enemyTimer = Math.max(0.7, 2.4 - distance / 150) + Math.random() * 0.6;
    }

    // Spawn coins
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
    }
    enemies = enemies.filter(e => e.x > -60 && !e.dead);

    // Bullets
    for (const b of bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        b.spin += dt * 8;
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
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 280 * dt;
        p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);

    // ---- Collisions ----
    // Bullet vs enemy
    for (const b of bullets) {
        for (const e of enemies) {
            if (e.dead) continue;
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
                e.hp -= b.damage;
                spawnParticles(e.x, e.y, 6, GUNS[b.gunKey].color);
                if (GUNS[b.gunKey].damage < 3) b.life = 0; // basic/rapid/feet stop on hit
                if (e.hp <= 0) {
                    e.dead = true;
                    coinsEarned += 3;
                    spawnParticles(e.x, e.y, 14, '#ffd54f');
                }
                break;
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
        if (Math.hypot(bird.x - e.x, bird.y - e.y) < bird.r + e.r * 0.8) {
            return gameOver(mode === MODE.TAX ? 'An auditor tackled you!' : 'An enemy got you!');
        }
    }

    // Bird vs coin
    for (const c of coinsOnScreen) {
        if (Math.hypot(bird.x - c.x, bird.y - c.y) < bird.r + c.r) {
            c.x = -9999;
            coinsEarned += 2;
            spawnParticles(bird.x, bird.y, 6, '#ffd54f');
        }
    }

    // Surprise at 50m
    if (!save.surpriseSeen && distance >= 50) {
        triggerSurprise();
    }

    updateHud();
}

// ---------- Surprise ----------
function triggerSurprise() {
    save.surpriseSeen = true;
    if (!save.ownedGuns.includes('rainbow')) save.ownedGuns.push('rainbow');
    save.equippedGun = 'rainbow';
    coinsEarned += 50;
    persist();

    surpriseTitle.textContent = '🌈 SECRET UNLOCKED!';
    surpriseText.textContent = 'Rainbow Gun equipped + 50 bonus coins!';
    surpriseNotif.classList.remove('hidden');
    setTimeout(() => surpriseNotif.classList.add('hidden'), 2400);
}

// ---------- Game over ----------
function gameOver(reason) {
    if (state !== STATE.PLAYING) return;
    state = STATE.OVER;

    save.coins += coinsEarned;
    persist();

    finalDistance.textContent = Math.floor(distance);
    finalCoins.textContent = coinsEarned;

    if (mode === MODE.TAX) {
        gameOverTitle.textContent = "YOU'RE IN JAIL, LOSER";
        gameOverMessage.textContent = "GET A JOB! 👮💸";
        jailScene.classList.remove('hidden');
    } else {
        gameOverTitle.textContent = 'GAME OVER';
        gameOverMessage.textContent = reason;
        jailScene.classList.add('hidden');
    }

    hud.classList.add('hidden');
    showScreen('over');
}

// ---------- Render ----------
function drawBackground() {
    // Sky already set via CSS gradient — add parallax clouds
    ctx.save();
    for (let i = 0; i < 6; i++) {
        const cx = ((i * (W / 3)) - backgroundOffset * 0.4) % (W + 200);
        const x = cx < -200 ? cx + W + 200 : cx;
        const y = 60 + (i % 3) * 50;
        drawCloud(x, y, 50 + (i % 2) * 20);
    }

    // Distant skyline (Tax mode) or hills (Classic)
    if (mode === MODE.TAX) {
        ctx.fillStyle = '#90a4ae';
        for (let i = 0; i < 8; i++) {
            const bw = 80;
            const x = ((i * 110) - backgroundOffset * 0.6) % (W + 200);
            const xx = x < -bw ? x + W + 200 : x;
            const bh = 90 + ((i * 37) % 70);
            ctx.fillRect(xx, H - GROUND_H - bh, bw, bh);
            ctx.fillStyle = '#ffeb3b';
            for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
                ctx.fillRect(xx + 12 + c * 22, H - GROUND_H - bh + 12 + r * 18, 10, 10);
            }
            ctx.fillStyle = '#90a4ae';
        }
    } else {
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
    // Ground
    ctx.fillStyle = mode === MODE.TAX ? '#37474f' : '#deb887';
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
    // Dashes
    ctx.fillStyle = mode === MODE.TAX ? '#fdd835' : '#a1887f';
    for (let x = -groundOffset; x < W; x += 40) {
        ctx.fillRect(x, H - GROUND_H + 10, 24, 6);
    }
    // Top edge
    ctx.fillStyle = mode === MODE.TAX ? '#263238' : '#8d6e63';
    ctx.fillRect(0, H - GROUND_H, W, 4);
}

function drawObstacles() {
    for (const o of obstacles) {
        if (mode === MODE.CLASSIC) {
            // Pipes
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(o.x, 0, o.width, o.topH);
            ctx.fillRect(o.x, o.bottomY, o.width, H - GROUND_H - o.bottomY);
            ctx.fillStyle = '#388e3c';
            ctx.fillRect(o.x - 4, o.topH - 18, o.width + 8, 18);
            ctx.fillRect(o.x - 4, o.bottomY, o.width + 8, 18);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(o.x + 6, 0, 6, o.topH - 20);
            ctx.fillRect(o.x + 6, o.bottomY + 20, 6, H - GROUND_H - o.bottomY - 20);
        } else {
            // Tax document tower
            drawTaxTower(o.x, 0, o.width, o.topH);
            drawTaxTower(o.x, o.bottomY, o.width, H - GROUND_H - o.bottomY);
        }
    }
}

function drawTaxTower(x, y, w, h) {
    // Stack of paper sheets
    ctx.fillStyle = '#fffde7';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#bdbdbd';
    ctx.lineWidth = 1;
    for (let yy = y + 6; yy < y + h; yy += 14) {
        ctx.beginPath();
        ctx.moveTo(x + 6, yy);
        ctx.lineTo(x + w - 6, yy);
        ctx.stroke();
    }
    // Red stamps
    ctx.fillStyle = '#c62828';
    ctx.font = 'bold 10px sans-serif';
    for (let yy = y + 26; yy < y + h - 10; yy += 60) {
        ctx.save();
        ctx.translate(x + w / 2, yy);
        ctx.rotate(-0.25);
        ctx.fillText('TAX', -12, 0);
        ctx.restore();
    }
    // Border
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);

    // Body
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f9a825';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wing (animated)
    const wingY = bird.flapAnim > 0 ? -8 : 4;
    ctx.fillStyle = '#fbc02d';
    ctx.beginPath();
    ctx.ellipse(-3, wingY, 12, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff7043';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(34, -3);
    ctx.lineTo(34, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function drawEnemies() {
    for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        switch (e.type) {
            case 'bat': drawBat(e); break;
            case 'wasp': drawWasp(e); break;
            case 'ufo': drawUfo(e); break;
            case 'auditor': drawAuditor(e); break;
            case 'taxpaper': drawTaxPaper(e); break;
            case 'drone': drawDrone(e); break;
        }
        ctx.restore();
    }
}

function drawBat(e) {
    ctx.fillStyle = '#4527a0';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    const wing = Math.sin(e.t * 12) * 8;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-22, -10 + wing); ctx.lineTo(-10, 4); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(22, -10 + wing); ctx.lineTo(10, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-6, -4, 3, 3); ctx.fillRect(3, -4, 3, 3);
}
function drawWasp(e) {
    ctx.fillStyle = '#fdd835';
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.fillRect(-12, -10, 6, 20); ctx.fillRect(0, -10, 6, 20);
    const wing = Math.sin(e.t * 20) * 4;
    ctx.fillStyle = 'rgba(200,230,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-2, -10 + wing, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-26, -3); ctx.lineTo(-26, 3); ctx.fill();
}
function drawUfo(e) {
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath(); ctx.ellipse(0, 4, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath(); ctx.arc(0, -4, 14, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffeb3b';
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.arc(i * 8, 6, 3, 0, Math.PI * 2); ctx.fill();
    }
}
function drawAuditor(e) {
    // Suit guy with briefcase
    ctx.fillStyle = '#fdd0a2'; // head
    ctx.beginPath(); ctx.arc(0, -10, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121'; // suit
    ctx.fillRect(-12, -2, 24, 22);
    ctx.fillStyle = '#fff'; // shirt
    ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(3, -2); ctx.lineTo(0, 8); ctx.fill();
    ctx.fillStyle = '#c62828'; // tie
    ctx.fillRect(-2, -2, 4, 10);
    ctx.fillStyle = '#5d4037'; // briefcase
    ctx.fillRect(8, 8, 12, 10);
    // Glasses
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-4, -10, 3, 0, Math.PI * 2); ctx.arc(4, -10, 3, 0, Math.PI * 2); ctx.stroke();
}
function drawTaxPaper(e) {
    ctx.save();
    ctx.rotate(Math.sin(e.t * 5) * 0.3);
    ctx.fillStyle = '#fffde7';
    ctx.fillRect(-14, -18, 28, 36);
    ctx.strokeStyle = '#9e9e9e'; ctx.lineWidth = 1;
    for (let y = -12; y < 16; y += 6) {
        ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(10, y); ctx.stroke();
    }
    ctx.fillStyle = '#c62828';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('IRS', -8, -2);
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
    ctx.strokeRect(-14, -18, 28, 36);
    ctx.restore();
}
function drawDrone(e) {
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-14, -4, 28, 8);
    ctx.fillStyle = '#263238';
    ctx.fillRect(-3, -2, 6, 6);
    // Rotors
    const r = Math.sin(e.t * 30) * 14;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14 - r, -8); ctx.lineTo(-14 + r, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14 - r, -8); ctx.lineTo(14 + r, -8); ctx.stroke();
    ctx.fillStyle = '#f44336';
    ctx.beginPath(); ctx.arc(0, 1, 2, 0, Math.PI * 2); ctx.fill();
}

function drawBullets() {
    for (const b of bullets) {
        const gun = GUNS[b.gunKey];
        ctx.save();
        ctx.translate(b.x, b.y);
        if (gun.shape === 'foot') {
            ctx.rotate(b.spin * 0.5);
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🦶', 0, 0);
        } else if (gun.shape === 'orb') {
            const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, b.r);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(1, gun.color);
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
        } else if (gun.shape === 'star') {
            ctx.rotate(b.spin);
            const colors = ['#ff5252','#ff9800','#ffeb3b','#4caf50','#2196f3','#9c27b0'];
            ctx.fillStyle = colors[Math.floor(b.spin * 2) % colors.length];
            drawStar(0, 0, 5, b.r + 2, b.r * 0.5);
            ctx.fill();
        } else {
            ctx.fillStyle = gun.color;
            ctx.beginPath(); ctx.ellipse(0, 0, b.r + 2, b.r - 1, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.ellipse(-2, -1, 2, 1, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
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

function drawCoins() {
    for (const c of coinsOnScreen) {
        const sx = Math.abs(Math.cos(c.t)) * c.r + 4;
        ctx.fillStyle = '#ffc107';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, sx, c.r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff59d';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, sx * 0.5, c.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f57f17'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(c.x, c.y, sx, c.r, 0, 0, Math.PI * 2); ctx.stroke();
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    }
    ctx.globalAlpha = 1;
}

function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    if (state === STATE.PLAYING) {
        drawObstacles();
        drawCoins();
        drawEnemies();
        drawBullets();
        drawParticles();
        if (bird) drawBird();
    }
    drawGround();
}

// ---------- Loop ----------
function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    if (state === STATE.PLAYING) {
        update(dt);
    } else {
        // Idle ambient scroll for menu screens
        backgroundOffset = (backgroundOffset + 50 * dt) % W;
        groundOffset = (groundOffset + 80 * dt) % 40;
    }

    render();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
