/**
 * Zen Ginger Cat - Noise Management Tool (Classic)
 */

class ZenGingerCat {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;

        this.isRunning = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.noiseThreshold = 50;

        this.timerInterval = null;
        this.animationId = null;

        this.milestones = [
            { time: 60, reached: false, id: 'pillow' },
            { time: 300, reached: false, id: 'sunbeam' },
            { time: 600, reached: false, id: 'yarn' },
            { time: 1200, reached: false, id: 'aura' }
        ];

        this.elements = {
            timer: document.getElementById('timer'),
            sensitivity: document.getElementById('sensitivity'),
            progressFill: document.getElementById('progress-fill'),
            infoMessage: document.getElementById('info-message'),
            catContainer: document.getElementById('cat-svg-container'),
            sunbeam: document.getElementById('sunbeam'),
            pillow: document.getElementById('pillow'),
            yarn: document.getElementById('yarn')
        };

        this.gifs = {
            sleeping: "./cats-sleeping.gif",
            alert: "./cat-really.gif",
            angry: "./angry cat.gif"
        };

        this.currentState = 'sleeping';
        this.isDisturbed = false;
        this.disturbedTimeout = null;
        this.lastNoiseLevel = 0;

        this.init();
    }

    init() {
        this.renderCharacter();
        this.setupEventListeners();
        this.updateSensitivity();
    }

    renderCharacter() {
        const catHtml = `
            <div class="cat-wrapper" id="cat-wrapper">
                <img id="cat-character" src="${this.gifs.sleeping}" alt="Sleeping Fat Cat" class="breathing">
                <div id="aura-overlay" class="aura-glow"></div>
            </div>
        `;
        this.elements.catContainer.innerHTML = catHtml;
    }

    setupEventListeners() {
        this.elements.sensitivity.addEventListener('input', () => this.updateSensitivity());

        document.body.addEventListener('click', () => {
            if (!this.isRunning) {
                this.startSession();
            }
        });
    }

    updateSensitivity() {
        const val = parseInt(this.elements.sensitivity.value);
        this.noiseThreshold = (100 - val) / 100 * 255;
    }

    async startSession() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);

            this.analyser.fftSize = 256;
            this.microphone.connect(this.analyser);

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            this.isRunning = true;
            this.startTime = Date.now();
            this.elements.infoMessage.textContent = "Shh... the fat cat is dreaming.";

            this.startTimer();
            this.monitorNoise();
        } catch (err) {
            console.error("Microphone access denied:", err);
            this.elements.infoMessage.textContent = "Please enable microphone access to start.";
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateTimerDisplay();
            this.checkMilestones();
            this.updateProgressBar();
        }, 1000);
    }

    updateTimerDisplay() {
        const h = Math.floor(this.elapsedTime / 3600).toString().padStart(2, '0');
        const m = Math.floor((this.elapsedTime % 3600) / 60).toString().padStart(2, '0');
        const s = (this.elapsedTime % 60).toString().padStart(2, '0');
        this.elements.timer.textContent = `${h}:${m}:${s}`;
    }

    monitorNoise() {
        if (!this.isRunning) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        let average = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            average += this.dataArray[i];
        }
        average /= this.dataArray.length;
        this.lastNoiseLevel = average;

        if (average > this.noiseThreshold) {
            this.handleNoiseInterruption(average);
        } else {
            if (!this.isDisturbed) {
                this.updateCatState('sleeping');
            }
        }

        this.animationId = requestAnimationFrame(() => this.monitorNoise());
    }

    handleNoiseInterruption(level) {
        // Escalation: High noise triggers "angry" immediately, moderate noise triggers "alert/really"
        const isSevere = level > (this.noiseThreshold * 1.5);

        if (isSevere) {
            this.triggerStateUpdate('angry', "NOW YOU'VE DONE IT! HE'S ANGRY!");
        } else {
            this.triggerStateUpdate('alert', "Really? Do you have to be so loud?");
        }

        this.resetTimer();
    }

    triggerStateUpdate(state, message) {
        if (this.currentState === state && this.isDisturbed) return;

        this.isDisturbed = true;
        this.currentState = state;
        this.updateCatState(state);
        this.elements.infoMessage.textContent = message;

        if (this.disturbedTimeout) clearTimeout(this.disturbedTimeout);

        const duration = state === 'angry' ? 6000 : 4000;

        this.disturbedTimeout = setTimeout(() => {
            this.isDisturbed = false;
            this.currentState = 'sleeping';
            this.updateCatState('sleeping');
            this.elements.infoMessage.textContent = "Shh... the fat cat is dreaming.";
        }, duration);
    }

    resetTimer() {
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.updateTimerDisplay();
        this.updateProgressBar();
    }

    updateProgressBar() {
        const maxTime = 1200; // 20 mins
        const percentage = Math.min((this.elapsedTime / maxTime) * 100, 100);
        this.elements.progressFill.style.width = `${percentage}%`;
    }

    checkMilestones() {
        this.milestones.forEach(m => {
            if (this.elapsedTime >= m.time && !m.reached) {
                m.reached = true;
                this.triggerMilestone(m.id);
            }
        });
    }

    triggerMilestone(id) {
        console.log(`Milestone reached: ${id}`);
        const marker = Array.from(document.querySelectorAll('.marker')).find(m => {
            const milestone = this.milestones.find(ms => ms.id === id);
            return m.dataset.time == (milestone ? milestone.time : null);
        });
        if (marker) marker.classList.add('reached');

        this.triggerConfetti();
        this.playSound('milestone');

        if (id === 'pillow') {
            this.elements.pillow.classList.remove('hidden');
            this.elements.pillow.classList.add('visible');
        } else if (id === 'sunbeam') {
            document.getElementById('sunbeam').style.opacity = '1';
            this.createParticles(30, 'light');
        } else if (id === 'yarn') {
            this.elements.yarn.classList.remove('hidden');
            this.elements.yarn.classList.add('visible');
        } else if (id === 'aura') {
            const aura = document.getElementById('aura-overlay');
            if (aura) aura.style.opacity = '1';
            this.elements.catContainer.classList.add('zen-master');
            this.createParticles(50, 'gold');
            this.playSound('purr'); // Zen master purr
        }
    }

    triggerConfetti() {
        const container = document.getElementById('particles');
        const colors = ['#FFD700', '#FF69B4', '#00CED1', '#ADFF2F', '#FF4500'];

        for (let i = 0; i < 50; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            c.style.left = `${Math.random() * 100}%`;
            c.style.top = `-20px`;
            c.style.setProperty('--duration', `${Math.random() * 2 + 1}s`);
            c.style.setProperty('--drift', `${Math.random() * 200 - 100}px`);
            c.style.setProperty('--rotation', `${Math.random() * 360}deg`);
            container.appendChild(c);

            setTimeout(() => {
                if (c.parentNode) c.parentNode.removeChild(c);
            }, 3000);
        }
    }

    playSound(type) {
        if (!this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        if (type === 'milestone') {
            // Happy chime
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3); // C6
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'purr') {
            // Low frequency vibration-like sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, now);
            // Modulation to simulate purring
            const mod = this.audioContext.createOscillator();
            const modGain = this.audioContext.createGain();
            mod.frequency.value = 4; // 4Hz heartbeat/purr frequency
            modGain.gain.value = 20;
            mod.connect(modGain);
            modGain.connect(osc.frequency);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 1);
            gain.gain.linearRampToValueAtTime(0, now + 4);

            mod.start(now);
            osc.start(now);
            mod.stop(now + 4);
            osc.stop(now + 4);
        } else if (type === 'start') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now); // A4
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    }

    createParticles(count = 20, type = 'default') {
        const container = document.getElementById('particles');
        const colors = type === 'gold' ? ['#ffd700', '#ffec8b', '#ffffff'] : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)'];

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const size = Math.random() * 4 + 2;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

            if (type === 'gold') {
                p.style.boxShadow = `0 0 ${size * 2}px ${p.style.backgroundColor}`;
            }

            p.style.left = `${Math.random() * 100}%`;
            p.style.setProperty('--duration', `${Math.random() * 4 + 4}s`);
            p.style.setProperty('--drift', `${Math.random() * 100 - 50}px`);
            p.style.animationDelay = `${Math.random() * 2}s`;
            container.appendChild(p);

            setTimeout(() => {
                if (p.parentNode) p.parentNode.removeChild(p);
            }, 8000);
        }
    }

    updateCatState(state) {
        const catImg = document.getElementById('cat-character');
        const catWrapper = document.getElementById('cat-wrapper');
        if (!catImg || !catWrapper) return;

        if (state === 'sleeping' && !this.isDisturbed) {
            if (!catImg.src.includes('cats-sleeping')) {
                catImg.src = this.gifs.sleeping;
            }
            catImg.classList.add('breathing');
            catWrapper.style.transform = 'none';
            catImg.style.filter = 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))';
        } else if (state === 'alert') {
            if (!catImg.src.includes('really')) {
                catImg.src = this.gifs.alert;
            }
            catImg.classList.remove('breathing');
            catWrapper.style.transform = `scale(1.05) rotate(${Math.random() * 4 - 2}deg)`;
            catImg.style.filter = 'drop-shadow(0 10px 30px rgba(255, 100, 100, 0.4)) contrast(1.1)';
        } else if (state === 'angry') {
            if (!catImg.src.includes('angry')) {
                catImg.src = this.gifs.angry;
            }
            catImg.classList.remove('breathing');
            // Violent shake for angry state
            const shakeX = Math.random() * 20 - 10;
            const shakeY = Math.random() * 10 - 5;
            catWrapper.style.transform = `scale(1.2) translate(${shakeX}px, ${shakeY}px) rotate(${Math.random() * 10 - 5}deg)`;
            catImg.style.filter = 'drop-shadow(0 0 40px rgba(255, 0, 0, 0.6)) contrast(1.3) saturate(1.5)';

            // Background red flash
            document.body.style.backgroundColor = 'rgba(255,0,0,0.05)';
            setTimeout(() => document.body.style.backgroundColor = '', 200);
        }
    }
}

// Initialize
window.addEventListener('load', () => {
    new ZenGingerCat();
});
