// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen')
};

// Setup Inputs
const p1Input = document.getElementById('player1');
const p2Input = document.getElementById('player2');
const timerToggle = document.getElementById('timer-toggle');
const timerSettings = document.getElementById('timer-settings');
const timerSecondsInput = document.getElementById('timer-seconds');
const startBtn = document.getElementById('start-btn');

// Game UI Elements
const p1NameDisplay = document.getElementById('p1-name-display');
const p2NameDisplay = document.getElementById('p2-name-display');
const turnIndicator = document.getElementById('turn-indicator');
const timerDisplay = document.getElementById('timer-display');
const timeLeftSpan = document.getElementById('time-left');
const mainBoardEl = document.getElementById('main-board');

// Modal Elements
const gameOverModal = document.getElementById('game-over-modal');
const winnerText = document.getElementById('winner-text');
const winReason = document.getElementById('win-reason');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');

// Game State
let gameState = {
    p1Name: 'Player 1',
    p2Name: 'Player 2',
    useTimer: false,
    timerSeconds: 15,
    currentPlayer: 1, // 1 for X (P1), 2 for O (P2)
    activeBoard: -1, // -1 means any board is valid. 0-8 means specific board.
    board: Array(9).fill().map(() => Array(9).fill(0)), // 9 sub-boards, each 9 cells
    bigBoard: Array(9).fill(0), // 0: unplayed, 1: P1, 2: P2, 3: Draw
    isGameOver: false,
    timerInterval: null,
    timeRemaining: 0,
    lastMove: { boardIdx: -1, cellIdx: -1 }
};

// Winning combinations for a 3x3 board
const winCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Initialize Events
function init() {
    // Timer toggle visibility
    timerToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            timerSettings.classList.remove('hidden');
        } else {
            timerSettings.classList.add('hidden');
        }
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        resetGame();
    });
    menuBtn.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        showScreen('setup');
    });
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => {
        s.classList.remove('active');
        setTimeout(() => s.classList.add('hidden'), 300);
    });
    
    setTimeout(() => {
        screens[screenName].classList.remove('hidden');
        void screens[screenName].offsetWidth; // trigger reflow
        screens[screenName].classList.add('active');
    }, 300);
}

function startGame() {
    gameState.p1Name = p1Input.value.trim() || 'Player 1';
    gameState.p2Name = p2Input.value.trim() || 'Player 2';
    gameState.useTimer = timerToggle.checked;
    gameState.timerSeconds = parseInt(timerSecondsInput.value) || 15;
    
    // Validate inputs
    if (gameState.timerSeconds < 5) gameState.timerSeconds = 5;
    if (gameState.timerSeconds > 300) gameState.timerSeconds = 300;
    
    // Update UI
    p1NameDisplay.textContent = gameState.p1Name;
    p2NameDisplay.textContent = gameState.p2Name;
    
    if (gameState.useTimer) {
        timerDisplay.classList.remove('hidden');
    } else {
        timerDisplay.classList.add('hidden');
    }
    
    showScreen('game');
    resetGame();
}

function resetGame() {
    gameState.currentPlayer = 1;
    gameState.activeBoard = -1;
    gameState.board = Array(9).fill().map(() => Array(9).fill(0));
    gameState.bigBoard = Array(9).fill(0);
    gameState.isGameOver = false;
    gameState.lastMove = { boardIdx: -1, cellIdx: -1 };
    
    stopTimer();
    renderBoard();
    updateTurnIndicator();
}

function renderBoard() {
    mainBoardEl.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const subBoard = document.createElement('div');
        subBoard.className = 'sub-board';
        subBoard.dataset.boardIdx = i;
        
        // Status classes
        if (gameState.bigBoard[i] === 1) subBoard.classList.add('won-p1');
        else if (gameState.bigBoard[i] === 2) subBoard.classList.add('won-p2');
        else if (gameState.bigBoard[i] === 3) subBoard.classList.add('draw');
        
        // Validation highlighting
        if (!gameState.isGameOver && gameState.bigBoard[i] === 0) {
            if (gameState.activeBoard === -1 || gameState.activeBoard === i) {
                subBoard.classList.add('valid-target');
                subBoard.classList.add(gameState.currentPlayer === 1 ? 'p1-turn-target' : 'p2-turn-target');
            } else {
                subBoard.classList.add('dimmed');
            }
        } else if (gameState.bigBoard[i] !== 0) {
            subBoard.classList.add('dimmed');
        }
        
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.boardIdx = i;
            cell.dataset.cellIdx = j;
            
            const cellVal = gameState.board[i][j];
            if (cellVal === 1) {
                cell.textContent = 'X';
                cell.classList.add('x');
            } else if (cellVal === 2) {
                cell.textContent = 'O';
                cell.classList.add('o');
            }
            
            // Highlight last move
            if (gameState.lastMove.boardIdx === i && gameState.lastMove.cellIdx === j) {
                cell.classList.add('last-move');
            }
            
            cell.addEventListener('click', handleCellClick);
            subBoard.appendChild(cell);
        }
        
        mainBoardEl.appendChild(subBoard);
    }
}

