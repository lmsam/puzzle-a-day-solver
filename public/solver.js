// Core Solver Logic (Web Worker)

// Board Dimensions
const ROWS = 9;
const COLS = 6;
const TOTAL_CELLS = 54;
const EMPTY_INDICES = [43, 44, 48, 49];

/*
Piece Definitions:
Represented as array of [r, c] relative coordinates.
(0,0) is always the first block of the piece (top-left most).
*/
const RAW_PIECES = [
    // a: xxxxx / x (L-shape-ish 6)
    // xxxxx
    // x
    [ [0,0], [0,1], [0,2], [0,3], [0,4], [1,0] ],
    
    // b: xxxx / x (L-shape 5)
    // xxxx
    // x
    [ [0,0], [0,1], [0,2], [0,3], [1,0] ],
    
    // c: xxxx / x / x (Long L 6)
    // xxxx
    // x
    // x
    [ [0,0], [0,1], [0,2], [0,3], [1,0], [2,0] ],
    
    // d: xxxxx / _x (Z-ish 6)
    // xxxxx
    //  x
    [ [0,0], [0,1], [0,2], [0,3], [0,4], [1,1] ],
    
    // e: xxxx / _x / _x (U-ish/Chair 6)
    // xxxx
    //  x
    //  x
    [ [0,0], [0,1], [0,2], [0,3], [1,1], [2,1] ],
    
    // f: xxx / xx (P-shape 5)
    // xxx
    // xx
    [ [0,0], [0,1], [0,2], [1,0], [1,1] ],
    
    // g: xx / _xxx (S-shape 5)  -- Note prompt says: xx / _xxx.
    // xx
    //  xxx
    [ [0,0], [0,1], [1,1], [1,2], [1,3] ],

    // h: xx / _xxx / _x (Weird 6)
    // xx
    //  xxx
    //  x
    [ [0,0], [0,1], [1,1], [1,2], [1,3], [2,1] ],
    
    // i: xxx / _x / xx (Big 'C' 5?) Wait description:
    // xxx
    //  x
    // xx
    [ [0,0], [0,1], [0,2], [1,1], [2,0], [2,1] ]
];

// Precompute all orientations for each piece
let PIECES = [];

function initPieces() {
    PIECES = RAW_PIECES.map((shape, id) => {
        const variations = generateVariations(shape);
        return { id, variations };
    });
    // Sort pieces by size (descending)? Or 'complexity'?
    // Heuristic: Place larger/harder pieces first.
    // Sizes:
    // a: 6
    // b: 5
    // c: 6
    // d: 6
    // e: 6
    // f: 5
    // g: 5
    // h: 6
    // i: 6
    // Let's sort by size desc, then maybe specialized checks. 
    // Actually, just sorting by number of cells helps prune early.
    PIECES.sort((a, b) => b.variations[0].length - a.variations[0].length);
}

// Generate all 8 symmetries
function generateVariations(shape) {
    const unique = new Set();
    const result = [];
    
    // 4 Rotations * 2 Flips
    let current = shape;
    for (let f = 0; f < 2; f++) {
        for (let r = 0; r < 4; r++) {
            // Normalize to top-left (0,0)
            const normalized = normalize(current);
            const sig = signature(normalized);
            
            if (!unique.has(sig)) {
                unique.add(sig);
                result.push(normalized);
            }
            // Rotate 90 deg
            current = rotate(current);
        }
        // Flip
        current = flip(current);
    }
    return result;
}

function rotate(shape) {
    // (r, c) -> (c, -r)
    return shape.map(([r, c]) => [c, -r]);
}

function flip(shape) {
    // (r, c) -> (r, -c)
    return shape.map(([r, c]) => [r, -c]);
}

function normalize(shape) {
    const minR = Math.min(...shape.map(p => p[0]));
    const minC = Math.min(...shape.map(p => p[1]));
    return shape.map(([r, c]) => [r - minR, c - minC]).sort((a,b) => (a[0]-b[0]) || (a[1]-b[1]));
}

function signature(shape) {
    return shape.map(p => `${p[0]},${p[1]}`).join('|');
}

// Solve Logic
self.onmessage = function(e) {
    const { command, blockedIndices } = e.data;
    if (command === 'solve') {
        if (PIECES.length === 0) initPieces();
        
        const board = new Int8Array(TOTAL_CELLS).fill(0);
        
        // Mark unavailable cells
        // EMPTY_INDICES.forEach(idx => board[idx] = 1); // 1 = Occupied/Blocked (FIX: These must be available to fit pieces)
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
    // 1. Find the first empty cell
    let firstEmpty = -1;
    for (let i = 0; i < TOTAL_CELLS; i++) {
        if (board[i] === 0) {
            firstEmpty = i;
            break;
        }
    }
    
    if (firstEmpty === -1) {
        return true; // No empty cells left -> Solved!
    }
    
    const emptyR = Math.floor(firstEmpty / COLS);
    const emptyC = firstEmpty % COLS;
    
    // 2. Try to cover this cell with an unused piece
    for (let pIdx = 0; pIdx < PIECES.length; pIdx++) {
        if (usedPieces[pIdx]) continue;
        
        const piece = PIECES[pIdx];
        
        for (const shape of piece.variations) {
            // Check each block of the shape to see if it can cover 'firstEmpty'
            for (const [br, bc] of shape) {
                const anchorR = emptyR - br;
                const anchorC = emptyC - bc;
                
                if (canPlace(board, shape, anchorR, anchorC)) {
                    // Place
                    const placedIndices = place(board, shape, anchorR, anchorC, 1);
                    usedPieces[pIdx] = true;
                    solution.push({ pieceId: piece.id, cells: placedIndices });
                    
                    if (backtrack(board, usedPieces, solution)) return true;
                    
                    // Backtrack
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
        
        // Bounds check
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
        
        // Occupancy check
        const idx = nr * COLS + nc;
        if (board[idx] !== 0) return false;
    }
    return true;
}

function place(board, shape, r, c, val) {
    const indices = []; // For recording solution
    for (const [dr, dc] of shape) {
        const idx = (r + dr) * COLS + (c + dc);
        board[idx] = val;
        indices.push(idx);
    }
    return indices;
}

initPieces();
