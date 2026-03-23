// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen')
};

const setupBtn = document.getElementById('start-btn');
const p1Input = document.getElementById('player1');
const p2Input = document.getElementById('player2');

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
    p2Name: 'Player 2',
    board: Array(14).fill(0),
    currentPlayer: 1,
    isGameOver: false,
    isAnimating: false,
    useTimer: false,
    timerSeconds: 15,
    timerInterval: null,
    timeRemaining: 0,
    lastPlayedIndex: -1
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

// In a real mancala, stones don't technically belong to specific pits once moving, 
// so we'll just randomly assign colors to the count when rendering.

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
        setTimeout(() => s.classList.add('hidden'), 500);
    });
    
    setTimeout(() => {
        screens[screenId].classList.remove('hidden');
        void screens[screenId].offsetWidth;
        screens[screenId].classList.add('active');
    }, 500);
}

function startGame() {
    state.p1Name = p1Input.value.trim() || 'Player 1';
    state.p2Name = p2Input.value.trim() || 'Player 2';
    
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
    if (!state.useTimer || state.isGameOver) return;
    
    state.timeRemaining = state.timerSeconds;
    timeLeftSpan.textContent = state.timeRemaining;
    
    state.timerInterval = setInterval(() => {
        if (state.isAnimating) return; // Pause timer during animation
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
    if (state.timerInterval) clearInterval(state.timerInterval);
}

function resetGame() {
    // 4 stones in each pit, 0 in stores
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
    setStatus("Select a pit to start sowing.");
}

function handleUndo() {
    if (!previousState || state.isAnimating) return;
    
    state.board = [...previousState.board];
    state.currentPlayer = previousState.currentPlayer;
    state.lastPlayedIndex = previousState.lastPlayedIndex;
    
    previousState = null;
    undoBtn.disabled = true;
    state.isGameOver = false;
    
    document.querySelectorAll('.receiving').forEach(el => el.classList.remove('receiving'));
    
    if (state.useTimer && !state.isGameOver) {
        state.timeRemaining = state.timerSeconds;
    }
    
    updateUI();
    setStatus("Move undone. Please play again.");
}

function renderStones(pitElement, count) {
    const container = pitElement.querySelector('.stone-container');
    const counter = pitElement.querySelector('.stone-count');
    
    counter.textContent = count;
    
    // Animate rendering by clearing and repopulating 
    // Wait, to prevent massive DOM manipulation flashing, only append/remove what's needed.
    const currentStones = container.children.length;
    
    if (count > currentStones) {
        // Add stones
        for(let i = 0; i < (count - currentStones); i++) {
            const stone = document.createElement('div');
            stone.className = 'stone dropped';
            // pick random color
            stone.style.background = stoneColors[Math.floor(Math.random() * stoneColors.length)];
            // Add slight random rotation to look natural
            stone.style.transform = `rotate(${Math.random() * 360}deg)`;
            container.appendChild(stone);
        }
    } else if (count < currentStones) {
        // Remove stones
        for(let i = 0; i < (currentStones - count); i++) {
            if(container.lastChild) {
                container.removeChild(container.lastChild);
            }
        }
    }
}

function updateUI() {
    // Render Board
    for(let i=0; i<14; i++) {
        const pitEl = document.getElementById(`pit-${i}`);
        renderStones(pitEl, state.board[i]);
        
        // Update validity styling
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
            
            // Add last played highlight
            if (i === state.lastPlayedIndex) {
                pitEl.classList.add('last-played');
            } else {
                pitEl.classList.remove('last-played');
            }
        }
    }
    
    // Update Headers
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
    }
    
    if (state.useTimer && !state.isAnimating && !state.isGameOver) {
        startTimer();
    }
}

function setStatus(msg) {
    statusMsg.textContent = msg;
}

