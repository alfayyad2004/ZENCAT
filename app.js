/**
 * Zen Guardians - Classroom Noise Management
 * Core Logic: Audio Analysis, Multi-Character System, Economy
 */

class ZenGuardians {
    constructor() {
        // App State
        this.characters = [{
            id: 'cat',
            name: 'Ginger',
            cost: 0,
            unlocked: true,
            theme: 'theme-cat',
            assets: {
                sleep: 'cat-sleeping.png',
                alert: 'cat-alert.png',
                angry: 'cat-angry.png',
                bg: 'bg-livingroom.png'
            }
        },
        {
            id: 'owl',
            name: 'Prof. Hoot',
            cost: 50,
            unlocked: false,
            theme: 'theme-owl',
            assets: {
                sleep: 'owl-sleeping.png',
                alert: 'owl-alert.png',
                angry: 'owl-angry.png',
                bg: 'bg-forest.png'
            }
        },
        {
            id: 'dragon',
            name: 'Sparky',
            cost: 150,
            unlocked: false,
            theme: 'theme-dragon',
            assets: {
                sleep: 'dragon-sleeping.png',
                alert: 'dragon-alert.png',
                angry: 'dragon-angry.png',
                bg: 'bg-cave.png'
            }
        }
        ];

        this.activeCharId = 'cat';
        this.stars = 0;
        this.isRunning = false;
        this.startTime = 0;
        this.elapsedTime = 0; // Current session duration
        this.quietTime = 0; // Continuous quiet time for earning stars

        // Audio
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.noiseThreshold = 50;
        this.lastNoiseLevel = 0;
        this.state = 'sleep'; // sleep, alert, angry
        this.disturbedTimeout = null;

        // Elements
        this.el = {
            timer: document.getElementById('timer'),
            sensitivity: document.getElementById('sensitivity'),
            progressFill: document.getElementById('progress-fill'),
            infoMessage: document.getElementById('info-message'),
            catContainer: document.getElementById('cat-svg-container'),
            starCount: document.getElementById('star-count'),
            characterSelectBtn: document.getElementById('character-select-btn'),
            modal: document.getElementById('character-modal'),
            characterGrid: document.getElementById('character-grid'),
            closeModal: document.querySelector('.close-modal'),
            noiseBarFill: document.getElementById('noise-bar-fill'),
            background: document.querySelector('.background-scene')
        };

        this.init();
    }

    init() {
        console.log("Initializing ZenGuardians...");
        this.loadData();
        this.setupEventListeners();

        if (!this.el.catContainer) {
            console.error("FATAL: .character-container or #cat-svg-container not found!");
            alert("Error: Character Container missing from page.");
        }

        this.renderCharacter();
        this.updateStarDisplay();
        this.updateTheme();
        this.renderCharacterGrid();

        // Initial background
        const char = this.getCharacter(this.activeCharId);
        if (char && char.assets.bg) {
            this.el.background.style.backgroundImage = `url('${char.assets.bg}')`;
            this.el.background.classList.add('dynamic-bg');
        }
    }

    getCharacter(id) {
        return this.characters.find(c => c.id === id);
    }

