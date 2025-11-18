$(document).ready(function() {
    // Canvas setup
    const canvas = document.getElementById('huffman-canvas');
    const ctx = canvas.getContext('2d');
    const statusMessage = $('#status-message');
    const pqDisplay = $('#priority-queue-display');
    const setupBtn = $('#setup-btn');
    const stepBtn = $('#step-btn');
    const resetBtn = $('#reset-btn');
    const inputStringField = $('#input-string');

    let frequencyMap = {};
    let priorityQueue = [];
    let treeRoot = null;
    let algorithmSteps = [];
    let currentStepIndex = -1;

    // --- Priority Queue (Min Heap) Implementation ---
    // A simple min-heap for the Huffman algorithm
    class Node {
        constructor(char, freq, left = null, right = null) {
            this.char = char;
            this.freq = freq;
            this.left = left;
            this.right = right;
        }
    }

    function insertPQ(node) {
        priorityQueue.push(node);
        priorityQueue.sort((a, b) => a.freq - b.freq); // Simple sort to maintain min-heap order
    }

    function extractMin() {
        return priorityQueue.shift();
    }

    function displayPQ() {
        pqDisplay.empty();
        priorityQueue.forEach(item => {
            const itemHtml = `<div class="queue-item">${item.char ? `'${item.char}'` : 'Internal Node'} (Freq: ${item.freq})</div>`;
            pqDisplay.append(itemHtml);
        });
    }

    // --- Algorithm Logic ---
    function setupFrequencies() {
        const input = inputStringField.val();
        if (!input) {
            statusMessage.removeClass().addClass('alert alert-warning').text('Please enter a string.');
            return;
        }
        
        frequencyMap = {};
        for (const char of input) {
            frequencyMap[char] = (frequencyMap[char] || 0) + 1;
        }

        priorityQueue = [];
        for (const char in frequencyMap) {
            insertPQ(new Node(char, frequencyMap[char]));
        }

        displayPQ();
        statusMessage.removeClass().addClass('alert alert-info').text('Frequencies calculated. Ready to step through the algorithm.');
        setupBtn.prop('disabled', true);
        stepBtn.prop('disabled', false);
        resetBtn.prop('disabled', false);
        inputStringField.prop('disabled', true);
        currentStepIndex = -1;
        algorithmSteps = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    }

    function stepAlgorithm() {
        if (priorityQueue.length < 2) {
            treeRoot = priorityQueue[0];
            stepBtn.prop('disabled', true);
            statusMessage.removeClass().addClass('alert alert-success').text('Algorithm complete. Final Huffman tree built.');
            drawTree(treeRoot);
            displayPQ();
            return;
        }

        // Greedy step: Extract two minimum frequency nodes
        const left = extractMin();
        const right = extractMin();
        const combinedFreq = left.freq + right.freq;
        const newNode = new Node(null, combinedFreq, left, right);

        // Insert new node back into the queue
        insertPQ(newNode);

        // Log step
        const stepMsg = `Combined nodes with frequencies ${left.freq} and ${right.freq} into a new node with frequency ${combinedFreq}.`;
        algorithmSteps.push(stepMsg);
        statusMessage.removeClass().addClass('alert alert-info').text(`Step ${algorithmSteps.length}: ${stepMsg}`);
        
        // Visualization
        drawTree(newNode); // Draw the current resulting tree structure (though it keeps changing until final root is found)
        displayPQ();
    }

    // --- Visualization (Canvas) Logic ---

    // Function to calculate height of the tree for drawing
    function getTreeHeight(node) {
        if (!node) return 0;
        return 1 + Math.max(getTreeHeight(node.left), getTreeHeight(node.right));
    }

    // Recursive function to draw the tree on canvas
    function drawTree(root) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!root) return;

        const height = getTreeHeight(root);
        // Adjust vertical spacing based on height to fit
        const verticalSpacing = canvas.height / (height + 1); 
        
        function drawNode(node, x, y, level, parentX, parentY) {
            if (!node) return;

            // Draw line to parent
            if (parentX !== undefined) {
                ctx.beginPath();
                ctx.moveTo(parentX, parentY + 15); // Offset y by half node size
                ctx.lineTo(x, y + 15);
                ctx.stroke();
            }

            // Draw node circle/rectangle
            ctx.fillStyle = node.char ? '#ff9800' : '#4CAF50'; // Different colors for leaf/internal nodes
            ctx.beginPath();
            ctx.arc(x, y + 15, 15, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const label = node.char ? `${node.char}:${node.freq}` : `${node.freq}`;
            ctx.fillText(label, x, y + 15);

            // Calculate child positions (simple binary tree layout)
            const horizontalSpacing = canvas.width / Math.pow(2, level + 1);
            drawNode(node.left, x - horizontalSpacing, y + verticalSpacing, level + 1, x, y);
            drawNode(node.right, x + horizontalSpacing, y + verticalSpacing, level + 1, x, y);
        }

        // Start drawing from the root
        drawNode(root, canvas.width / 2, 20, 0);
    }
    
    // --- Event Handlers ---
    setupBtn.on('click', setupFrequencies);
    stepBtn.on('click', stepAlgorithm);
    resetBtn.on('click', () => {
        location.reload(); // Simple way to reset everything
    });
});
