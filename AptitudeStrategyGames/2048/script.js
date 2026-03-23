// DOM Elements
const gridContainer = document.getElementById('grid');
const tileContainer = document.getElementById('tile-container');
const scoreDisplay = document.getElementById('score');
const bestScoreDisplay = document.getElementById('best-score');
const gameMessage = document.getElementById('game-message');
const messageText = document.getElementById('message-text');
const retryBtn = document.getElementById('retry-btn');
const newGameBtn = document.getElementById('new-game-btn');
const undoBtn = document.getElementById('undo-btn');
const timerDisplay = document.getElementById('timer-display');

// Game State
let grid = [];
let previousGrid = null;
let score = 0;
let previousScore = 0;
let bestScore = localStorage.getItem('2048-best') || 0;
const gridSize = 4;
let isAnimating = false;

// Timer State
let timeSeconds = 0;
let timerInterval = null;

// Initialize
function init() {
    bestScoreDisplay.textContent = bestScore;
    
    // Setup listeners
    document.addEventListener('keydown', handleKeyInput);
    
    // Touch listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    retryBtn.addEventListener('click', startNewGame);
    newGameBtn.addEventListener('click', startNewGame);
    undoBtn.addEventListener('click', handleUndo);
    
    startNewGame();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function updateTimerDisplay() {
    const min = Math.floor(timeSeconds / 60).toString().padStart(2, '0');
    const sec = (timeSeconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${min}:${sec}`;
}

function startNewGame() {
    grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    previousGrid = null;
    score = 0;
    previousScore = 0;
    undoBtn.disabled = true;
    
    updateScore(0);
    gameMessage.classList.add('hidden');
    
    timeSeconds = 0;
    updateTimerDisplay();
    startTimer();
    
    // Clear DOM
    tileContainer.innerHTML = '';
    
    // Add two initial tiles
    addRandomTile();
    addRandomTile();
}

// Logic: Undo previous move
function handleUndo() {
    if (!previousGrid || isAnimating) return;
    
    grid = previousGrid.map(row => [...row]);
    score = previousScore;
    updateScore(0);
    
    // Rebuild full DOM instantly
    tileContainer.innerHTML = '';
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] > 0) {
                createTileDOM(r, c, grid[r][c]);
            }
        }
    }
    
    previousGrid = null;
    undoBtn.disabled = true;
    gameMessage.classList.add('hidden'); // In case player undoes a Game Over
}

// Logic: Add a random tile (2 or 4) to an empty spot
function addRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] === 0) {
                emptyCells.push({ r, c });
            }
        }
    }
    
    if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        grid[randomCell.r][randomCell.c] = value;
        createTileDOM(randomCell.r, randomCell.c, value);
    }
}

// Convert grid position to CSS position
function getPositionStyle(r, c) {
    // using translate3d for better GPU performance on mobile
    const x = `calc(${c} * (var(--tile-size) + var(--grid-gap)))`;
    const y = `calc(${r} * (var(--tile-size) + var(--grid-gap)))`;
    return `translate3d(${x}, ${y}, 0)`;
}

// Create DOM element for a tile
function createTileDOM(r, c, value) {
    const tile = document.createElement('div');
    tile.classList.add('tile');
    tile.dataset.value = value;
    tile.id = `tile-${r}-${c}`;
    
    tile.style.transform = getPositionStyle(r, c);
    
    const inner = document.createElement('div');
    inner.classList.add('tile-inner');
    inner.textContent = value;
    tile.appendChild(inner);
    
    tileContainer.appendChild(tile);
    return tile;
}

// Rendering update loop after movement
function updateDOM(transitions) {
    // 1. Move existing tiles to their new positions using scale/translate transitions
    transitions.moves.forEach(move => {
        const tile = document.getElementById(`tile-${move.from.r}-${move.from.c}`);
        if (tile) {
            tile.style.transform = getPositionStyle(move.to.r, move.to.c);
            tile.id = `tile-${move.to.r}-${move.to.c}`; // Update ID for identification during transition
        }
    });

    // We'll wait slightly less than CSS transition time (0.2s) before performing the swap-out
    setTimeout(() => {
        // More efficient DOM recreation: only if needed or just sync values
        tileContainer.innerHTML = '';
        
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (grid[r][c] > 0) {
                    const tile = createTileDOM(r, c, grid[r][c]);
                    
                    const wasMerged = transitions.merges.some(m => m.r === r && m.c === c);
                    if (wasMerged) {
                        tile.classList.add('merged');
                    }
                }
            }
        }
        
        if (transitions.changed) {
            addRandomTile();
            checkGameOver();
        }
        
        isAnimating = false;
        
    }, 200); // Reduced to match new CSS timing
}

// Move logic
function move(direction) {
    if (isAnimating) return;
    
    // clone grid to track changes for possible undo
    const oldGrid = grid.map(row => [...row]);
    const oldScore = score;
    
    let moved = false;
    const moves = []; // Track physical movements for CSS: {from: {r,c}, to: {r,c}}
    const merges = []; // Track merged coordinates: {r,c}
    
    // Build columns or rows based on direction to easily process them
    for (let i = 0; i < gridSize; i++) {
        let line = [];
        let coords = []; // Keep track of original coordinates to build the `moves` list
        
        for (let j = 0; j < gridSize; j++) {
            let r = (direction === 'UP' || direction === 'DOWN') ? j : i;
            let c = (direction === 'LEFT' || direction === 'RIGHT') ? j : i;
            
            // Reverse direction logically if moving right/down
            if (direction === 'RIGHT' || direction === 'DOWN') {
                r = (direction === 'DOWN') ? gridSize - 1 - j : i;
                c = (direction === 'RIGHT') ? gridSize - 1 - j : i;
            }
            
            if (grid[r][c] !== 0) {
                line.push(grid[r][c]);
                coords.push({ r, c });
            }
        }
        
        // Process line (slide and merge)
        let newLine = [];
        let mergedIndices = new Set();
        let newCoords = []; // The new logical position mapping for the moved tiles
        
        for (let k = 0; k < line.length; k++) {
            if (k < line.length - 1 && line[k] === line[k+1] && !mergedIndices.has(k)) {
                // Merge!
                const val = line[k] * 2;
                newLine.push(val);
                updateScore(val);
                mergedIndices.add(k + 1);
                
                // Track where both tiles are merging to
                const targetIdx = newLine.length - 1;
                newCoords.push(targetIdx); 
                newCoords.push(targetIdx); // The second tile goes to the exact same spot
                
                k++; // Skip next tile since it merged
            } else {
                newLine.push(line[k]);
                newCoords.push(newLine.length - 1);
            }
        }
        
        // Fill the rest with zeros
        while (newLine.length < gridSize) {
            newLine.push(0);
        }
        
        // Re-apply to grid and build move commands for the animator
        for (let j = 0; j < gridSize; j++) {
            let r = (direction === 'UP' || direction === 'DOWN') ? j : i;
            let c = (direction === 'LEFT' || direction === 'RIGHT') ? j : i;
            
            if (direction === 'RIGHT' || direction === 'DOWN') {
                r = (direction === 'DOWN') ? gridSize - 1 - j : i;
                c = (direction === 'RIGHT') ? gridSize - 1 - j : i;
            }
            
            grid[r][c] = newLine[j];
        }
        
        // Record moves
        for (let k = 0; k < coords.length; k++) {
            const orig = coords[k];
            const targetIdx = newCoords[k];
            
            let destR = (direction === 'UP' || direction === 'DOWN') ? targetIdx : i;
            let destC = (direction === 'LEFT' || direction === 'RIGHT') ? targetIdx : i;
            
            if (direction === 'RIGHT' || direction === 'DOWN') {
                destR = (direction === 'DOWN') ? gridSize - 1 - targetIdx : i;
                destC = (direction === 'RIGHT') ? gridSize - 1 - targetIdx : i;
            }
            
            if (orig.r !== destR || orig.c !== destC) {
                moves.push({ from: { r: orig.r, c: orig.c }, to: { r: destR, c: destC } });
            }
            
            // Check if this was a merge target
            if (k > 0 && newCoords[k] === newCoords[k-1]) {
                merges.push({ r: destR, c: destC });
            }
        }
    }
    
    // Check if the grid actually changed
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] !== oldGrid[r][c]) {
                moved = true;
            }
        }
    }
    
    if (moved) {
        // Save state for undo BEFORE applying animations
        previousGrid = oldGrid;
        previousScore = oldScore;
        undoBtn.disabled = false;
        
        isAnimating = true;
        updateDOM({ changed: true, moves, merges });
    }
}

// Input Handlers
function handleKeyInput(e) {
    if (isAnimating) return;
    
    switch (e.key) {
        case 'ArrowUp': move('UP'); e.preventDefault(); break;
        case 'ArrowDown': move('DOWN'); e.preventDefault(); break;
        case 'ArrowLeft': move('LEFT'); e.preventDefault(); break;
        case 'ArrowRight': move('RIGHT'); e.preventDefault(); break;
    }
}

// Touch sliding
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    // Prevent scrolling when swiping on the board
    if (e.target.closest('.game-wrapper')) {
        e.preventDefault();
    }
}

function handleTouchEnd(e) {
    if (isAnimating) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    // Only register swipe if it's long enough
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            if (dx > 0) move('RIGHT');
            else move('LEFT');
        } else {
            // Vertical
            if (dy > 0) move('DOWN');
            else move('UP');
        }
    }
}

// Score Management
function updateScore(points) {
    score += points;
    scoreDisplay.textContent = score;
    
    if (score > bestScore) {
        bestScore = score;
        bestScoreDisplay.textContent = bestScore;
        localStorage.setItem('2048-best', bestScore);
    }
}

// Win/Loss Detection
function checkGameOver() {
    // Check win
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] === 2048) {
                showGameOver(true);
                return;
            }
        }
    }

    // Check if full
    let isFull = true;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] === 0) isFull = false;
        }
    }
    
    if (!isFull) return;

    // Check if any merges possible
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const current = grid[r][c];
            // Check right
            if (c < gridSize - 1 && grid[r][c + 1] === current) return;
            // Check down
            if (r < gridSize - 1 && grid[r + 1][c] === current) return;
        }
    }

    showGameOver(false);
}

function showGameOver(isWin) {
    stopTimer();
    messageText.textContent = isWin ? 'You Win!' : 'Game Over!';
    gameMessage.classList.remove('hidden');
}

// Start app
document.addEventListener('DOMContentLoaded', init);
