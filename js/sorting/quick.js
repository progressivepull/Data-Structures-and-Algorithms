$(document).ready(function() {
        const canvas = document.getElementById('quickSort');
    const ctx = canvas.getContext('2d');
    let values = [];
    let steps = [];
    let currentStep = 0;
    let previousValues = [];

    function drawArrow(x, y, label) {
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 10, y - 15);
      ctx.lineTo(x + 10, y - 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillText(label, x - 15, y - 25);
    }

    function drawBoxes(currentArr, previousArr = [], { low, high, pivot, highlight = {} }) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Previous State
      ctx.fillStyle = '#000';
      ctx.fillText('Previous State', 10, 20);
      const prevY = 50;
      previousArr.forEach((val, i) => {
        const x = i * 60 + 10;
        ctx.fillStyle = '#D3D3D3'; // Light gray for previous state
        ctx.fillRect(x, prevY, 50, 50);
        ctx.fillStyle = '#000';
        ctx.fillText(val, x + 20, prevY + 30);
      });

      // Draw Current State
      ctx.fillText('Current State', 10, 140);
      const currentY = 260;
      currentArr.forEach((val, i) => {
        const x = i * 60 + 10;
        ctx.fillStyle = highlight[i] || '#87CEEB';
        ctx.fillRect(x, currentY, 50, 50);
        ctx.fillStyle = '#000';
        ctx.fillText(val, x + 20, currentY + 30);
      });

      // Adjust arrow positions to point to the current state
      if (low !== undefined) drawArrow(low * 60 + 35, currentY - 10, 'Low');
      if (high !== undefined) drawArrow(high * 60 + 35, currentY - 50, 'High');
      if (pivot !== undefined) drawArrow(pivot * 60 + 35, currentY + 65, 'Pivot');
    }

    function quickSortSteps(arr, left = 0, right = arr.length - 1) {
      if (left >= right) return;

      const pivotIndex = right;
      const pivotValue = arr[pivotIndex];
      let partitionIndex = left;

      steps.push({
        arr: [...arr],
        low: left,
        high: right,
        pivot: pivotIndex,
        explanation: `Choosing pivot ${pivotValue}`,
        highlight: { [pivotIndex]: '#FFD700' }
      });

      for (let i = left; i < right; i++) {
        steps.push({
          arr: [...arr],
          low: i,
          high: partitionIndex,
          pivot: pivotIndex,
          explanation: `Comparing ${arr[i]} with pivot ${pivotValue}`,
          highlight: { [i]: '#FFA07A', [pivotIndex]: '#FFD700' }
        });
        if (arr[i] < pivotValue) {
          [arr[i], arr[partitionIndex]] = [arr[partitionIndex], arr[i]];
          steps.push({
            arr: [...arr],
            low: i,
            high: partitionIndex,
            pivot: pivotIndex,
            explanation: `Swapping ${arr[i]} and ${arr[partitionIndex]}`,
            highlight: { [i]: '#90EE90', [partitionIndex]: '#90EE90' }
          });
          partitionIndex++;
        }
      }

      [arr[partitionIndex], arr[pivotIndex]] = [arr[pivotIndex], arr[partitionIndex]];
      steps.push({
        arr: [...arr],
        low: left,
        high: right,
        pivot: partitionIndex,
        explanation: `Placing pivot ${pivotValue} at its final position`,
        highlight: { [partitionIndex]: '#FFD700' }
      });

      quickSortSteps(arr, left, partitionIndex - 1);
      quickSortSteps(arr, partitionIndex + 1, right);
    }

     $("#startSort").click(function() {
      const input = document.getElementById('initialValues').value;
      values = input.split(',').map(Number);
      steps = [];
      currentStep = 0;
      previousValues = [];
      quickSortSteps([...values]);
      drawBoxes(values, [], {});
      document.getElementById('explanation').innerText = 'Click "Next Step" to begin.';
    });

    $("#nextStep").click(function() {
      if (currentStep < steps.length) {
        previousValues = (currentStep === 0) ? [...values] : [...steps[currentStep - 1].arr];
        const step = steps[currentStep];
        drawBoxes(step.arr, previousValues, step);
        document.getElementById('explanation').innerText = step.explanation;
        currentStep++;
      } else {
        document.getElementById('explanation').innerText = 'Sorting complete!';
      }
    });



});