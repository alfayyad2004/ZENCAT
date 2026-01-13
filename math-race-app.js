/**
 * Antigravity Math Race Logic
 * Teacher controls the flow. Students shout answers.
 */

const questions = [
    { q: "5 + 7", a: 12, options: [12, 11, 15] },
    { q: "9 - 4", a: 5, options: [5, 4, 6] },
    { q: "3 x 3", a: 9, options: [6, 9, 12] },
    { q: "Double 8", a: 16, options: [16, 18, 14] },
    { q: "10 + 10", a: 20, options: [10, 20, 30] },
    { q: "15 - 5", a: 10, options: [5, 10, 15] },
    { q: "6 + 6", a: 12, options: [10, 12, 14] },
    { q: "Half of 20", a: 10, options: [5, 10, 2] }
];

let currentQuestion = null;
let posA = 0; // 0 to 100
let posB = 0; // 0 to 100
const WIN_HEIGHT = 85; // Percentage to win

const uiQText = document.getElementById('question-text');
const uiOptions = document.getElementById('options-container');
const uiTeamSel = document.getElementById('team-selector');
const btnStart = document.getElementById('start-btn');
const racerA = document.getElementById('racer-left');
const racerB = document.getElementById('racer-right');
const victoryScreen = document.getElementById('victory-screen');
const winnerText = document.getElementById('winner-text');

function startRace() {
    posA = 20; // Start at 20px bottom
    posB = 20;
    updatePositions();
    btnStart.classList.add('hidden');
    nextQuestion();
}

function nextQuestion() {
    // Pick random question
    const q = questions[Math.floor(Math.random() * questions.length)];
    currentQuestion = q;

    // Shuffle options
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);

    uiQText.innerText = `${q.q} = ?`;

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
        // Correct! But who said it?
        uiOptions.classList.add('hidden');
        uiTeamSel.classList.remove('hidden');
        uiQText.innerText = `CORRECT! (${val})`;
    } else {
        // Wrong
        uiQText.innerText = "TRY AGAIN!";
        // Shake animation maybe?
    }
}

function awardPoint(team) {
    const boost = 15; // Percent up

    if (team === 'A') {
        posA += boost;
    } else {
        posB += boost;
    }

    updatePositions();

    // Check win
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

    // Confetti logic here if desired
}
