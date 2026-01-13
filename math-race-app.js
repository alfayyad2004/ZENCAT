/**
 * Antigravity Math Race Logic
 * Teacher controls the flow. Students shout answers.
 */

let difficulty = 'easy'; // easy, medium, hard
let currentQuestion = null;
let posA = 0; // 0 to 100
let posB = 0; // 0 to 100
const WIN_HEIGHT = 85; // Percentage to win

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let ambientOsc;
let ambientGain;

// UI References
const uiQText = document.getElementById('question-text');
const uiOptions = document.getElementById('options-container');
const uiTeamSel = document.getElementById('team-selector');
const btnStart = document.getElementById('start-btn');
const uiSetup = document.getElementById('setup-panel');
const racerA = document.getElementById('racer-left');
const racerB = document.getElementById('racer-right');
const victoryScreen = document.getElementById('victory-screen');
const winnerText = document.getElementById('winner-text');

function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase() === level) btn.classList.add('active');
    });
}

function generateQuestion() {
    let q = "", a = 0;

    // TRINIDAD STANDARD 2 MATH (Approx 8-9 Years)
    // Focus: Numbers to 1000, Add/Sub 3-digits, Mult/Div 2,3,4,5,10

    if (difficulty === 'easy') {
        // Standard 1 Revision: Numbers up to 100
        const isAdd = Math.random() > 0.5;
        if (isAdd) {
            const n1 = Math.floor(Math.random() * 50);
            const n2 = Math.floor(Math.random() * 40);
            q = `${n1} + ${n2}`;
            a = n1 + n2;
        } else {
            const n1 = Math.floor(Math.random() * 50) + 10;
            const n2 = Math.floor(Math.random() * n1);
            q = `${n1} - ${n2}`;
            a = n1 - n2;
        }
    } else if (difficulty === 'medium') {
        // STANDARD 2 CORE
        const type = Math.random();

        if (type < 0.4) {
            // Addition/Subtraction up to 3 digits
            const n1 = Math.floor(Math.random() * 800) + 100;
            const n2 = Math.floor(Math.random() * 100) + 10;
            if (Math.random() > 0.5) {
                q = `${n1} + ${n2}`;
                a = n1 + n2;
            } else {
                q = `${n1} - ${n2}`;
                a = n1 - n2;
            }
        } else if (type < 0.7) {
            // Multiplication Tables: 2, 3, 4, 5, 10
            const tables = [2, 3, 4, 5, 10];
            const t = tables[Math.floor(Math.random() * tables.length)];
            const n = Math.floor(Math.random() * 12) + 1;
            q = `${n} x ${t}`;
            a = n * t;
        } else if (type < 0.85) {
            // Area (Square/Rectangle)
            if (Math.random() > 0.5) {
                const s = Math.floor(Math.random() * 8) + 2;
                q = `Area sq side ${s}`;
                a = s * s;
            } else {
                const l = Math.floor(Math.random() * 8) + 2;
                const w = Math.floor(Math.random() * 5) + 2;
                q = `Area rect ${l}x${w}`;
                a = l * w;
            }
        } else {
            // Perimeter (Square/Rectangle)
            if (Math.random() > 0.5) {
                const s = Math.floor(Math.random() * 10) + 2;
                q = `Perim sq side ${s}`;
                a = 4 * s;
            } else {
                const l = Math.floor(Math.random() * 10) + 2;
                const w = Math.floor(Math.random() * 5) + 2;
                q = `Perim rect ${l}x${w}`;
                a = 2 * (l + w);
            }
        }
    } else {
        // Standard 3 Preview / Hard mode
        const type = Math.random();
        if (type < 0.4) {
            const n1 = Math.floor(Math.random() * 500) + 500;
            const n2 = Math.floor(Math.random() * 500) + 100;
            if (Math.random() > 0.5) {
                q = `${n1} + ${n2}`;
                a = n1 + n2;
            } else {
                q = `${n1} - ${n2}`;
                a = n1 - n2;
            }
        } else if (type < 0.7) {
            const n1 = Math.floor(Math.random() * 12) + 2;
            const n2 = Math.floor(Math.random() * 12) + 2;
            q = `${n1} x ${n2}`;
            a = n1 * n2;
        } else {
            // Harder Area/Perim
            if (Math.random() > 0.5) {
                const l = Math.floor(Math.random() * 12) + 5;
                const w = Math.floor(Math.random() * 8) + 4;
                q = `Area ${l}x${w}`;
                a = l * w;
            } else {
                const l = Math.floor(Math.random() * 20) + 10;
                const w = Math.floor(Math.random() * 10) + 5;
                q = `Perim ${l}x${w}`;
                a = 2 * (l + w);
            }
        }
    }

    // Generate Options
    let opts = [a];
    while (opts.length < 3) {
        let fake;
        const variance = Math.max(2, Math.floor(a * 0.2));
        // Smart distractors: off by 1, off by 10 (place value common error)
        const errType = Math.random();
        if (errType < 0.3) fake = a + 1;
        else if (errType < 0.6) fake = a - 1;
        else if (errType < 0.8) fake = a + 10;
        else fake = a + Math.floor(Math.random() * variance * 2) - variance;

        if (fake < 0) fake = 0;
        if (!opts.includes(fake)) opts.push(fake);
    }

    return { q, a, options: opts };
}

