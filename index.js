// Notification Function
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = ''; // Reset classes
    notification.classList.add(type === 'error' ? 'error' : 'success');
    notification.style.display = 'block';

    // Hide after 5 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Function to parse query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Function to validate YouTube Video ID
function isValidVideoId(videoId) {
    const regex = /^[a-zA-Z0-9_-]{11}$/;
    return regex.test(videoId);
}

// Function to load the video using YouTube IFrame API
function loadVideo(videoId) {
    const spinner = document.getElementById('spinner');
    spinner.style.display = 'block'; // Show spinner

    if (player && typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
    } else {
        const iframe = document.getElementById('youtube-video');
        iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    }

    // Hide spinner after a short delay (e.g., 3 seconds)
    setTimeout(() => {
        spinner.style.display = 'none';
    }, 3000);
}

// Function to initialize the YouTube Player
let player;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-video', {
        events: {
            'onReady': onPlayerReady,
            'onError': onPlayerError
        }
    });
}

// YouTube Player Ready Event
function onPlayerReady(event) {
    console.log('YouTube Player is ready.');
    const spinner = document.getElementById('spinner');
    spinner.style.display = 'none'; // Hide spinner when ready
}

// YouTube Player Error Event
function onPlayerError(event) {
    console.error('Error loading the YouTube video:', event.data);
    showNotification('Failed to load the YouTube video. Please check the Video ID.', 'error');
    const spinner = document.getElementById('spinner');
    spinner.style.display = 'none'; // Hide spinner on error
}

// Function to initialize video loading
function initializeVideo() {
    const videoIdFromURL = getQueryParam('videoId');
    const videoIdInput = document.getElementById('video-id-input');
    const loadButton = document.getElementById('load-button');

    if (videoIdFromURL) {
        if (isValidVideoId(videoIdFromURL)) {
            // Automatically load the video
            loadVideo(videoIdFromURL);
            showNotification('Video loaded successfully!', 'success');
        } else {
            showNotification('Invalid Video ID in URL.', 'error');
        }
    }

    // Event listener for the Load Video button
    loadButton.addEventListener('click', function() {
        const videoId = videoIdInput.value.trim();
        if (videoId && isValidVideoId(videoId)) {
            loadVideo(videoId);
            // Update the URL with the new videoId without reloading the page
            const newURL = `${window.location.pathname}?videoId=${videoId}`;
            window.history.replaceState({}, '', newURL);
            showNotification('Video loaded successfully!', 'success');
        } else {
            showNotification('Please enter a valid YouTube Video ID.', 'error');
        }
    });
}

// Initialize the video when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeVideo);
