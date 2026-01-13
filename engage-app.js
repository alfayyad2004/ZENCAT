/**
 * Space Quest RPG logic
 * Silence = Fuel/Boost
 * Noise = Obstacles/Drag
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let highScore = localStorage.getItem('space_highscore') || 0;
let fuel = 50; // 0-100
let speed = 0;
let distance = 0;
let lastTime = 0;
let planetsFound = 0;

// Audio
let audioContext, analyser, microphone, dataArray;
let noiseLevel = 0;
let sensitivity = 50;

// Assets
const assets = {
    rocket: new Image(),
    bg: new Image(),
    planet: new Image(),
    asteroid: new Image()
};
assets.rocket.src = 'pixel-rocket.png';
assets.bg.src = 'pixel-space-bg.png';
assets.planet.src = 'pixel-planet.png';
assets.asteroid.src = 'pixel-asteroid.png';

// Entities
const rocket = {
    x: 100,
    y: 300,
    width: 64,
    height: 32,
    yVelocity: 0
};

let obstacles = [];
let planets = [];
let particles = [];
let bgOffset = 0;

// UI Elements
const uiFuel = document.getElementById('fuel-fill');
const uiScore = document.getElementById('score');
const uiHighScore = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const sensitivityInput = document.getElementById('sensitivity');

// simple synth for sound fx
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'boost') {
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

// Init
function init() {
    canvas.width = 800;
    canvas.height = 600;
    uiHighScore.innerText = highScore.toString().padStart(6, '0');

    sensitivityInput.addEventListener('input', (e) => sensitivity = e.target.value);

    startScreen.addEventListener('click', startGame);
    gameOverScreen.addEventListener('click', resetGame);

    // Resume audio context on click
    window.addEventListener('click', () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }, { once: true });

    requestAnimationFrame(gameLoop);
}

async function startGame() {
    try {
        if (!audioContext) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            analyser.fftSize = 256;
            microphone.connect(analyser);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }

        resetGame();
    } catch (err) {
        console.error("Audio error:", err);
        alert("Microphone access needed for the mission!");
    }
}

function resetGame() {
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    score = 0;
    distance = 0;
    fuel = 50;
    speed = 0;
    obstacles = [];
    planets = [];
    particles = [];
    rocket.y = 300;
    rocket.yVelocity = 0;
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime; // Not strictly used for physics here but good practice
    lastTime = timestamp;

    update();
    draw();

    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState !== 'PLAYING') return;

    // AUDIO PROCESSING
    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        noiseLevel = avg;
    }

    // GAME LOGIC
    const noiseThreshold = (100 - sensitivity) * 1.5;

    if (noiseLevel < noiseThreshold) {
        // Quiet: Boost
        fuel = Math.min(fuel + 0.1, 100);
        if (Math.random() < 0.05) playSound('boost'); // Random engine pulse
        speed = Math.min(speed + 0.1, 10); // Max speed 10
        createParticle(rocket.x, rocket.y + rocket.height / 2, 'exhaust');
    } else {
        // Loud: Drag & Fuel Loss
        fuel = Math.max(fuel - 0.3, 0);
        speed = Math.max(speed - 0.2, 0);

        // Turbulence shake
        if (noiseLevel > noiseThreshold * 1.5) {
            canvas.style.transform = `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)`;
        } else {
            canvas.style.transform = 'none';
        }
    }

    if (fuel <= 0) {
        // Game Over logic? Or just stop?
        // Let's just stop for now, maybe drift.
        speed = Math.max(speed - 0.1, 0);
        if (speed === 0) {
            // Out of fuel game over
            // endGame(); 
            // Actually, keep it kids friendly - show "OUT OF FUEL" warning but let them quiet down to charge up.
        }
    }

    // Move Background
    bgOffset -= speed;
    if (bgOffset <= -canvas.width) bgOffset = 0;

    // Distance & Score
    distance += speed;
    score = Math.floor(distance / 10);
    uiScore.innerText = score.toString().padStart(6, '0');
    uiFuel.style.width = `${fuel}%`;

    // Low fuel warning color
    if (fuel < 20) uiFuel.style.background = 'red';
    else if (fuel > 50) uiFuel.style.background = 'linear-gradient(90deg, #ff3333, #33ff33)';

    // Spawn Obstacles (Asteroids) - only when loud-ish or random
    if (Math.random() < 0.005 + (speed / 2000)) {
        obstacles.push({
            x: canvas.width,
            y: Math.random() * (canvas.height - 50),
            size: 30 + Math.random() * 30,
            rotation: 0
        });
    }

    // Spawn Planets (Milestones)
    if (distance > (planetsFound + 1) * 5000) {
        planetsFound++;
        planets.push({
            x: canvas.width,
            y: Math.random() * (canvas.height - 200) + 100,
            size: 100
        });
    }

    // Update Projectiles/Obstacles
    obstacles.forEach(o => {
        o.x -= (speed + 2);
        o.rotation += 0.05;
    });
    planets.forEach(p => {
        p.x -= (speed * 0.5); // Parallax effect, distant planets move slower
    });

    // Clean up
    obstacles = obstacles.filter(o => o.x > -100);
    planets = planets.filter(p => p.x > -200);

    // Particles
    particles.forEach(p => {
        p.x -= speed;
        p.x -= p.vx;
        p.y += p.vy;
        p.life -= 0.05;
    });
    particles = particles.filter(p => p.life > 0);

    // Simple physics for rocket (y-axis drift?)
    // Maybe allow mouse/arrow keys to move Y?
    // For now, let's keep it auto-pilot on Y, just varying slightly.
    rocket.y = 300 + Math.sin(Date.now() / 1000) * 20;

    // Collision Check (Simple box)
    obstacles.forEach(o => {
        if (checkCollision(rocket, { x: o.x, y: o.y, width: o.size, height: o.size })) {
            fuel -= 10;
            speed *= 0.5; // Hit slows you down
            playSound('hit');
            canvas.style.transform = `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`; // Hard shake
            createExplosion(o.x, o.y);
            // Remove asteroid
            o.x = -999;
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background (Tiled)
    let ptrn = ctx.createPattern(assets.bg, 'repeat');
    ctx.fillStyle = ptrn;
    ctx.save();
    ctx.translate(bgOffset, 0);
    ctx.fillRect(-bgOffset, 0, canvas.width * 2, canvas.height); // draw wide enough to scroll
    ctx.restore();

    // Planets
    planets.forEach(p => {
        ctx.drawImage(assets.planet, p.x, p.y, p.size, p.size);
    });

    // Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    // Rocket
    if (gameState === 'PLAYING') {
        ctx.drawImage(assets.rocket, rocket.x, rocket.y, rocket.width, rocket.height);

        // Engine glow
        if (speed > 5) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 200, 50, 0.5)';
            ctx.arc(rocket.x, rocket.y + rocket.height / 2, 10 + Math.random() * 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Obstacles
    obstacles.forEach(o => {
        ctx.save();
        ctx.translate(o.x + o.size / 2, o.y + o.size / 2);
        ctx.rotate(o.rotation);
        ctx.drawImage(assets.asteroid, -o.size / 2, -o.size / 2, o.size, o.size);
        ctx.restore();
    });
}

function checkCollision(r, o) {
    return (r.x < o.x + o.width &&
        r.x + r.width > o.x &&
        r.y < o.y + o.height &&
        r.y + r.height > o.y);
}

function createParticle(x, y, type) {
    if (type === 'exhaust') {
        particles.push({
            x: x,
            y: y,
            vx: Math.random() * 5 + 2,
            vy: Math.random() * 2 - 1,
            life: 1.0,
            color: Math.random() > 0.5 ? '#ffff00' : '#ff0000',
            size: Math.random() * 4 + 2
        });
    }
}

function createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x,
            y: y,
            vx: Math.random() * 10 - 5,
            vy: Math.random() * 10 - 5,
            life: 1.0,
            color: '#aaaaaa',
            size: Math.random() * 4 + 2
        });
    }
}

init();
