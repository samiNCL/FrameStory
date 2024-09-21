let player;
let videoId;

// Function called when the YouTube Iframe API is ready
function onYouTubeIframeAPIReady() {
    const urlParams = new URLSearchParams(window.location.search);
    videoId = urlParams.get('videoId');

    if (videoId) {
        player = new YT.Player('youtube-video', {
            videoId: videoId,
            events: {
                'onReady': onPlayerReady
            }
        });
    } else {
        alert("No valid video ID provided.");
    }
}

function onPlayerReady() {
    console.log("Player is ready.");
}

// Add reflection and display on the timeline
function addReflection() {
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

document.getElementById('add-reflection').addEventListener('click', addReflection);