    setupEventListeners() {
        if (this.el.sensitivity) {
            this.el.sensitivity.addEventListener('input', () => {
                const val = parseInt(this.el.sensitivity.value);
                this.noiseThreshold = (100 - val) / 100 * 255;
            });
        }

        // Start Audio on click
        document.body.addEventListener('click', () => {
            if (!this.isRunning) this.startSession();
        }, {
            once: true
        });

        // Modal
        if (this.el.characterSelectBtn) {
            this.el.characterSelectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openModal();
            });
        }

        if (this.el.closeModal) {
            this.el.closeModal.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeModal();
            });
        }
    }

    async startSession() {
        try {
            console.log("Requesting Mic...");
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser.fftSize = 256;
            this.microphone.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            this.isRunning = true;
            this.startTime = Date.now();
            this.el.infoMessage.textContent = "Keep it quiet to earn stars!";
            console.log("Audio Started.");

            this.startLoop();
        } catch (err) {
            console.error("Mic denied:", err);
            this.el.infoMessage.textContent = "Microphone access is needed to play.";
        }
    }

    startLoop() {
        const loop = () => {
            if (!this.isRunning) return;

            this.updateTimer();
            this.monitorNoise();
            this.handleEconomy();

            requestAnimationFrame(loop);
        };
        loop();
    }

    updateTimer() {
        if (!this.el.timer) return;
        const now = Date.now();
        const diff = Math.floor((now - this.startTime) / 1000);
        this.elapsedTime = diff;

        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        this.el.timer.textContent = `${h}:${m}:${s}`;
    }

    monitorNoise() {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
        const average = sum / this.dataArray.length;

        // Visual Noise Bar
        const percentage = Math.min((average / 255) * 100 * 3, 100); // Amplify for visibility
        if (this.el.noiseBarFill) this.el.noiseBarFill.style.width = `${percentage}%`;

        // Logic
        if (average > this.noiseThreshold * 1.5) {
            this.triggerState('angry');
            this.quietTime = 0; // Reset quiet streak
        } else if (average > this.noiseThreshold) {
            this.triggerState('alert');
            this.quietTime = 0;
        } else {
            if (this.state !== 'sleep' && !this.disturbedTimeout) {
                this.triggerState('sleep');
            }
        }
    }

    triggerState(newState) {
        if (this.state === newState) return;

        // If currently angry/alert, don't go back to sleep immediately unless timeout done
        if ((this.state === 'angry' || this.state === 'alert') && newState === 'sleep') {
            if (!this.disturbedTimeout) {
                this.disturbedTimeout = setTimeout(() => {
                    this.state = 'sleep';
                    this.renderCharacter();
                    this.disturbedTimeout = null;
                }, 3000); // Stay alert/angry for 3s
            }
            return;
        }

        // Interrupt timeout if getting angrier
        if (this.disturbedTimeout && (newState === 'angry' || newState === 'alert')) {
            clearTimeout(this.disturbedTimeout);
            this.disturbedTimeout = null;
        }

        this.state = newState;
        this.renderCharacter();

        if (newState === 'angry') {
            this.el.infoMessage.innerHTML = "<span style='color: #ff4d4d'>TOO LOUD!</span>";
        } else if (newState === 'alert') {
            this.el.infoMessage.textContent = "Shh...";
        } else {
            this.el.infoMessage.textContent = "Earning stars...";
        }
    }

    handleEconomy() {
        if (this.state === 'sleep') {
            this.quietTime++;
            // Earn a star every 600 frames (~10 seconds at 60fps)
            if (this.quietTime % 600 === 0) {
                this.addStar();
            }
        }
    }

    addStar() {
        this.stars++;
        this.saveData();
        this.updateStarDisplay();

        // Floating +1 animation
        const float = document.createElement('div');
        float.textContent = "+1 ★";
        float.style.position = 'absolute';
        float.style.color = '#ffd700';
        float.style.fontSize = '2rem';
        float.style.fontWeight = 'bold';
        float.style.left = '50%';
        float.style.top = '20%';
        float.style.zIndex = '200';
        float.style.textShadow = '0 0 5px black';
        float.style.animation = 'float-up 1s ease-out forwards';
        document.body.appendChild(float);
        setTimeout(() => float.remove(), 1000);
    }

    renderCharacter() {
        console.log(`Rendering Character: ID=${this.activeCharId}, State=${this.state}`);
        const char = this.getCharacter(this.activeCharId);
        if (!char) {
            console.error("Character not found!", this.activeCharId);
            return;
        }
        const asset = char.assets[this.state];
        console.log("Using asset:", asset);

        const html = `
            <div class="cat-wrapper" id="cat-wrapper" style="display:flex; justify-content:center; align-items:center;">
                <img id="cat-character" src="${asset}" alt="${char.name} ${this.state}" class="${this.state === 'sleep' ? 'breathing' : ''}" onerror="console.error('Failed to load image:', this.src)">
            </div>
        `;

        if (this.el.catContainer) {
            this.el.catContainer.innerHTML = html;
        } else {
            console.error("Cat Container is null in renderCharacter");
        }

        // Apply shaking effect if angry
        const img = document.getElementById('cat-character');
        if (img && this.state === 'angry') {
            img.style.animation = 'shake 0.5s infinite';
        }
    }

    updateTheme() {
        const char = this.getCharacter(this.activeCharId);
        if (char) {
            document.body.className = char.theme;
            this.el.background.style.backgroundImage = `url('${char.assets.bg}')`;
        }
    }

    // --- Modal & Grid ---

    renderCharacterGrid() {
        if (!this.el.characterGrid) return;
        this.el.characterGrid.innerHTML = '';
        this.characters.forEach(c => {
            const card = document.createElement('div');
            card.className = `char-card ${c.id === this.activeCharId ? 'active' : ''} ${!c.unlocked ? 'locked' : ''}`;
            card.onclick = () => this.selectCharacter(c.id);

            card.innerHTML = `
                <img src="${c.assets.sleep}" class="char-img">
                <div class="char-info">
                    <h3>${c.name}</h3>
                    ${!c.unlocked ? `<div class="char-cost">⭐ ${c.cost}</div>` : '<div class="char-cost">Owned</div>'}
                </div>
                <div class="lock-icon">🔒</div>
            `;
            this.el.characterGrid.appendChild(card);
        });
    }

    selectCharacter(id) {
        const char = this.getCharacter(id);

        if (!char.unlocked) {
            if (this.stars >= char.cost) {
                if (confirm(`Unlock ${char.name} for ${char.cost} stars?`)) {
                    this.stars -= char.cost;
                    char.unlocked = true;
                    this.saveData();
                    this.updateStarDisplay();
                    this.renderCharacterGrid();
                }
            } else {
                alert(`You need ${char.cost} stars to unlock ${char.name}!`);
            }
            return;
        }

        this.activeCharId = id;
        this.saveData();
        this.updateTheme();
        this.renderCharacter();
        this.renderCharacterGrid();
        this.closeModal();
    }

    openModal() {
        if (this.el.modal) {
            this.el.modal.classList.remove('hidden');
            this.renderCharacterGrid();
        }
    }

    closeModal() {
        if (this.el.modal) this.el.modal.classList.add('hidden');
    }

    updateStarDisplay() {
        if (this.el.starCount) this.el.starCount.textContent = this.stars;
    }

    // --- Persistence ---

    saveData() {
        const data = {
            stars: this.stars,
            unlocked: this.characters.filter(c => c.unlocked).map(c => c.id),
            activeCharId: this.activeCharId
        };
        localStorage.setItem('zenGuardiansData', JSON.stringify(data));
    }

    loadData() {
        const json = localStorage.getItem('zenGuardiansData');
        if (json) {
            try {
                const data = JSON.parse(json);
                this.stars = data.stars || 0;

                // Validate activeCharId
                if (data.activeCharId && this.getCharacter(data.activeCharId)) {
                    this.activeCharId = data.activeCharId;
                } else {
                    console.warn("Invalid activeCharId in save, resetting to cat");
                    this.activeCharId = 'cat';
                }

                if (data.unlocked) {
                    data.unlocked.forEach(id => {
                        const char = this.getCharacter(id);
                        if (char) char.unlocked = true;
                    });
                }
            } catch (e) {
                console.error("Corrupt save data", e);
                this.activeCharId = 'cat';
            }
        }
    }
}

// Global Init
window.addEventListener('load', () => {
    // Add Shake Animation Style dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes shake {
            0% { transform: translate(1px, 1px) rotate(0deg); }
            10% { transform: translate(-1px, -2px) rotate(-1deg); }
            20% { transform: translate(-3px, 0px) rotate(1deg); }
            30% { transform: translate(3px, 2px) rotate(0deg); }
            40% { transform: translate(1px, -1px) rotate(1deg); }
            50% { transform: translate(-1px, 2px) rotate(-1deg); }
            60% { transform: translate(-3px, 1px) rotate(0deg); }
            70% { transform: translate(3px, 1px) rotate(-1deg); }
            80% { transform: translate(-1px, -1px) rotate(1deg); }
            90% { transform: translate(1px, 2px) rotate(0deg); }
            100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
    `;
    document.head.appendChild(style);

    new ZenGuardians();
});
