$(document).ready(function() {
    const canvas = $('#activityCanvas')[0];
    const ctx = canvas.getContext('2d');
    const statusArea = $('#statusArea');
    const setupButton = $('#setupButton');
    const stepButton = $('#stepButton');
    const resetButton = $('#resetButton');

    let activities = [];
    let selectedActivities = [];
    let currentIndex = 0;
    let maxFinishTime = 0;

    setupButton.on('click', setupAlgorithm);
    stepButton.on('click', stepAlgorithm);
    resetButton.on('click', resetAlgorithm);

    function setupAlgorithm() {
        const startInput = $('#startTimeInput').val().split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        const finishInput = $('#finishTimeInput').val().split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

        if (startInput.length !== finishInput.length || startInput.length === 0) {
            statusArea.text('Error: Start and finish times must have the same number of valid entries.');
            statusArea.removeClass('alert-info alert-success').addClass('alert-danger');
            return;
        }

        activities = startInput.map((start, i) => ({
            id: i + 1,
            start: start,
            finish: finishInput[i],
            selected: false,
            rejected: false
        }));

        // Sort by finish time (Crucial for the greedy approach)
        activities.sort((a, b) => a.finish - b.finish);
        
        maxFinishTime = Math.max(...activities.map(a => a.finish));
        selectedActivities = [];
        currentIndex = 0;
        
        statusArea.text(`Setup complete. ${activities.length} activities loaded and sorted by finish time.`);
        statusArea.removeClass('alert-danger').addClass('alert-info');
        stepButton.prop('disabled', false);
        resetButton.prop('disabled', false);
        setupButton.prop('disabled', true);
        
        drawActivities();
    }

    function stepAlgorithm() {
        if (currentIndex >= activities.length) {
            statusArea.text('Algorithm finished. All activities processed.');
            stepButton.prop('disabled', true);
            return;
        }

        let currentActivity = activities[currentIndex];
        let lastFinishTime = selectedActivities.length > 0 ? selectedActivities[selectedActivities.length - 1].finish : -1;

        if (currentActivity.start >= lastFinishTime) {
            // Select the activity: compatible
            currentActivity.selected = true;
            selectedActivities.push(currentActivity);
            statusArea.text(`Step ${currentIndex + 1}: Activity ${currentActivity.id} selected (starts at ${currentActivity.start}, finishes at ${currentActivity.finish}). Compatible with previous selections.`);
            statusArea.removeClass('alert-danger').addClass('alert-success');
        } else {
            // Reject the activity: overlaps
            currentActivity.rejected = true;
            statusArea.text(`Step ${currentIndex + 1}: Activity ${currentActivity.id} rejected (starts at ${currentActivity.start}). Overlaps with previous selection.`);
            statusArea.removeClass('alert-success').addClass('alert-danger');
        }

        currentIndex++;
        if (currentIndex >= activities.length) {
             statusArea.append('<br>Algorithm complete. Max non-overlapping activities found.');
             stepButton.prop('disabled', true);
        }
        drawActivities();
    }

    function resetAlgorithm() {
        activities = [];
        selectedActivities = [];
        currentIndex = 0;
        setupButton.prop('disabled', false);
        stepButton.prop('disabled', true);
        resetButton.prop('disabled', true);
        statusArea.text('System reset. Enter new values and press "Setup".');
        statusArea.removeClass('alert-success alert-danger').addClass('alert-info');
        drawActivities(); // Clear canvas
    }

    // --- Canvas Drawing Functions ---

    function drawActivities() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (activities.length === 0) return;

        const timeScale = (canvas.width - 60) / maxFinishTime;
        const startX = 30;
        const startY = 50;
        const rowHeight = 40;

        // Draw time axis
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(canvas.width - 30, startY);
        ctx.stroke();

        for (let i = 0; i <= maxFinishTime; i++) {
            const x = startX + i * timeScale;
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, startY - 10);
            ctx.stroke();
            ctx.fillText(i.toString(), x - 5, startY - 15);
        }

        // Draw activities
        activities.forEach((activity, index) => {
            const y = startY + (index + 1) * rowHeight;
            const xStart = startX + activity.start * timeScale;
            const xEnd = startX + activity.finish * timeScale;
            const width = xEnd - xStart;

            ctx.fillStyle = '#ddd';
            if (activity.selected) {
                ctx.fillStyle = 'rgba(0, 128, 0, 0.7)'; // Green for selected
            } else if (activity.rejected) {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'; // Red for rejected
            } else if (index === currentIndex) {
                 ctx.fillStyle = 'rgba(0, 0, 255, 0.5)'; // Blue for current
            }
            
            ctx.fillRect(xStart, y, width, rowHeight * 0.7);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(xStart, y, width, rowHeight * 0.7);
            ctx.fillStyle = '#000';
            ctx.fillText(`A${activity.id} (S:${activity.start}, F:${activity.finish})`, xStart + 5, y + rowHeight * 0.4);
        });
    }

    // Initial draw
    drawActivities();
});
