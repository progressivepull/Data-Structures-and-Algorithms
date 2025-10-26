$( document ).ready(function() {

    const treeCanvas = document.getElementById('treeCanvas');
    const treecCtx = treeCanvas.getContext('2d');
    const nodeWidth = 50;
    const nodeHeight = 40;
    const levelHeight = 80;

    function drawNode(x, y, value) {
      treecCtx.fillStyle = '#fff';
      treecCtx.fillRect(x - nodeWidth / 2, y - nodeHeight / 2, nodeWidth, nodeHeight);
      treecCtx.strokeRect(x - nodeWidth / 2, y - nodeHeight / 2, nodeWidth, nodeHeight);
      treecCtx.fillStyle = '#000';
      treecCtx.font = '20px Arial';
      treecCtx.textAlign = 'center';
      treecCtx.textBaseline = 'middle';
      treecCtx.fillText(value, x, y);
    }

    function drawLine(x1, y1, x2, y2) {
      treecCtx.beginPath();
      treecCtx.moveTo(x1, y1);
      treecCtx.lineTo(x2, y2);
      treecCtx.stroke();
    }

    function drawTree(array) {
      treecCtx.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
      const positions = [];

      for (let i = 0; i < array.length; i++) {
        const level = Math.floor(Math.log2(i + 1));
        const maxNodes = 2 ** level;
        const indexInLevel = i - (maxNodes - 1);
        const spacing = treeCanvas.width / (maxNodes + 1);
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

const canvas = document.getElementById('heapSort');
const ctx = canvas.getContext('2d');
const explanation = document.getElementById('explanation');
const nextBtn = document.getElementById('nextBtn');

let values = [];
let steps = [];
let currentStep = 0;

// --- Visualization settings ---
const boxWidth = 60;
const boxHeight = 50;

// Draw array as boxes on the canvas
function drawArray(arr, highlightIndex = -1, sortedBoundary = arr.length) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const startX = (canvas.width - arr.length * (boxWidth + 10)) / 2;
  arr.forEach((val, i) => {
    const x = startX + i * (boxWidth + 10);
    const y = 180;
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, 10);
    ctx.fillStyle = i >= sortedBoundary ? "#a3e635" : (i === highlightIndex ? "#60a5fa" : "#f3f4f6");
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(val, x + boxWidth / 2, y + boxHeight / 2);
  });
}

// --- Heapify and heap sort simulation with explanation steps ---
function heapSortSteps(arr) {
  const tempSteps = [];
  const n = arr.length;

  function heapify(size, i) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < size && arr[left] > arr[largest]) largest = left;
    if (right < size && arr[right] > arr[largest]) largest = right;

    if (largest !== i) {
      tempSteps.push({
        array: [...arr],
        explanation: `Swap ${arr[i]} (parent) with ${arr[largest]} (child) to maintain the heap.`,
        highlight: i
      });
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      heapify(size, largest);
    }
  }

  // Build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    tempSteps.push({
      array: [...arr],
      explanation: `Heapify node at index ${i}. Making sure its children follow the heap rule.`,
      highlight: i
    });
    heapify(n, i);
  }

  // Extract elements from heap
  for (let i = n - 1; i > 0; i--) {
    tempSteps.push({
      array: [...arr],
      explanation: `Move max value ${arr[0]} to end of array.`,
      highlight: 0
    });
    [arr[0], arr[i]] = [arr[i], arr[0]];

    heapify(i, 0);
    tempSteps.push({
      array: [...arr],
      explanation: `${arr[i]} is now in its final sorted position.`,
      highlight: i
    });
  }

  tempSteps.push({
    array: [...arr],
    explanation: "All elements are sorted — the heap sort is complete!",
    highlight: -1
  });

  return tempSteps;
}

// --- Controls ---
document.getElementById('startBtn').addEventListener('click', () => {
  const input = document.getElementById('inputValues').value.trim();
  if (!input) return;
  values = input.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
  steps = heapSortSteps([...values]);
  currentStep = 0;
  drawArray(steps[currentStep].array, steps[currentStep].highlight);
  explanation.innerHTML = steps[currentStep].explanation;
  nextBtn.disabled = false;
  drawTree(values);
});

nextBtn.addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    currentStep++;
    const step = steps[currentStep];
    drawArray(step.array, step.highlight);
    explanation.innerHTML = step.explanation;
    drawTree(step.array); // <-- Update tree with current array state
  } else {
    nextBtn.disabled = true;
  }

});

// Helper for rounded rectangles
CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
  this.beginPath();
  this.moveTo(x + radius, y);
  this.lineTo(x + width - radius, y);
  this.quadraticCurveTo(x + width, y, x + width, y + radius);
  this.lineTo(x + width, y + height - radius);
  this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  this.lineTo(x + radius, y + height);
  this.quadraticCurveTo(x, y + height, x, y + height - radius);
  this.lineTo(x, y + radius);
  this.quadraticCurveTo(x, y, x + radius, y);
  this.closePath();
};

});