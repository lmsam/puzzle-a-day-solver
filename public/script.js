
const BOARD_ROWS = 9;
const BOARD_COLS = 6;

// Labels for each cell index 0-53
const LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "1", "2", "3", "4", "5", "6",
    "7", "8", "9", "10", "11", "12",
    "13", "14", "15", "16", "17", "18",
    "19", "20", "21", "22", "23", "24",
    "25", "26", "27", "28", "29", "30",
    "31", "", "", "Mon", "Tue", "Wed",
    "", "", "Thur", "Fri", "Sat", "Sun"
];

const EMPTY_INDICES = [43, 44, 48, 49];

// Piece Definitions for UI Rendering (Mini Grids)
// 0,0 is top-left of the bounding box
const RAW_PIECES_UI = [
    { id: 0, shape: [[0,0], [0,1], [0,2], [0,3], [0,4], [1,0]], w:5, h:2 },
    { id: 1, shape: [[0,0], [0,1], [0,2], [0,3], [1,0]], w:4, h:2 },
    { id: 2, shape: [[0,0], [0,1], [0,2], [0,3], [1,0], [2,0]], w:4, h:3 },
    { id: 3, shape: [[0,0], [0,1], [0,2], [0,3], [0,4], [1,1]], w:5, h:2 }, // Z
    { id: 4, shape: [[0,0], [0,1], [0,2], [0,3], [1,1], [2,1]], w:4, h:3 }, // Chair
    { id: 5, shape: [[0,0], [0,1], [0,2], [1,0], [1,1]], w:3, h:2 },
    { id: 6, shape: [[0,0], [0,1], [1,1], [1,2], [1,3]], w:4, h:2 }, // S
    { id: 7, shape: [[0,0], [0,1], [1,1], [1,2], [1,3], [2,1]], w:4, h:3 },
    { id: 8, shape: [[0,0], [0,1], [0,2], [1,1], [2,0], [2,1]], w:3, h:3 }
];


// State
let selectedMonth = null;
let selectedDay = null;
let selectedWeekday = null;
let currentSolution = null;
let solverWorker = null;
let revealedPieces = new Set(); // IDs of pieces currently shown

// DOM Elements
const boardEl = document.getElementById('board');
const statusText = document.getElementById('status-text');
const solveBtn = document.getElementById('solve-btn');
const clearBtn = document.getElementById('clear-btn');
const inventoryEl = document.getElementById('inventory');

function init() {
    renderBoard();
    
    // Initialize Worker
    solverWorker = new Worker('solver.js');
    solverWorker.onmessage = handleSolverMessage;

    // Event Listeners
    solveBtn.addEventListener('click', startSolver);
    clearBtn.addEventListener('click', resetBoard);
}

function renderBoard() {
    boardEl.innerHTML = '';
    LABELS.forEach((label, index) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = index;
        
        if (EMPTY_INDICES.includes(index)) {
            cell.classList.add('empty');
        } else {
            cell.textContent = label;
            cell.addEventListener('click', () => handleCellClick(index, label, cell));
        }
        
        boardEl.appendChild(cell);
    });
}

function renderInventory() {
    inventoryEl.innerHTML = '';
    inventoryEl.classList.remove('hidden');
    
    RAW_PIECES_UI.forEach(piece => {
        const card = document.createElement('div');
        card.className = 'piece-card hidden-piece'; // Start hidden/dimmed
        card.dataset.id = piece.id;
        card.onclick = () => togglePiece(piece.id);
        
        // Render Mini Grid
        const miniGrid = document.createElement('div');
        miniGrid.className = 'mini-grid';
        miniGrid.style.gridTemplateColumns = `repeat(${piece.w}, 1fr)`;
        
        // Create 2D grid
        const grid = Array(piece.h).fill().map(() => Array(piece.w).fill(0));
        piece.shape.forEach(([r, c]) => {
            if (grid[r] && grid[r][c] !== undefined) grid[r][c] = 1;
        });
        
        // Render cells
        for(let r=0; r<piece.h; r++) {
            for(let c=0; c<piece.w; c++) {
                const miniCell = document.createElement('div');
                miniCell.className = 'mini-cell';
                if (grid[r][c] === 1) {
                    miniCell.style.backgroundColor = `var(--piece-${piece.id})`;
                } else {
                    miniCell.style.opacity = '0';
                }
                miniGrid.appendChild(miniCell);
            }
        }
        
        card.appendChild(miniGrid);
        inventoryEl.appendChild(card);
    });
}