async function handlePitClick(index) {
    if (state.isGameOver || state.isAnimating) return;
    
    // Check if valid pit for current player
    const isP1 = state.currentPlayer === 1;
    if (isP1 && (index < 0 || index > 5)) return;
    if (!isP1 && (index < 7 || index > 12)) return;
    
    let stones = state.board[index];
    if (stones === 0) return; // Empty pit
    
    // Save state for undo
    previousState = {
        board: [...state.board],
        currentPlayer: state.currentPlayer,
        lastPlayedIndex: state.lastPlayedIndex
    };
    if (undoBtn) undoBtn.disabled = true; // Disable until animation ends
    
    state.isAnimating = true;
    state.lastPlayedIndex = index;
    
    // Pick up stones
    state.board[index] = 0;
    updateUI();
    setStatus("Sowing stones...");
    
    let currentIndex = index;
    let previousIndex = index;
    
    // We will do a simple timeout based animation loop
    const sowNext = () => {
        return new Promise(resolve => {
            if (stones <= 0) {
                document.querySelectorAll('.receiving').forEach(el => el.classList.remove('receiving'));
                resolve();
                return;
            }
            
            currentIndex = (currentIndex + 1) % 14;
            
            // Skip opponent's store
            if (isP1 && currentIndex === 13) currentIndex = 0;
            if (!isP1 && currentIndex === 6) currentIndex = 7;
            
            // Get physical locations for flying stone
            const originEl = document.getElementById(`pit-${previousIndex}`);
            const destEl = document.getElementById(`pit-${currentIndex}`);
            const originRect = originEl.getBoundingClientRect();
            const destRect = destEl.getBoundingClientRect();
            
            const flyingStone = document.createElement('div');
            flyingStone.className = 'stone flying-stone';
            flyingStone.style.background = stoneColors[Math.floor(Math.random() * stoneColors.length)];
            
            // Start position (center of previous pit)
            flyingStone.style.left = `${originRect.left + originRect.width/2 - 7}px`;
            flyingStone.style.top = `${originRect.top + originRect.height/2 - 7}px`;
            
            document.body.appendChild(flyingStone);
            
            // Highlight dest pit
            document.querySelectorAll('.receiving').forEach(el => el.classList.remove('receiving'));
            destEl.classList.add('receiving');
            
            void flyingStone.offsetWidth; // Force CSS reflow
            
            // End position (center of new pit)
            flyingStone.style.left = `${destRect.left + destRect.width/2 - 7}px`;
            flyingStone.style.top = `${destRect.top + destRect.height/2 - 7}px`;
            
            setTimeout(() => {
                // Arrived
                flyingStone.remove();
                state.board[currentIndex]++;
                stones--;
                updateUI();
                
                previousIndex = currentIndex; // Next stone flies from this pit
                
                setTimeout(() => {
                    sowNext().then(resolve);
                }, 50); // 50ms pause between drops
            }, 300); // 300ms transit time
        });
    };
    
    await sowNext();
    
    // Sowing finished, evaluate consequences
    let finalIndex = currentIndex;
    
    // 1. Extra turn logic
    const storeIndex = isP1 ? 6 : 13;
    if (finalIndex === storeIndex) {
        setStatus(`Ended in store! ${isP1 ? state.p1Name : state.p2Name} gets an extra turn.`);
        state.isAnimating = false;
        if (undoBtn && previousState) undoBtn.disabled = false;
        if (!checkGameOver()) {
            updateUI(); // restarts timer since isAnimating is false
        }
        return; 
    }
    
    // 2. Capture logic
    // If landed in empty pit ON OWN SIDE, and opposite pit has stones
    const isOwnSide = isP1 ? (finalIndex >= 0 && finalIndex <= 5) : (finalIndex >= 7 && finalIndex <= 12);
    
    if (isOwnSide && state.board[finalIndex] === 1) {
        const oppositeIndex = 12 - finalIndex;
        const oppositeStones = state.board[oppositeIndex];
        
        if (oppositeStones > 0) {
            setStatus("Capture!");
            await new Promise(r => setTimeout(r, 600)); // Pause to let user see
            
            // Move own stone + opposite stones to store
            state.board[storeIndex] += (1 + oppositeStones);
            state.board[finalIndex] = 0;
            state.board[oppositeIndex] = 0;
            
            updateUI();
        }
    }
    
    // Check game over
    if (!checkGameOver()) {
        // Switch turn
        state.currentPlayer = isP1 ? 2 : 1;
        setStatus("Select a pit.");
        state.isAnimating = false;
        if (undoBtn && previousState) undoBtn.disabled = false;
        updateUI();
    } else {
        state.isAnimating = false;
        if (undoBtn) undoBtn.disabled = true; // no undoing game over for now
    }
}

function checkGameOver() {
    const p1PitsEmpty = state.board.slice(0, 6).every(s => s === 0);
    const p2PitsEmpty = state.board.slice(7, 13).every(s => s === 0);
    
    if (p1PitsEmpty || p2PitsEmpty) {
        state.isGameOver = true;
        
        // Move remaining stones to stores
        let p1Remaining = 0;
        let p2Remaining = 0;
        
        for (let i = 0; i < 6; i++) {
            p1Remaining += state.board[i];
            state.board[i] = 0;
        }
        for (let i = 7; i < 13; i++) {
            p2Remaining += state.board[i];
            state.board[i] = 0;
        }
        
        state.board[6] += p1Remaining;
        state.board[13] += p2Remaining;
        
        updateUI();
        
        setTimeout(() => {
            endGame();
        }, 1000);
        
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

// Start app
document.addEventListener('DOMContentLoaded', init);
