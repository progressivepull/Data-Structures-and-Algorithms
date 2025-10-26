$( document ).ready(function() {
    const canvas = document.getElementById('treeCanvas');
    const ctx = canvas.getContext('2d');
    const nodeWidth = 50;
    const nodeHeight = 40;
    const levelHeight = 80;

    function drawNode(x, y, value) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - nodeWidth / 2, y - nodeHeight / 2, nodeWidth, nodeHeight);
      ctx.strokeRect(x - nodeWidth / 2, y - nodeHeight / 2, nodeWidth, nodeHeight);
      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value, x, y);
    }

    function drawLine(x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    function drawTree(array) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const positions = [];

      for (let i = 0; i < array.length; i++) {
        const level = Math.floor(Math.log2(i + 1));
        const maxNodes = 2 ** level;
        const indexInLevel = i - (maxNodes - 1);
        const spacing = canvas.width / (maxNodes + 1);
        const x = spacing * (indexInLevel + 1);
        const y = levelHeight * (level + 1);
        positions[i] = { x, y };

        drawNode(x, y, array[i]);

        const parentIndex = Math.floor((i - 1) / 2);
        if (i > 0) {
          drawLine(positions[parentIndex].x, positions[parentIndex].y + nodeHeight / 2, x, y - nodeHeight / 2);
        }
      }
    }

    document.getElementById('startBtn').addEventListener('click', () => {
      const input = document.getElementById('inputValues').value;
      const array = input.split(',').map(v => v.trim()).filter(v => v !== '').map(Number);
      drawTree(array);
    });

    // Initial draw
    const defaultArray = document.getElementById('inputValues').value.split(',').map(v => v.trim()).map(Number);
    drawTree(defaultArray);
});
