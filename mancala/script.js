// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen')
};

const setupBtn = document.getElementById('start-btn');
const p1Input = document.getElementById('player1');
const p2Input = document.getElementById('player2');
const gameModeSelect = document.getElementById('game-mode');

const turnIndicator = document.getElementById('turn-indicator');
const p1TurnBadge = document.getElementById('p1-turn-badge');
const p2TurnBadge = document.getElementById('p2-turn-badge');
const p1NameDisplay = document.getElementById('p1-name-display');
const p2NameDisplay = document.getElementById('p2-name-display');
const statusMsg = document.getElementById('status-msg');
const timerToggle = document.getElementById('timer-toggle');
const timerSettings = document.getElementById('timer-settings');
const timerSecondsInput = document.getElementById('timer-seconds');
const timerDisplay = document.getElementById('timer-display');
const timeLeftSpan = document.getElementById('time-left');

const undoBtn = document.getElementById('in-game-undo-btn');
const inGameRestartBtn = document.getElementById('in-game-restart-btn');
const inGameQuitBtn = document.getElementById('in-game-quit-btn');

const modal = document.getElementById('game-over-modal');
const winnerText = document.getElementById('winner-text');
const p1ScoreText = document.getElementById('p1-final-score');
const p2ScoreText = document.getElementById('p2-final-score');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');

// Game State
let state = {
    p1Name: 'Player 1',
    p2Name: 'AI (CPU)',
    board: Array(14).fill(0),
    currentPlayer: 1,
    isGameOver: false,
    isAnimating: false,
    useTimer: false,
    timerSeconds: 15,
    timerInterval: null,
    timeRemaining: 0,
    lastPlayedIndex: -1,
    gameMode: 'pva' // 'pvp' or 'pva'
};

let previousState = null;

// Colors for stones (glowing jewels aspect)
const stoneColors = [
    'linear-gradient(135deg, #F4D03F, #FAD7A1)', // Soft Yellow
    'linear-gradient(135deg, #85C1E9, #D6EAF8)', // Soft Blue
    'linear-gradient(135deg, #F1948A, #FADBD8)', // Soft Red/Pink
    'linear-gradient(135deg, #82E0AA, #D5F5E3)', // Soft Green
    'linear-gradient(135deg, #C39BD3, #EBDEF0)'  // Soft Purple
];

function init() {
    timerToggle.addEventListener('change', (e) => {
        if (e.target.checked) timerSettings.classList.remove('hidden');
        else timerSettings.classList.add('hidden');
    });

    setupBtn.addEventListener('click', startGame);
    
    if (undoBtn) undoBtn.addEventListener('click', handleUndo);
    if (inGameRestartBtn) inGameRestartBtn.addEventListener('click', resetGame);
    if (inGameQuitBtn) inGameQuitBtn.addEventListener('click', () => {
        stopTimer();
        showScreen('setup');
    });
    
    restartBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        resetGame();
    });
    menuBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        showScreen('setup');
    });

    // Attach click listeners to pits
    for(let i=0; i<14; i++) {
        if(i === 6 || i === 13) continue; // Skip stores
        const pit = document.getElementById(`pit-${i}`);
        pit.addEventListener('click', () => handlePitClick(i));
    }
}

function showScreen(screenId) {
    Object.values(screens).forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    
    screens[screenId].classList.remove('hidden');
    void screens[screenId].offsetWidth;
    screens[screenId].classList.add('active');
}

function startGame() {
    state.gameMode = gameModeSelect.value;
    state.p1Name = p1Input.value.trim() || 'Player 1';
    state.p2Name = state.gameMode === 'pva' ? 'AI (CPU)' : (p2Input.value.trim() || 'Player 2');
    
    p1NameDisplay.textContent = state.p1Name;
    p2NameDisplay.textContent = state.p2Name;
    
    const p1StoreName = document.getElementById('p1-store-name');
    const p2StoreName = document.getElementById('p2-store-name');
    if (p1StoreName) p1StoreName.textContent = state.p1Name;
    if (p2StoreName) p2StoreName.textContent = state.p2Name;
    
    state.useTimer = timerToggle.checked;
    state.timerSeconds = parseInt(timerSecondsInput.value) || 15;
    
    if (state.useTimer) timerDisplay.classList.remove('hidden');
    else timerDisplay.classList.add('hidden');
    
    showScreen('game');
    resetGame();
}

