let player;
let videoId;

// Function called when the YouTube Iframe API is ready
function onYouTubeIframeAPIReady() {
    const urlParams = new URLSearchParams(window.location.search);
    videoId = urlParams.get('videoId');

    if (videoId) {
        console.log("Video ID extracted: ", videoId);  // Log the extracted video ID
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
        console.error("No valid video ID provided.");
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

// Initialize event listeners
document.getElementById('add-reflection').addEventListener('click', addReflection);
