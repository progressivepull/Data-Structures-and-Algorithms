$( document ).ready(function() {

    const canvas = document.getElementById('bubbleSort');
    const ctx = canvas.getContext('2d');
    const explanation = document.getElementById('explanation');
    const input = document.getElementById('valueInput');

    let values = [];
    let i = 0, j = 0;
    let sortingDone = false;

    function drawBoxes(comparing = []) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      values.forEach((val, index) => {
        ctx.fillStyle = comparing.includes(index) ? 'red' : 'lightblue';
        ctx.fillRect(50 + index * 100, 30, 50, 50);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(val, 65 + index * 100, 60);
      });
    }

    $("#setValues").click(function() {
    
      const raw = input.value.trim();
      if (!raw) return;
      values = raw.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
      i = 0;
      j = 0;
      sortingDone = false;
      explanation.textContent = "Values set. Click 'Next Step' to begin sorting.";
      drawBoxes();
     });

     $("#nextStep").click(function() {
      if (sortingDone) {
        explanation.textContent = "Sorting complete!";
        return;
      }

      if (i < values.length) {
        if (j < values.length - i - 1) {
          explanation.textContent = `Comparing ${values[j]} and ${values[j + 1]}`;
          drawBoxes([j, j + 1]); // Highlight comparing boxes
          if (values[j] > values[j + 1]) {
            explanation.textContent += ` → Swap needed!`;
            setTimeout(() => {
              [values[j], values[j + 1]] = [values[j + 1], values[j]];
              drawBoxes();
              j++;
            }, 500);
          } else {
            explanation.textContent += ` → No swap.`;
            j++;
            setTimeout(() => {
              drawBoxes();
            }, 500);
          }
        } else {
          j = 0;
          i++;
          explanation.textContent = `Pass ${i} complete.`;
          drawBoxes();
        }
      } else {
        sortingDone = true;
        explanation.textContent = "Sorting complete!";
        drawBoxes();
      }
     });

    // Optional: initialize with default values
    input.value = "5,3,8,4,2";
    setValues();


    });