let player;
let reflections = [];  // Array to store all reflections

// Function called when the YouTube Iframe API is ready
function onYouTubeIframeAPIReady() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('videoId');

    if (videoId) {
        player = new YT.Player('youtube-video', {
            videoId: videoId,
            width: '100%',
            height: '450',
            events: {
                'onReady': onPlayerReady,
                'onError': onPlayerError  // Capture any player errors
            }
        });
    } else {
        alert("No valid video ID provided.");
    }
}

// Player is ready
function onPlayerReady() {
    console.log("Player is ready and video is loaded.");
}

// Capture errors from the YouTube player
function onPlayerError(event) {
    console.error("Error in YouTube player: ", event);
}

// Add reflection and display on the timeline
function addReflection() {
    if (!player || typeof player.getCurrentTime !== 'function') {
        alert("Player is not ready yet.");
        return;
    }

    const currentTime = player.getCurrentTime();
    const reflection = prompt("Enter your reflection:");

    if (reflection) {
        // Save the reflection in memory (the `reflections` array)
        reflections.push({ time: currentTime.toFixed(2), text: reflection });

        // Display the reflection in the UI
        const reflectionTable = document.getElementById('reflection-table');
        const newRow = reflectionTable.insertRow();

        const timeCell = newRow.insertCell(0);
        const reflectionCell = newRow.insertCell(1);

        timeCell.innerHTML = `${currentTime.toFixed(2)}s`;
        reflectionCell.innerHTML = reflection;

        addBalloonToTimeline(currentTime, reflection);
    }
}

// Add a clickable balloon to the timeline
function addBalloonToTimeline(time, text) {
    const timelineContainer = document.getElementById('timeline-container');
    const balloon = document.createElement('div');

    balloon.classList.add('timeline-label');
    const videoDuration = player.getDuration();
    const positionPercent = (time / videoDuration) * 100;
    balloon.style.left = `${positionPercent}%`;
    balloon.innerHTML = text;

    balloon.addEventListener('click', () => {
        player.seekTo(time);
    });

    timelineContainer.appendChild(balloon);
}

// Send reflections to the API (for now, just log the data)
document.getElementById('send-reflections').addEventListener('click', function() {
    if (reflections.length === 0) {
        alert("No reflections to send.");
        return;
    }

    // Simulate sending reflections to an API by logging them in JSON format
    console.log("Sending reflections to API:");
    console.log(JSON.stringify(reflections, null, 2));

    alert("Reflections have been logged to the console in JSON format.");
});

// Initialize the reflection button
document.getElementById('add-reflection').addEventListener('click', addReflection);