function togglePiece(id) {
    if (!currentSolution) return;
    
    const card = inventoryEl.querySelector(`.piece-card[data-id="${id}"]`);
    
    if (revealedPieces.has(id)) {
        // Hide it
        revealedPieces.delete(id);
        card.classList.remove('revealed');
        card.classList.add('hidden-piece');
        removePieceFromBoard(id);
    } else {
        // Show it
        revealedPieces.add(id);
        card.classList.add('revealed');
        card.classList.remove('hidden-piece');
        showPieceOnBoard(id);
    }
}

function showPieceOnBoard(id) {
    // Find placement in solution
    const placement = currentSolution.find(p => p.pieceId === id);
    if (!placement) return;
    
    placement.cells.forEach(idx => {
        const cell = boardEl.children[idx];
        if (cell) {
            cell.classList.add('piece', `piece-${id}`, 'animate-pop');
            // Remove animation class after it plays so it doesn't re-trigger weirdly
            setTimeout(() => cell.classList.remove('animate-pop'), 400);
        }
    });
}

function removePieceFromBoard(id) {
    document.querySelectorAll(`.cell.piece-${id}`).forEach(el => {
        el.classList.remove('piece', `piece-${id}`, 'animate-pop');
    });
}


function handleCellClick(index, label, cellEl) {
    if (currentSolution) return; 

    // Determine type: Month, Day, or Weekday
    const isMonth = index < 12; 
    const isDay = (index >= 12 && index <= 42) && !EMPTY_INDICES.includes(index);
    const isWeekday = index >= 45 && !EMPTY_INDICES.includes(index); 

    if (isMonth) {
        selectedMonth = (selectedMonth === index) ? null : index;
    } else if (isDay) {
        selectedDay = (selectedDay === index) ? null : index;
    } else if (isWeekday) {
        selectedWeekday = (selectedWeekday === index) ? null : index;
    }

    updateSelectionUI();
    checkReady();
}

function updateSelectionUI() {
    document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));

    if (selectedMonth !== null) toggleSelect(selectedMonth);
    if (selectedDay !== null) toggleSelect(selectedDay);
    if (selectedWeekday !== null) toggleSelect(selectedWeekday);
}

function toggleSelect(index) {
    const el = boardEl.children[index];
    if (el) el.classList.add('selected');
}

function checkReady() {
    const ready = selectedMonth !== null && selectedDay !== null && selectedWeekday !== null;
    solveBtn.disabled = !ready;
    solveBtn.textContent = ready ? "Solve It!" : "Pick Date";
    
    if (ready) {
        statusText.textContent = "Ready!";
        statusText.style.color = "var(--accent)";
    } else {
        statusText.textContent = "Select Date";
        statusText.style.color = "var(--text-secondary)";
    }
}

function startSolver() {
    if (!solverWorker) return;
    
    solveBtn.disabled = true;
    solveBtn.textContent = "Solving...";
    statusText.textContent = "Thinking...";
    
    // Clear previous solution viz
    document.querySelectorAll('.cell').forEach(el => {
        for(let i=0; i<9; i++) el.classList.remove(`piece-${i}`, 'piece');
    });
    
    // Reset Inventory
    inventoryEl.classList.add('hidden');
    inventoryEl.innerHTML = '<div class="inventory-placeholder"><p>Searching...</p></div>';

    const blocked = [selectedMonth, selectedDay, selectedWeekday];
    solverWorker.postMessage({ command: 'solve', blockedIndices: blocked });
}

function handleSolverMessage(e) {
    const { type, solution } = e.data;
    
    if (type === 'success') {
        currentSolution = solution;
        statusText.textContent = "Found!";
        solveBtn.textContent = "Solved";
        
        revealedPieces.clear();
        renderInventory(); // Show clickable cards
        
    } else if (type === 'error') {
        statusText.textContent = "No solution.";
        statusText.style.color = "var(--danger)";
        solveBtn.disabled = false;
        solveBtn.textContent = "Retry";
    }
}

function resetBoard() {
    selectedMonth = null;
    selectedDay = null;
    selectedWeekday = null;
    currentSolution = null;
    revealedPieces.clear();
    
    updateSelectionUI();
    checkReady();
    
    // Clear Board Viz
    document.querySelectorAll('.cell').forEach(el => {
        for(let i=0; i<9; i++) el.classList.remove(`piece-${i}`, 'piece');
    });
    
    // Reset Inventory
    inventoryEl.classList.add('hidden');
    inventoryEl.innerHTML = '<div class="inventory-placeholder"><p>Pieces will appear here!</p></div>';
    
    statusText.textContent = "Select Date";
    statusText.style.color = "var(--text-secondary)";
}

init();
