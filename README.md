# Puzzle-A-Day Solver

A web-based solver for the "Puzzle-A-Day" calendar puzzle. This application solves the daily puzzle where you must fit 9 distinct pieces into a board to cover everything except the current Month, Day, and Day of the Week.

![Puzzle Solver Demo](https://placehold.co/600x400?text=Puzzle+Solver+Demo) _(Add a real screenshot here)_

## Features

- **Interactive 6x9 Grid**: Select any Month, Day, and Weekday.
- **Fast Solver**: Uses a backtracking algorithm with "First Empty Cell" optimization to solve even complex dates in milliseconds.
- **Visualization**: Distinct colors for each of the 9 pieces.
- **Progressive Reveal**: Use the hint slider to reveal the solution piece by piece.
- **Rich Aesthetics**: Modern, dark-themed UI with glassmorphism effects.

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

## How it Works

The puzzle board consists of 54 cells.

- **Input**: You select 3 cells (Month, Day, Weekday).
- **Goal**: Cover the remaining 51 cells using 9 specific polyomino pieces.
- **Algorithm**: The solver tries to place pieces such that they cover the _first available empty cell_ on the board. This heuristic drastically reduces the search space compared to random placement.

## License

MIT License
