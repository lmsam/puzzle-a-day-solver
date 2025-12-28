
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
    { id: 3, shape: [[0,0], [0,1], [0,2], [0,3], [0,4], [1,1]], w:5, h:2 },
    { id: 4, shape: [[0,0], [0,1], [0,2], [0,3], [1,1], [2,1]], w:4, h:3 },
    { id: 5, shape: [[0,0], [0,1], [0,2], [1,0], [1,1]], w:3, h:2 },
    { id: 6, shape: [[0,0], [0,1], [1,1], [1,2], [1,3]], w:4, h:2 },
    { id: 7, shape: [[0,0], [0,1], [1,1], [1,2], [1,3], [2,1]], w:4, h:3 },
    { id: 8, shape: [[0,0], [0,1], [0,2], [1,1], [2,0], [2,1]], w:3, h:3 }
];

// State
let selectedMonth = null;
let selectedDay = null;
let selectedWeekday = null;
let currentSolution = null;
let solverWorker = null;
let revealedPieces = new Set(); 

// DOM Elements
const boardEl = document.getElementById('board');
const statusText = document.getElementById('status-text');
const solveBtn = document.getElementById('solve-btn');
const clearBtn = document.getElementById('clear-btn');
const inventoryEl = document.getElementById('inventory');

function init() {
    renderBoard();
    
    // Initialize Worker from inlined source for file:// support
    const workerBlob = new Blob(['(' + solverWorkerScript.toString() + ')()'], { type: 'application/javascript' });
    solverWorker = new Worker(URL.createObjectURL(workerBlob));
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
        card.className = 'piece-card hidden-piece';
        card.dataset.id = piece.id;
        card.onclick = () => togglePiece(piece.id);
        
        const miniGrid = document.createElement('div');
        miniGrid.className = 'mini-grid';
        miniGrid.style.gridTemplateColumns = `repeat(${piece.w}, 1fr)`;
        
        const grid = Array(piece.h).fill().map(() => Array(piece.w).fill(0));
        piece.shape.forEach(([r, c]) => {
            if (grid[r] && grid[r][c] !== undefined) grid[r][c] = 1;
        });
        
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
        revealedPieces.delete(id);
        card.classList.remove('revealed');
        card.classList.add('hidden-piece');
        removePieceFromBoard(id);
    } else {
        revealedPieces.add(id);
        card.classList.add('revealed');
        card.classList.remove('hidden-piece');
        showPieceOnBoard(id);
    }
}

