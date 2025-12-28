
const BOARD_ROWS = 9;
const BOARD_COLS = 6;

// Labels for each cell index 0-53
const LABELS = [
    // Row 0
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    // Row 1
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    // Row 2
    "1", "2", "3", "4", "5", "6",
    // Row 3
    "7", "8", "9", "10", "11", "12",
    // Row 4
    "13", "14", "15", "16", "17", "18",
    // Row 5
    "19", "20", "21", "22", "23", "24",
    // Row 6
    "25", "26", "27", "28", "29", "30",
    // Row 7
    "31", "", "", "Mon", "Tue", "Wed",
    // Row 8
    "", "", "Thur", "Fri", "Sat", "Sun"
];

const EMPTY_INDICES = [43, 44, 48, 49]; // Indices that are permanently empty/unused

// State
let selectedMonth = null;
let selectedDay = null;
let selectedWeekday = null;
let currentSolution = null;
let solverWorker = null;

// DOM Elements
const boardEl = document.getElementById('board');
const statusText = document.getElementById('status-text');
const solveBtn = document.getElementById('solve-btn');
const clearBtn = document.getElementById('clear-btn');
const hintSlider = document.getElementById('hint-slider');
const hintValue = document.getElementById('hint-value');

function init() {
    renderBoard();
    
    // Initialize Worker
    solverWorker = new Worker('solver.js');
    solverWorker.onmessage = handleSolverMessage;

    // Event Listeners
    solveBtn.addEventListener('click', startSolver);
    clearBtn.addEventListener('click', resetBoard);
    hintSlider.addEventListener('input', updateHint);
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

function handleCellClick(index, label, cellEl) {
    if (currentSolution) return; // Disable editing while solved/solving

    // Determine type: Month, Day, or Weekday
    const isMonth = index < 12; // 0-11
    const isDay = (index >= 12 && index <= 42) && !EMPTY_INDICES.includes(index);
    const isWeekday = index >= 45 && !EMPTY_INDICES.includes(index); // 45-47, 50-53

    if (isMonth) {
        if (selectedMonth === index) selectedMonth = null;
        else selectedMonth = index;
    } else if (isDay) {
        if (selectedDay === index) selectedDay = null;
        else selectedDay = index;
    } else if (isWeekday) {
        if (selectedWeekday === index) selectedWeekday = null;
        else selectedWeekday = index;
    }

    updateSelectionUI();
    checkReady();
}

function updateSelectionUI() {
    // Clear all selected classes
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
    solveBtn.textContent = ready ? "Solve Puzzle" : "Select Date to Solve";
    
    if (ready) {
        statusText.textContent = "Ready to solve!";
        statusText.style.color = "var(--accent)";
    } else {
        statusText.textContent = "Select a Month, Day, and Weekday";
        statusText.style.color = "var(--text-secondary)";
    }
}

function startSolver() {
    if (!solverWorker) return;
    
    solveBtn.disabled = true;
    solveBtn.textContent = "Solving...";
    statusText.textContent = "Searching for solution...";
    
    // Clear previous solution viz
    clearSolutionViz();

    const blocked = [selectedMonth, selectedDay, selectedWeekday];
    solverWorker.postMessage({ command: 'solve', blockedIndices: blocked });
}

function handleSolverMessage(e) {
    const { type, solution, error } = e.data;
    
    if (type === 'success') {
        currentSolution = solution;
        statusText.textContent = "Solution Found!";
        solveBtn.textContent = "Solved";
        hintSlider.disabled = false;
        hintSlider.value = 0; // Start hidden
        hintValue.textContent = 0;
        
        // Default to showing 0 tiles, user can use slider to reveal.
        updateHint(); // Will show 0 since slider is 0
        
    } else if (type === 'error') {
        statusText.textContent = "No solution found (or error).";
        statusText.style.color = "var(--danger)";
        solveBtn.disabled = false;
        solveBtn.textContent = "Retry";
    }
}

function clearSolutionViz() {
    document.querySelectorAll('.cell').forEach(el => {
        // Remove all piece classes piece-0 .. piece-8
        for(let i=0; i<9; i++) el.classList.remove(`piece-${i}`, 'piece');
    });
}

function updateHint() {
    const limit = parseInt(hintSlider.value);
    hintValue.textContent = limit;
    
    if (!currentSolution) return;
    
    clearSolutionViz();
    
    // Show first 'limit' pieces
    // solution is array of placements: { pieceId, cells: [indices...] }
    // We sort by pieceId to be consistent or just take strictly array order
    
    for (let i = 0; i < limit; i++) {
        const placement = currentSolution[i];
        if (placement) {
            placement.cells.forEach(idx => {
                const cell = boardEl.children[idx];
                if (cell) {
                    cell.classList.add('piece', `piece-${placement.pieceId}`);
                }
            });
        }
    }
}

function animateSolutionReveal() {
    let step = 0;
    hintSlider.value = 0;
    hintSlider.disabled = true; // Block interaction during animation
    
    const interval = setInterval(() => {
        step++;
        hintSlider.value = step;
        updateHint();
        if (step >= 9) {
            clearInterval(interval);
            hintSlider.disabled = false;
        }
    }, 200);
}

function resetBoard() {
    selectedMonth = null;
    selectedDay = null;
    selectedWeekday = null;
    currentSolution = null;
    
    updateSelectionUI();
    checkReady();
    clearSolutionViz();
    
    hintSlider.value = 0;
    hintSlider.disabled = true;
    statusText.textContent = "Select a Month, Day, and Weekday";
    statusText.style.color = "var(--text-secondary)";
}

init();
