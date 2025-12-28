# Puzzle-A-Day Solver

A web-based solver for the "Puzzle-A-Day" calendar puzzle. This application solves the daily puzzle where you must fit 9 distinct pieces into a board to cover everything except the current Month, Day, and Day of the Week.

![Puzzle Solver Demo](https://placehold.co/600x400?text=Puzzle+Solver+Demo) _(Add a real screenshot here)_

## Features

- **Cozy & Playful Interface**: Inspired by "Animal Crossing", featuring rounded corners, creamy backgrounds, and soothing pastel colors.
- **Interactive Inventory**: Instead of a simple slider, you get a "backpack" of pieces. Click any piece to toggle its visibility on the board!
- **Fast Solver**: Uses a backtracking algorithm with optimization to solve in milliseconds.
- **Pure Frontend**: Works offline or on static hosting without a backend.
- **Responsive**: Adapts to different screen sizes.

## Tech Stack

- **Backend**: Node.js + Express (serving static files)
- **Frontend**: Vanilla JavaScript + CSS3 + HTML5
- **Algorithm**: Recursive Backtracking (Depth-First Search) running in a Web Worker.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/puzzle-a-day-solver.git
   cd puzzle-a-day-solver
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   `http://localhost:3000`

### Pure Frontend Version

A standalone version that requires no backend is available in the `pure-frontend` directory.

- You can simply open `pure-frontend/index.html` in your browser (note: simple local file opening blocks Web Workers in some browsers due to CORS; use a simple local server like Python's `http.server` or VS Code Live Server).
- This version is ready for static hosting services like GitHub Pages or Vercel.

## How it Works

The puzzle board consists of 54 cells.

- **Input**: You select 3 cells (Month, Day, Weekday).
- **Goal**: Cover the remaining 51 cells using 9 specific polyomino pieces.
- **Algorithm**: The solver tries to place pieces such that they cover the _first available empty cell_ on the board. This heuristic drastically reduces the search space compared to random placement.

## License

MIT License
