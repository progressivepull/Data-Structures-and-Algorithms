$(document).ready(function() {
        const canvas = document.getElementById('quickSort');
    const ctx = canvas.getContext('2d');
    let values = [];
    let steps = [];
    let currentStep = 0;

    function drawBoxes(arr, highlight = {}) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      arr.forEach((val, i) => {
        const x = i * 60 + 10;
        const y = 50;
        ctx.fillStyle = highlight[i] || '#87CEEB';
        ctx.fillRect(x, y, 50, 50);
        ctx.fillStyle = '#000';
        ctx.fillText(val, x + 20, y + 30);
      });
    }

    function quickSortSteps(arr, left = 0, right = arr.length - 1, depth = 0) {
      if (left >= right) return;

      const pivotIndex = right;
      const pivot = arr[pivotIndex];
      let partitionIndex = left;

      steps.push({
        arr: [...arr],
        explanation: `Choosing pivot ${pivot} at index ${pivotIndex}`,
        highlight: { [pivotIndex]: '#FFD700' }
      });

      for (let i = left; i < right; i++) {
        if (arr[i] < pivot) {
          [arr[i], arr[partitionIndex]] = [arr[partitionIndex], arr[i]];
          steps.push({
            arr: [...arr],
            explanation: `Swapping ${arr[partitionIndex]} and ${arr[i]} because ${arr[i]} < pivot ${pivot}`,
            highlight: { [i]: '#90EE90', [partitionIndex]: '#90EE90' }
          });
          partitionIndex++;
        }
      }

      [arr[partitionIndex], arr[pivotIndex]] = [arr[pivotIndex], arr[partitionIndex]];
      steps.push({
        arr: [...arr],
        explanation: `Placing pivot ${pivot} at correct position`,
        highlight: { [partitionIndex]: '#FFD700' }
      });

      quickSortSteps(arr, left, partitionIndex - 1, depth + 1);
      quickSortSteps(arr, partitionIndex + 1, right, depth + 1);
    }

     $("#startSort").click(function() {
      const input = document.getElementById('initialValues').value;
      values = input.split(',').map(Number);
      steps = [];
      currentStep = 0;
      quickSortSteps([...values]);
      drawBoxes(values);
      document.getElementById('explanation').innerText = 'Click "Next Step" to begin.';
    });

    $("#nextStep").click(function() {
    
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        drawBoxes(step.arr, step.highlight);
        document.getElementById('explanation').innerText = step.explanation;
        currentStep++;
      } else {
        document.getElementById('explanation').innerText = 'Sorting complete!';
      }

    });



});