function startRace() {
    posA = 20;
    posB = 20;
    updatePositions();
    btnStart.classList.add('hidden');
    uiSetup.classList.add('hidden'); // Hide difficulty setup

    // Countdown
    let count = 3;
    uiQText.innerText = count;
    playSound('countdown');

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            uiQText.innerText = count;
            playSound('countdown');
        } else {
            clearInterval(interval);
            uiQText.innerText = "GO!";
            playSound('go');
            setTimeout(nextQuestion, 1000);
        }
    }, 1000);
}

function nextQuestion() {
    currentQuestion = generateQuestion();

    // Shuffle options
    const shuffled = [...currentQuestion.options].sort(() => Math.random() - 0.5);

    uiQText.innerText = `${currentQuestion.q} = ?`;

    // Update buttons
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
        btn.innerText = shuffled[i];
        btn.onclick = () => checkAnswer(shuffled[i]);
    });

    uiOptions.classList.remove('hidden');
    uiTeamSel.classList.add('hidden');
}

function checkAnswer(val) {
    if (val === currentQuestion.a) {
        // Correct
        uiOptions.classList.add('hidden');
        uiTeamSel.classList.remove('hidden');
        uiQText.innerText = `CORRECT! (${val})`;
        playSound('correct');
    } else {
        // Wrong
        uiQText.innerText = "TRY AGAIN!";
        playSound('wrong');
    }
}

function awardPoint(team) {
    const boost = 15;
    playSound('boost'); // Simple blip

    if (team === 'A') {
        posA += boost;
    } else {
        posB += boost;
    }

    updatePositions();

    if (posA >= WIN_HEIGHT) endGame('TEAM A (ROCKET)');
    else if (posB >= WIN_HEIGHT) endGame('TEAM B (UFO)');
    else nextQuestion();
}

function updatePositions() {
    racerA.style.bottom = `${posA}%`;
    racerB.style.bottom = `${posB}%`;
}

function endGame(winner) {
    uiTeamSel.classList.add('hidden');
    uiQText.innerText = "FINISH!";
    winnerText.innerText = `${winner} WINS!`;
    victoryScreen.classList.remove('hidden');
    playSound('win');
}

// Sound FX
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'correct') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'countdown') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'go') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'boost') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.2);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'win') {
        osc.type = 'triangle';
        // Fanfare: C E G C
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const t = now + (i * 0.15);
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'triangle';
            o.connect(g);
            g.connect(audioCtx.destination);
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.1, t);
            g.gain.linearRampToValueAtTime(0, t + 0.4);
            o.start(t);
            o.stop(t + 0.4);
        });
    }
}
