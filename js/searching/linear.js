$(document).ready(function () {

    const canvas = document.getElementById('searchCanvas');
    const ctx = canvas.getContext('2d');
    const explanation = document.getElementById('explanation');
    
    let values = [];
    let target = null;
    let index = 0;
    let searchDone = false;

    function drawBoxes(highlightIndex = -1) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        values.forEach((val, i) => {
            ctx.fillStyle = (i === highlightIndex) ? 'orange' : 'lightblue';
            ctx.fillRect(50 + i * 80, 50, 60, 60);

            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.fillText(val, 70 + i * 80, 85);
        });
    }

    $("#setValues").click(function () {
        const raw = $("#valueInput").val().trim();
        const t = $("#targetInput").val().trim();

        if (!raw || isNaN(parseInt(t))) {
            explanation.textContent = "Please enter valid values and target.";
            return;
        }

        values = raw.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
        target = parseInt(t);
        index = 0;
        searchDone = false;

        explanation.textContent = `Target set to ${target}. Click "Next Step".`;
        drawBoxes();
    });

    $("#nextStep").click(function () {
        if (searchDone) return;

        if (index >= values.length) {
            explanation.textContent = `Target ${target} not found in the list.`;
            drawBoxes();
            searchDone = true;
            return;
        }

        explanation.textContent = `Checking index ${index}: is ${values[index]} == ${target}?`;
        drawBoxes(index);

        if (values[index] === target) {
            explanation.textContent = `✅ Found! ${values[index]} equals target ${target}.`;
            searchDone = true;
        } else {
            index++;
        }
    });

    // Optional default input
    $("#valueInput").val("7,3,10,4,2");
    $("#targetInput").val("10");
});