function showPieceOnBoard(id) {
    const placement = currentSolution.find(p => p.pieceId === id);
    if (!placement) return;
    
    placement.cells.forEach(idx => {
        const cell = boardEl.children[idx];
        if (cell) {
            cell.classList.add('piece', `piece-${id}`, 'animate-pop');
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
    
    document.querySelectorAll('.cell').forEach(el => {
        for(let i=0; i<9; i++) el.classList.remove(`piece-${i}`, 'piece');
    });
    
    inventoryEl.classList.add('hidden');
    inventoryEl.innerHTML = '<div class="inventory-placeholder"><p>Thinking...</p></div>';

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
        renderInventory(); 
        
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
    
    document.querySelectorAll('.cell').forEach(el => {
        for(let i=0; i<9; i++) el.classList.remove(`piece-${i}`, 'piece');
    });
    
    inventoryEl.classList.add('hidden');
    inventoryEl.innerHTML = '<div class="inventory-placeholder"><p>Pieces will appear here!</p></div>';
    
    statusText.textContent = "Select Date";
    statusText.style.color = "var(--text-secondary)";
}

/* =========================================
   INLINED SOLVER WORKER CODE
   ========================================= */
function solverWorkerScript() {
    const ROWS = 9;
    const COLS = 6;
    const TOTAL_CELLS = 54;
    // const EMPTY_INDICES = [43, 44, 48, 49]; 

    const RAW_PIECES = [
        [ [0,0], [0,1], [0,2], [0,3], [0,4], [1,0] ], // a
        [ [0,0], [0,1], [0,2], [0,3], [1,0] ],        // b
        [ [0,0], [0,1], [0,2], [0,3], [1,0], [2,0] ], // c
        [ [0,0], [0,1], [0,2], [0,3], [0,4], [1,1] ], // d
        [ [0,0], [0,1], [0,2], [0,3], [1,1], [2,1] ], // e
        [ [0,0], [0,1], [0,2], [1,0], [1,1] ],        // f
        [ [0,0], [0,1], [1,1], [1,2], [1,3] ],        // g
        [ [0,0], [0,1], [1,1], [1,2], [1,3], [2,1] ], // h
        [ [0,0], [0,1], [0,2], [1,1], [2,0], [2,1] ]  // i
    ];

    let PIECES = [];

    function initPieces() {
        PIECES = RAW_PIECES.map((shape, id) => {
            const variations = generateVariations(shape);
            return { id, variations };
        });
        PIECES.sort((a, b) => b.variations[0].length - a.variations[0].length);
    }

    function generateVariations(shape) {
        const unique = new Set();
        const result = [];
        let current = shape;
        for (let f = 0; f < 2; f++) {
            for (let r = 0; r < 4; r++) {
                const normalized = normalize(current);
                const sig = signature(normalized);
                if (!unique.has(sig)) {
                    unique.add(sig);
                    result.push(normalized);
                }
                current = rotate(current);
            }
            current = flip(current);
        }
        return result;
    }

    function rotate(shape) { return shape.map(([r, c]) => [c, -r]); }
    function flip(shape) { return shape.map(([r, c]) => [r, -c]); }
    function normalize(shape) {
        const minR = Math.min(...shape.map(p => p[0]));
        const minC = Math.min(...shape.map(p => p[1]));
        return shape.map(([r, c]) => [r - minR, c - minC]).sort((a,b) => (a[0]-b[0]) || (a[1]-b[1]));
    }
    function signature(shape) { return shape.map(p => `${p[0]},${p[1]}`).join('|'); }

    self.onmessage = function(e) {
        const { command, blockedIndices } = e.data;
        if (command === 'solve') {
            if (PIECES.length === 0) initPieces();
            
            const board = new Int8Array(TOTAL_CELLS).fill(0);
            blockedIndices.forEach(idx => board[idx] = 1);
            
            const usedPieces = new Array(PIECES.length).fill(false);
            const solution = [];
            const success = backtrack(board, usedPieces, solution);
            
            if (success) {
                postMessage({ type: 'success', solution });
            } else {
                postMessage({ type: 'error' });
            }
        }
    };

    function backtrack(board, usedPieces, solution) {
        let firstEmpty = -1;
        for (let i = 0; i < TOTAL_CELLS; i++) {
            if (board[i] === 0) {
                firstEmpty = i;
                break;
            }
        }
        
        if (firstEmpty === -1) {
            return true; 
        }
        
        const emptyR = Math.floor(firstEmpty / COLS);
        const emptyC = firstEmpty % COLS;
        
        for (let pIdx = 0; pIdx < PIECES.length; pIdx++) {
            if (usedPieces[pIdx]) continue;
            
            const piece = PIECES[pIdx];
            
            for (const shape of piece.variations) {
                for (const [br, bc] of shape) {
                    const anchorR = emptyR - br;
                    const anchorC = emptyC - bc;
                    
                    if (canPlace(board, shape, anchorR, anchorC)) {
                        const placedIndices = place(board, shape, anchorR, anchorC, 1);
                        usedPieces[pIdx] = true;
                        solution.push({ pieceId: piece.id, cells: placedIndices });
                        
                        if (backtrack(board, usedPieces, solution)) return true;
                        
                        solution.pop();
                        usedPieces[pIdx] = false;
                        place(board, shape, anchorR, anchorC, 0);
                    }
                }
            }
        }
        return false;
    }

    function canPlace(board, shape, r, c) {
        for (const [dr, dc] of shape) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
            const idx = nr * COLS + nc;
            if (board[idx] !== 0) return false;
        }
        return true;
    }

    function place(board, shape, r, c, val) {
        const indices = [];
        for (const [dr, dc] of shape) {
            const idx = (r + dr) * COLS + (c + dc);
            board[idx] = val;
            indices.push(idx);
        }
        return indices;
    }
}

init();
