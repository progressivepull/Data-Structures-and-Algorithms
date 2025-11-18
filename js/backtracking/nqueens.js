$(document).ready(function() {
    const canvas = $('#nQueensCanvas')[0];
    const ctx = canvas.getContext('2d');
    const statusAlert = $('#statusAlert');
    const setupBtn = $('#setupBtn');
    const stepBtn = $('#stepBtn');
    const boardSizeInput = $('#boardSize');

    let N;
    let board = []; // Stores column index of queen in each row
    let currentRow;
    let algorithmSteps = [];
    let currentStepIndex = 0;
    let isSolved = false;

    setupBtn.on('click', setupBoard);
    stepBtn.on('click', stepAlgorithm);

    function setupBoard() {
        N = parseInt(boardSizeInput.val());
        if (isNaN(N) || N < 1 || N > 15) {
            showAlert("Please enter a valid board size between 1 and 15.", "danger");
            return;
        }

        board = new Array(N).fill(-1);
        currentRow = 0;
        algorithmSteps = [];
        currentStepIndex = 0;
        isSolved = false;
        stepBtn.prop('disabled', false);
        showAlert(`Board size set to ${N}. Click 'Step Algorithm' to start.`, "info");
        
        // Generate all steps for manual stepping
        generateAlgorithmSteps();
        drawBoard();
    }

    function generateAlgorithmSteps() {
        // This function preemptively runs the algorithm to record every state change.
        function solve(row) {
            if (row === N) {
                // Found a solution
                algorithmSteps.push({ board: [...board], status: 'Solution Found' });
                return;
            }

            for (let col = 0; col < N; col++) {
                if (isSafe(row, col)) {
                    board[row] = col;
                    // Record placing a queen (move forward)
                    algorithmSteps.push({ board: [...board], status: `Placed queen in row ${row}, col ${col}` });
                    
                    solve(row + 1);

                    // Record backtracking (move backward)
                    board[row] = -1;
                    algorithmSteps.push({ board: [...board], status: `Backtracking from row ${row}, col ${col}` });
                }
            }
        }
        solve(0);
        algorithmSteps.push({ board: [...board], status: 'Algorithm finished (all solutions found or no solution exists)' });
    }

    function isSafe(row, col) {
        for (let i = 0; i < row; i++) {
            // Check column conflict (board[i] == col)
            // Check diagonal conflict (abs(board[i] - col) == abs(i - row))
            if (board[i] === col || Math.abs(board[i] - col) === Math.abs(i - row)) {
                return false;
            }
        }
        return true;
    }

    function stepAlgorithm() {
        if (currentStepIndex < algorithmSteps.length) {
            const step = algorithmSteps[currentStepIndex];
            board = step.board;
            showAlert(step.status, "info");
            drawBoard();
            currentStepIndex++;

            if (currentStepIndex >= algorithmSteps.length) {
                stepBtn.prop('disabled', true);
                showAlert("Algorithm finished. All steps completed.", "success");
            }
        }
    }

    function drawBoard() {
        const size = canvas.width;
        const cellSize = size / N;
        ctx.clearRect(0, 0, size, size);

        // Draw cells (chessboard pattern)
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                ctx.fillStyle = (i + j) % 2 === 0 ? '#ffce9e' : '#d18b47'; // Chess colors
                ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
            }
        }

        // Draw queens
        for (let i = 0; i < N; i++) {
            if (board[i] !== -1) {
                const col = board[i];
                ctx.fillStyle = '#000000';
                ctx.font = `${cellSize * 0.7}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // A simple 'Q' to represent the queen
                ctx.fillText('♕', col * cellSize + cellSize / 2, i * cellSize + cellSize / 2);
            }
        }

        // Draw grid lines
        ctx.strokeStyle = '#000000';
        for (let i = 0; i <= N; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(size, i * cellSize);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, size);
            ctx.stroke();
        }
    }

    function showAlert(message, type) {
        statusAlert.removeClass('alert-info alert-success alert-danger').addClass(`alert-${type}`).text(message);
    }
});
