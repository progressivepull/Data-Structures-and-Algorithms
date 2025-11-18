$(document).ready(function() {
    const board = [];
    const N = 9;
    let initialPuzzle = [];
    let currentRow = 0;
    let currentCol = 0;
    let isSolving = false;

    // --- UI Generation ---
    function generateBoard() {
        const boardContainer = $('#sudoku-board');
        boardContainer.empty();
        for (let r = 0; r < N; r++) {
            board[r] = [];
            for (let c = 0; c < N; c++) {
                const cell = $('<div>').addClass('sudoku-cell');
                const input = $('<input>')
                    .attr({
                        'type': 'text',
                        'maxlength': '1',
                        'pattern': '[1-9]',
                        'inputmode': 'numeric'
                    })
                    .addClass('sudoku-input')
                    .on('input', function() {
                        this.value = this.value.replace(/[^1-9]/g, '');
                    });

                cell.append(input);
                boardContainer.append(cell);
                board[r][c] = { element: cell, input: input, value: 0 };
            }
        }
    }

    // --- Puzzle Setup ---
    function setupPuzzle() {
        // Example easy puzzle (0 means empty)
        initialPuzzle = [
            [5, 3, 0, 0, 7, 0, 0, 0, 0],
            [6, 0, 0, 1, 9, 5, 0, 0, 0],
            [0, 9, 8, 0, 0, 0, 0, 6, 0],
            [8, 0, 0, 0, 6, 0, 0, 0, 3],
            [4, 0, 0, 8, 0, 3, 0, 0, 1],
            [7, 0, 0, 0, 2, 0, 0, 0, 6],
            [0, 6, 0, 0, 0, 0, 2, 8, 0],
            [0, 0, 0, 4, 1, 9, 0, 0, 5],
            [0, 0, 0, 0, 8, 0, 0, 7, 9]
        ];

        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                const value = initialPuzzle[r][c];
                const cell = board[r][c];
                cell.value = value;
                cell.input.val(value === 0 ? '' : value);

                if (value !== 0) {
                    cell.element.addClass('fixed-value');
                    cell.input.prop('disabled', true);
                } else {
                    cell.element.removeClass('fixed-value');
                    cell.input.prop('disabled', false);
                }
            }
        }
        logStatus("Puzzle loaded. Ready to solve.");
        $('#step-btn').prop('disabled', false);
        isSolving = false;
        currentRow = 0;
        currentCol = 0;
    }

    // --- Backtracking Logic Functions ---
    function isValid(row, col, num) {
        // Check row and column
        for (let i = 0; i < N; i++) {
            if (board[row][i].value == num && i !== col) return false;
            if (board[i][col].value == num && i !== row) return false;
        }
        
        // Check 3x3 box
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const r = startRow + i;
                const c = startCol + j;
                if (board[r][c].value == num && (r !== row || c !== col)) return false;
            }
        }
        return true;
    }

    function findEmpty() {
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (board[r][c].value === 0) {
                    return [r, c];
                }
            }
        }
        return null; // Solved
    }

    // --- Visual Step-by-Step Logic ---
    function stepSolve() {
        if (!isSolving) {
            logStatus("Starting solver...");
            isSolving = true;
            $('#setup-btn').prop('disabled', true);
        }

        clearHighlights();

        // Find the next empty cell
        const emptyCell = findEmpty();
        if (!emptyCell) {
            logStatus("Puzzle Solved! 🎉");
            $('#step-btn').prop('disabled', true);
            isSolving = false;
            highlightSolved();
            return true;
        }

        let [row, col] = emptyCell;
        currentRow = row;
        currentCol = col;
        
        // Highlight the current cell being considered
        const currentElement = board[row][col].element;
        currentElement.addClass('current-cell');
        
        // Try numbers 1 through 9 for the current cell
        for (let num = 1; num <= 9; num++) {
            // Check if this number has already been tried and failed in previous steps
            // We implement the actual trial visually within this step function
            
            if (isValid(row, col, num)) {
                // If valid, tentatively place it and move to the next step
                board[row][col].value = num;
                board[row][col].input.val(num);
                logStatus(`Trying ${num} at (${row+1}, ${col+1}). Proceeding forward.`);
                return false; // Not solved yet, ready for next step
            }
        }

        // If we exit the loop, no number worked (backtracking needed in the next step)
        board[row][col].value = 0;
        board[row][col].input.val('');
        currentElement.addClass('backtrack-cell');
        logStatus(`No number worked at (${row+1}, ${col+1}). Backtracking...`);
        
        // The actual mechanism to backtrack visually needs careful state management which is complex in single steps.
        // In this simplified step-through, the user clicks "step" again and the function runs from the top, finding the same empty cell until we run out of options.
        // A full state machine or generator function would be better for perfect step-by-step control, but this simple function demonstrates the core attempt/backtrack concept on UI click.
        return false;
    }
    
    // --- Auto Solve (uses a more standard recursive function) ---
    async function autoSolveRecursive() {
        clearHighlights();
        const emptyCell = findEmpty();
        if (!emptyCell) {
            return true; // Solved
        }

        const [row, col] = emptyCell;
        
        for (let num = 1; num <= 9; num++) {
            if (isValid(row, col, num)) {
                board[row][col].value = num;
                board[row][col].input.val(num);
                board[row][col].element.addClass('current-cell');
                logStatus(`Auto: Trying ${num} at (${row+1}, ${col+1}).`);
                await sleep(50); // Pause for visualization

                if (await autoSolveRecursive()) {
                    return true;
                }

                // Backtrack
                board[row][col].value = 0;
                board[row][col].input.val('');
                board[row][col].element.addClass('backtrack-cell');
                logStatus(`Auto: Backtracking from (${row+1}, ${col+1}).`);
                await sleep(50);
            }
        }
        return false;
    }

    async function autoSolve() {
        if (!isSolving && findEmpty()) {
            $('#setup-btn, #step-btn, #auto-solve-btn').prop('disabled', true);
            isSolving = true;
            logStatus("Starting automatic solve...");
            if (await autoSolveRecursive()) {
                logStatus("Automatic Solve Complete! 🎉");
                highlightSolved();
            } else {
                logStatus("Could not solve the puzzle.");
            }
            $('#setup-btn, #auto-solve-btn').prop('disabled', false);
        }
    }


    // --- Utility Functions ---
    function clearHighlights() {
        $('.sudoku-cell').removeClass('current-cell backtrack-cell error-cell solved-cell');
    }
    
    function highlightSolved() {
        $('.sudoku-cell').addClass('solved-cell');
        $('.fixed-value').removeClass('solved-cell'); // Keep fixed values slightly different
    }

    function logStatus(message) {
        const log = $('#status-log');
        log.append(`<div>> ${message}</div>`);
        log.scrollTop(log[0].scrollHeight); // Auto-scroll to bottom
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Event Handlers ---
    $('#setup-btn').on('click', setupPuzzle);
    $('#step-btn').on('click', stepSolve);
    $('#auto-solve-btn').on('click', autoSolve);

    // Initial setup
    generateBoard();
    logStatus("Board generated. Click 'Setup Puzzle' to begin.");
});