function handleCellClick(e) {
    if (gameState.isGameOver) return;
    
    const boardIdx = parseInt(e.target.dataset.boardIdx);
    const cellIdx = parseInt(e.target.dataset.cellIdx);
    
    // Validate move
    if (gameState.bigBoard[boardIdx] !== 0) return; // Board already won
    if (gameState.board[boardIdx][cellIdx] !== 0) return; // Cell filled
    if (gameState.activeBoard !== -1 && gameState.activeBoard !== boardIdx) return; // Wrong board
    
    // Apply move
    gameState.board[boardIdx][cellIdx] = gameState.currentPlayer;
    gameState.lastMove = { boardIdx, cellIdx };
    
    // Check for sub-board win
    checkSubBoardWin(boardIdx);
    
    // Update target active board for NEXT player
    if (gameState.bigBoard[cellIdx] !== 0) {
        gameState.activeBoard = -1; // Target board is already won/full, next player goes anywhere
    } else {
        gameState.activeBoard = cellIdx; // Must go to specific board
    }
    
    // Check for big game over
    if (!checkGameWin()) {
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        updateTurnIndicator();
        renderBoard();
    }
}

function checkSubBoardWin(boardIdx) {
    const board = gameState.board[boardIdx];
    let won = false;
    
    for (let combo of winCombos) {
        const [a, b, c] = combo;
        if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
            gameState.bigBoard[boardIdx] = board[a]; // Player 1 or 2
            won = true;
            break;
        }
    }
    
    if (!won && !board.includes(0)) {
        gameState.bigBoard[boardIdx] = 3; // Draw
    }
}

function checkGameWin() {
    let won = false;
    let winnerId = 0;
    
    for (let combo of winCombos) {
        const [a, b, c] = combo;
        if (gameState.bigBoard[a] !== 0 && gameState.bigBoard[a] !== 3 && 
            gameState.bigBoard[a] === gameState.bigBoard[b] && 
            gameState.bigBoard[a] === gameState.bigBoard[c]) {
            won = true;
            winnerId = gameState.bigBoard[a];
            break;
        }
    }
    
    let isDraw = false;
    if (!won && !gameState.bigBoard.includes(0)) {
        isDraw = true;
    }
    
    if (won) {
        endGame(winnerId, `Won 3 large grids in a row!`);
        return true;
    } else if (isDraw) {
        endGame(0, `The game is a tie!`);
        return true;
    }
    return false;
}

function updateTurnIndicator() {
    const p1Name = gameState.p1Name;
    const p2Name = gameState.p2Name;
    
    if (gameState.currentPlayer === 1) {
        turnIndicator.textContent = `${p1Name}'s Turn`;
        turnIndicator.className = 'turn-badge p1-turn';
    } else {
        turnIndicator.textContent = `${p2Name}'s Turn`;
        turnIndicator.className = 'turn-badge p2-turn';
    }
    
    if (gameState.useTimer) {
        startTimer();
    }
}

function startTimer() {
    stopTimer();
    gameState.timeRemaining = gameState.timerSeconds;
    updateTimerUI();
    
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerUI();
        
        if (gameState.timeRemaining <= 0) {
            handleTimeout();
        }
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    timerDisplay.classList.remove('timer-danger');
}

function updateTimerUI() {
    timeLeftSpan.textContent = gameState.timeRemaining;
    if (gameState.timeRemaining <= 5) {
        timerDisplay.classList.add('timer-danger');
    } else {
        timerDisplay.classList.remove('timer-danger');
    }
}

function handleTimeout() {
    stopTimer();
    const winnerId = gameState.currentPlayer === 1 ? 2 : 1; // Opponent wins on timeout
    const loserName = gameState.currentPlayer === 1 ? gameState.p1Name : gameState.p2Name;
    
    endGame(winnerId, `${loserName} ran out of time!`);
}

function endGame(winnerId, reason) {
    gameState.isGameOver = true;
    stopTimer();
    renderBoard(); // Render the board one last time to show final state
    
    setTimeout(() => {
        if (winnerId === 1) {
            winnerText.textContent = `${gameState.p1Name} Wins!`;
            winnerText.className = 'title-glow text-p1';
        } else if (winnerId === 2) {
            winnerText.textContent = `${gameState.p2Name} Wins!`;
            winnerText.className = 'title-glow text-p2';
        } else {
            winnerText.textContent = `It's a Draw!`;
            winnerText.className = 'title-glow';
            winnerText.style = "background: white; -webkit-background-clip: text; -webkit-text-fill-color: transparent;";
        }
        
        winReason.textContent = reason;
        gameOverModal.classList.remove('hidden');
    }, 1200);
}

document.addEventListener('DOMContentLoaded', init);