function startTimer() {
    stopTimer();
    if (!state.useTimer || state.isGameOver || (state.gameMode === 'pva' && state.currentPlayer === 2)) return;
    
    state.timeRemaining = state.timerSeconds;
    timeLeftSpan.textContent = state.timeRemaining;
    
    state.timerInterval = setInterval(() => {
        if (state.isAnimating) return; 
        state.timeRemaining--;
        timeLeftSpan.textContent = state.timeRemaining;
        
        if (state.timeRemaining <= 0) {
            stopTimer();
            state.isGameOver = true;
            const loser = state.currentPlayer === 1 ? state.p1Name : state.p2Name;
            const winner = state.currentPlayer === 1 ? state.p2Name : state.p1Name;
            
            winnerText.textContent = `${winner} Wins on Time!`;
            winnerText.style.color = state.currentPlayer === 1 ? 'var(--p2-color)' : 'var(--p1-color)';
            p1ScoreText.textContent = `${loser} ran out of time.`;
            p2ScoreText.textContent = "";
            modal.classList.remove('hidden');
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function resetGame() {
    for(let i=0; i<14; i++) {
        state.board[i] = (i === 6 || i === 13) ? 0 : 4;
    }
    
    state.currentPlayer = 1;
    state.isGameOver = false;
    state.isAnimating = false;
    state.lastPlayedIndex = -1;
    
    previousState = null;
    if (undoBtn) undoBtn.disabled = true;
    
    document.querySelectorAll('.receiving').forEach(el => el.classList.remove('receiving'));
    document.querySelectorAll('.last-played').forEach(el => el.classList.remove('last-played'));
    
    stopTimer();
    updateUI();
    setStatus("Your Turn. Select a pit to start sowing.");
}

function handleUndo() {
    if (!previousState || state.isAnimating) return;
    
    state.board = [...previousState.board];
    state.currentPlayer = previousState.currentPlayer;
    state.lastPlayedIndex = previousState.lastPlayedIndex;
    
    previousState = null;
    undoBtn.disabled = true;
    state.isGameOver = false;
    
    updateUI();
    setStatus("Move undone. Please play again.");
}

function renderStones(pitElement, count) {
    const container = pitElement.querySelector('.stone-container');
    const counter = pitElement.querySelector('.stone-count');
    counter.textContent = count;
    
    const currentStones = container.children.length;
    if (count > currentStones) {
        for(let i = 0; i < (count - currentStones); i++) {
            const stone = document.createElement('div');
            stone.className = 'stone dropped';
            stone.style.background = stoneColors[Math.floor(Math.random() * stoneColors.length)];
            stone.style.transform = `rotate(${Math.random() * 360}deg)`;
            container.appendChild(stone);
        }
    } else if (count < currentStones) {
        for(let i = 0; i < (currentStones - count); i++) {
            if(container.lastChild) container.removeChild(container.lastChild);
        }
    }
}

function updateUI() {
    for(let i=0; i<14; i++) {
        const pitEl = document.getElementById(`pit-${i}`);
        renderStones(pitEl, state.board[i]);
        
        if (i !== 6 && i !== 13 && !state.isGameOver) {
            const isP1Turn = state.currentPlayer === 1;
            const isP1Pit = i >= 0 && i <= 5;
            const isP2Pit = i >= 7 && i <= 12;
            
            if ((isP1Turn && isP1Pit) || (!isP1Turn && isP2Pit)) {
                if (state.board[i] > 0) {
                    pitEl.classList.add('valid');
                    pitEl.classList.remove('invalid');
                } else {
                    pitEl.classList.remove('valid');
                    pitEl.classList.add('invalid');
                }
            } else {
                pitEl.classList.remove('valid');
                pitEl.classList.add('invalid');
            }
            
            if (i === state.lastPlayedIndex) pitEl.classList.add('last-played');
            else pitEl.classList.remove('last-played');
        }
    }
    
    const p1Row = document.querySelector('.p1-row');
    const p2Row = document.querySelector('.p2-row');
    
    if (state.currentPlayer === 1) {
        turnIndicator.textContent = `${state.p1Name}'s Turn`;
        turnIndicator.style.color = 'var(--p1-color)';
        p1TurnBadge.classList.remove('inactive-turn');
        p2TurnBadge.classList.add('inactive-turn');
        if (p1Row) p1Row.classList.remove('inactive-side');
        if (p2Row) p2Row.classList.add('inactive-side');
    } else {
        turnIndicator.textContent = `${state.p2Name}'s Turn`;
        turnIndicator.style.color = 'var(--p2-color)';
        p2TurnBadge.classList.remove('inactive-turn');
        p1TurnBadge.classList.add('inactive-turn');
        if (p2Row) p2Row.classList.remove('inactive-side');
        if (p1Row) p1Row.classList.add('inactive-side');

        // Check for AI Turn
        if (state.gameMode === 'pva' && !state.isAnimating && !state.isGameOver) {
            setTimeout(aiMove, 1000);
        }
    }
    
    if (state.useTimer && !state.isAnimating && !state.isGameOver && (state.gameMode !== 'pva' || state.currentPlayer === 1)) {
        startTimer();
    }
}

function setStatus(msg) {
    statusMsg.textContent = msg;
}

async function handlePitClick(index) {
    if (state.isGameOver || state.isAnimating) return;
    if (state.gameMode === 'pva' && state.currentPlayer === 2) return;
    
    const isP1 = state.currentPlayer === 1;
    if (isP1 && (index < 0 || index > 5)) return;
    if (!isP1 && (index < 7 || index > 12)) return;
    
    if (state.board[index] === 0) return;
    
    executeMove(index);
}

async function executeMove(index) {
    const isP1 = state.currentPlayer === 1;
    let stones = state.board[index];
    
    previousState = {
        board: [...state.board],
        currentPlayer: state.currentPlayer,
        lastPlayedIndex: state.lastPlayedIndex
    };
    if (undoBtn) undoBtn.disabled = true;
    
    state.isAnimating = true;
    state.lastPlayedIndex = index;
    state.board[index] = 0;
    updateUI();
    setStatus("Sowing...");
    
    let currentIndex = index;
    let previousIndex = index;
    
    const sowNext = () => {
        return new Promise(resolve => {
            if (stones <= 0) {
                document.querySelectorAll('.receiving').forEach(el => el.classList.remove('receiving'));
                resolve();
                return;
            }
            
            currentIndex = (currentIndex + 1) % 14;
            if (isP1 && currentIndex === 13) currentIndex = 0;
            if (!isP1 && currentIndex === 6) currentIndex = 7;
            
            const originEl = document.getElementById(`pit-${previousIndex}`);
            const destEl = document.getElementById(`pit-${currentIndex}`);
            const originRect = originEl.getBoundingClientRect();
            const destRect = destEl.getBoundingClientRect();
            
            const flyingStone = document.createElement('div');
            flyingStone.className = 'stone flying-stone';
            flyingStone.style.background = stoneColors[Math.floor(Math.random() * stoneColors.length)];
            flyingStone.style.left = `${originRect.left + originRect.width/2 - 7}px`;
            flyingStone.style.top = `${originRect.top + originRect.height/2 - 7}px`;
            document.body.appendChild(flyingStone);
            
            document.querySelectorAll('.receiving').forEach(el => el.classList.remove('receiving'));
            destEl.classList.add('receiving');
            
            void flyingStone.offsetWidth; 
            flyingStone.style.left = `${destRect.left + destRect.width/2 - 7}px`;
            flyingStone.style.top = `${destRect.top + destRect.height/2 - 7}px`;
            
            setTimeout(() => {
                flyingStone.remove();
                state.board[currentIndex]++;
                stones--;
                updateUI();
                previousIndex = currentIndex;
                setTimeout(() => sowNext().then(resolve), 40); 
            }, 250); // Faster transit for performance
        });
    };
    
    await sowNext();
    
    let finalIndex = currentIndex;
    const storeIndex = isP1 ? 6 : 13;
    
    if (finalIndex === storeIndex) {
        setStatus(`Extra turn!`);
        state.isAnimating = false;
        if (undoBtn && previousState) undoBtn.disabled = false;
        if (!checkGameOver()) {
            updateUI();
            if (state.gameMode === 'pva' && state.currentPlayer === 2) {
                setTimeout(aiMove, 600);
            }
        }
        return; 
    }
    
    const isOwnSide = isP1 ? (finalIndex >= 0 && finalIndex <= 5) : (finalIndex >= 7 && finalIndex <= 12);
    if (isOwnSide && state.board[finalIndex] === 1) {
        const oppositeIndex = 12 - finalIndex;
        const oppositeStones = state.board[oppositeIndex];
        if (oppositeStones > 0) {
            setStatus("Capture!");
            await new Promise(r => setTimeout(r, 400));
            state.board[storeIndex] += (1 + oppositeStones);
            state.board[finalIndex] = 0;
            state.board[oppositeIndex] = 0;
            updateUI();
        }
    }
    
    if (!checkGameOver()) {
        state.currentPlayer = isP1 ? 2 : 1;
        state.isAnimating = false;
        if (undoBtn && previousState) undoBtn.disabled = false;
        updateUI();
    } else {
        state.isAnimating = false;
    }
}

function aiMove() {
    if (state.isGameOver || !state.isAnimating === false && state.currentPlayer === 1) return;
    
    // AI: Simple Minimax-like logic
    const AI_PITS = [7, 8, 9, 10, 11, 12];
    const validMoves = AI_PITS.filter(i => state.board[i] > 0);
    
    if (validMoves.length === 0) return;
    
    // Choose move
    let bestMove = validMoves[0];
    let bestScore = -100;
    
    validMoves.forEach(move => {
        let score = 0;
        const stones = state.board[move];
        const lastIndex = (move + stones) % 14;
        
        // Priority 1: Extra Turn
        if (lastIndex === 13) score += 10;
        
        // Priority 2: Captures
        if (lastIndex >= 7 && lastIndex <= 12 && state.board[lastIndex] === 0) {
            const oppPit = 12 - lastIndex;
            if (state.board[oppPit] > 0) score += (state.board[oppPit] + 1);
        }
        
        // Heuristic: move stones closer to store to avoid giving captures
        score += (move - 6); 

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    });

    executeMove(bestMove);
}

function checkGameOver() {
    const p1PitsEmpty = state.board.slice(0, 6).every(s => s === 0);
    const p2PitsEmpty = state.board.slice(7, 13).every(s => s === 0);
    
    if (p1PitsEmpty || p2PitsEmpty) {
        state.isGameOver = true;
        let p1Remaining = 0, p2Remaining = 0;
        for (let i = 0; i < 6; i++) { p1Remaining += state.board[i]; state.board[i] = 0; }
        for (let i = 7; i < 13; i++) { p2Remaining += state.board[i]; state.board[i] = 0; }
        state.board[6] += p1Remaining;
        state.board[13] += p2Remaining;
        updateUI();
        setTimeout(endGame, 800);
        return true;
    }
    return false;
}

function endGame() {
    const p1Score = state.board[6];
    const p2Score = state.board[13];
    p1ScoreText.textContent = `${state.p1Name}: ${p1Score}`;
    p2ScoreText.textContent = `${state.p2Name}: ${p2Score}`;
    
    if (p1Score > p2Score) {
        winnerText.textContent = `${state.p1Name} Wins!`;
        winnerText.style.color = 'var(--p1-color)';
    } else if (p2Score > p1Score) {
        winnerText.textContent = `${state.p2Name} Wins!`;
        winnerText.style.color = 'var(--p2-color)';
    } else {
        winnerText.textContent = "It's a Tie!";
        winnerText.style.color = '#fff';
    }
    modal.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
