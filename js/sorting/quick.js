$(document).ready(function() {
        const canvas = document.getElementById('quickSort');
    const ctx = canvas.getContext('2d');
    let values = [];
    let steps = [];
    let currentStep = 0;

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

    function drawBoxes(arr, { low, high, pivot, highlight = {} }) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      arr.forEach((val, i) => {
        const x = i * 60 + 10;
        const y = 100;
        ctx.fillStyle = highlight[i] || '#87CEEB';
        ctx.fillRect(x, y, 50, 50);
        ctx.fillStyle = '#000';
        ctx.fillText(val, x + 20, y + 30);
      });

      if (low !== undefined) drawArrow(low * 60 + 35, 90, 'Low');
      if (high !== undefined) drawArrow(high * 60 + 35, 50, 'High');
      if (pivot !== undefined) drawArrow(pivot * 60 + 35, 165, 'Pivot');
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
      quickSortSteps([...values]);
      drawBoxes(values, {});
      document.getElementById('explanation').innerText = 'Click "Next Step" to begin.';
    });

    $("#nextStep").click(function() {
    
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        drawBoxes(step.arr, step);
        document.getElementById('explanation').innerText = step.explanation;
        currentStep++;
      } else {
        document.getElementById('explanation').innerText = 'Sorting complete!';
      }

    });



});