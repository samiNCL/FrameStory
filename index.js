let player;
let playerReady = false;
let token = null;  // To store the authentication token
let reflections = [];
let currentRating = 0;
let videoId = null;  // Declare videoId globally

// Load YouTube API and video
function loadYouTubeAPI() {
    if (window.YT) {  // Check if the API is already loaded
        onYouTubeIframeAPIReady();
    } else {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
}

// Called when YouTube Iframe API is ready
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-video', {
        height: '450',
        width: '800',
        videoId: videoId,  // Use the global videoId
        events: {
            'onReady': onPlayerReady
        }
    });
}

// Called when player is fully ready
function onPlayerReady(event) {
    playerReady = true;
    console.log("Player is ready");
    if (videoId) {
        player.loadVideoById(videoId);
    }
}

// Load the video using YouTube video ID
function loadVideo(id) {
    if (!id) {
        alert("Invalid YouTube video ID!");
        return;
    }
    videoId = id;  // Set the global videoId variable
    if (playerReady) {
        // If player is already ready, load the video
        player.loadVideoById(videoId);
    } else {
        // Player is not ready yet
        console.log("Player not ready, will load video when ready.");
    }
}

// Get YouTube video ID from URL
function getYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const matches = url.match(regex);
    return matches ? matches[1] : null;
}

// Handle login process
function login(email, password) {
    fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            token = data.access_token;
            localStorage.setItem('authToken', token);
            alert("Login successful!");
            loadTags(token);  // Load tags after successful login

            // Example of loading the video (replace this with actual video ID or logic)
            // For demonstration, let's assume the video URL is provided by the API
            // Replace this with your actual logic to get the video ID
            videoId = "dQw4w9WgXcQ";  // Replace with actual video ID or from API response
            loadYouTubeAPI();  // Load the YouTube API script
        } else {
            alert("Login failed. Please check your credentials.");
        }
    })
    .catch(error => {
        console.error("Login error:", error);
        alert("An error occurred during login.");
    });
}

// Function to load tags after login
function loadTags(authToken) {
    fetch("http://127.0.0.1:8000/api/tags", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        const tagSelect = document.getElementById('tag-select');
        if (data && data.tags) {
            data.tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag.title;
                option.textContent = tag.title;
                tagSelect.appendChild(option);
            });
        }
    })
    .catch(error => {
        console.error("Error loading tags:", error);
    });
}

// Function to handle adding reflections
function addReflection() {
    if (!player || !playerReady || typeof player.getCurrentTime !== 'function') {
        alert("Player is not ready yet.");
        return;
    }

    const currentTime = player.getCurrentTime();
    const reflection = prompt("Enter your reflection:");

    if (reflection) {
        reflections.push({ time: currentTime.toFixed(2), text: reflection });

        const reflectionTable = document.getElementById('reflection-table');
        const newRow = reflectionTable.insertRow();
        newRow.insertCell(0).innerText = `${currentTime.toFixed(2)}s`;
        newRow.insertCell(1).innerText = reflection;

        addBalloonToTimeline(currentTime, reflection);
    }
}

// Add a balloon to the video timeline for a reflection
function addBalloonToTimeline(time, text) {
    const timelineContainer = document.getElementById('timeline-container');
    const balloon = document.createElement('div');
    balloon.classList.add('timeline-label');

    if (player && player.getDuration) {
        const duration = player.getDuration();
        balloon.style.left = `${(time / duration) * 100}%`;
    } else {
        balloon.style.left = '0%';
    }

    balloon.innerText = text;

    balloon.addEventListener('click', () => {
        player.seekTo(time);
    });

    timelineContainer.appendChild(balloon);
}

// Function to send reflections to the API
function sendReflections() {
    const tagSelect = document.getElementById('tag-select');
    const newTag = document.getElementById('tag').value;
    const selectedTag = tagSelect.value;

    const tag = newTag ? newTag : selectedTag;

    if (!token) {
        alert("You must log in to send reflections.");
        return;
    }

    if (reflections.length === 0) {
        alert("No reflections to send.");
        return;
    }

    if (!tag || currentRating === 0) {
        alert("Please add a tag and rating before sending.");
        return;
    }

    const payload = {
        text: videoId,
        reflection: JSON.stringify(reflections),
        tag: tag,
        rating: currentRating
    };

    fetch("http://127.0.0.1:8000/api/resources", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.id) {
            alert("Reflections sent successfully!");
            // Optionally, clear the reflections and reset the form
            reflections = [];
            document.getElementById('reflection-table').innerHTML = '';
            document.getElementById('timeline-container').innerHTML = '';
            document.getElementById('tag').value = '';
            document.getElementById('tag-select').value = '';
            resetRatingStars();
        } else {
            alert("Failed to save reflections.");
        }
    })
    .catch(error => {
        console.error("Error sending reflections:", error);
        alert("Failed to send reflections.");
    });
}

// Function to handle star rating selection
function handleStarRating() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.getAttribute('data-value'));
            updateStarDisplay(currentRating);
        });
    });
}

// Update the star display based on the current rating
function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        const starValue = parseInt(star.getAttribute('data-value'));
        if (starValue <= rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

// Reset the star rating display
function resetRatingStars() {
    currentRating = 0;
    updateStarDisplay(currentRating);
}

// Event listeners
document.getElementById('login-button').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
});

document.getElementById('add-reflection').addEventListener('click', addReflection);
document.getElementById('send-reflections').addEventListener('click', sendReflections);

// Initialize the star rating functionality
handleStarRating();

// Check for existing token and load tags if logged in
const storedToken = localStorage.getItem('authToken');
if (storedToken) {
    token = storedToken;
    loadTags(token);
    // Assume the video ID is stored in local storage or retrieved from the API
    videoId = "dQw4w9WgXcQ";  // Replace with actual video ID or logic to retrieve it
    loadYouTubeAPI();
}
