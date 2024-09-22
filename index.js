let player;
let playerReady = false;
let token = null;  // To store the authentication token
let reflections = [];
let currentRating = 0;  // Initialize currentRating to store user rating
let userName = '';  // To store the user's name from the API

// Load YouTube API and video
function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    console.log("YouTube API loaded");
}

// Called when YouTube Iframe API is ready
function onYouTubeIframeAPIReady() {
    const youtubeVideoIframe = document.getElementById('youtube-video');
    player = new YT.Player(youtubeVideoIframe, {
        events: {
            'onReady': onPlayerReady,
            'onError': (event) => {
                console.error("Error occurred while loading the player", event);
                alert("An error occurred while loading the YouTube player.");
            }
        }
    });
}

// Called when player is fully ready
function onPlayerReady(event) {
    playerReady = true;
    console.log("Player is ready");
    document.getElementById('add-reflection').disabled = false;  // Enable the reflection button
    document.getElementById('send-reflections').disabled = false;  // Enable the send button
}

// Extract YouTube video ID from URL
function getYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const matches = url.match(regex);
    if (matches) {
        console.log("Video ID extracted successfully:", matches[1]);
        return matches[1];
    } else {
        console.error("Failed to extract video ID from URL");
        alert("Invalid YouTube link. Please check the URL.");
        return null;
    }
}

// Load the video using YouTube video ID
function loadVideo(videoUrl) {
    const videoId = getYouTubeVideoId(videoUrl);
    if (!videoId) {
        alert("Invalid YouTube link!");
        return;
    }
    const youtubeVideoIframe = document.getElementById('youtube-video');
    youtubeVideoIframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    console.log(`Video with ID ${videoId} is being loaded`);
}

// Handle login process
function login(email, password) {
    console.log("Logging in user...");
    fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            token = data.access_token;
            userName = data.user.name;  // Get user's name
            localStorage.setItem('authToken', token);
            localStorage.setItem('userName', userName);  // Store user's name in local storage
            console.log(`Login successful. Welcome, ${userName}!`);
            hideLoginForm();  // Hide login form
            loadTags(token);  // Load tags after successful login

            // Use the URL from the text box
            const videoUrl = document.getElementById('video-url').value;
            loadYouTubeAPI();
            loadVideo(videoUrl);
        } else {
            console.error("Login failed: Invalid credentials");
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
    console.log("Loading tags...");
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
            console.log("Tags loaded successfully");
        } else {
            console.error("Failed to load tags");
        }
    })
    .catch(error => {
        console.error("Error loading tags:", error);
        alert("Failed to load tags.");
    });
}

// Function to handle adding reflections
function addReflection() {
    // Check if the player is ready and playing
    if (!player || !playerReady || typeof player.getCurrentTime !== 'function') {
        console.error("Player is not ready yet or getCurrentTime() is not available");
        alert("Player is not ready yet.");
        return;
    }

    const currentTime = player.getCurrentTime();  // Get the current time from the video player
    const reflection = prompt("Enter your reflection:");

    if (reflection) {
        reflections.push({ time: currentTime.toFixed(2), text: reflection });
        console.log(`Reflection added at ${currentTime.toFixed(2)}s: ${reflection}`);

        // Display the reflection in the table
        const reflectionTable = document.getElementById('reflection-table');
        const newRow = reflectionTable.insertRow();
        newRow.insertCell(0).innerText = `${currentTime.toFixed(2)}s`;
        newRow.insertCell(1).innerText = reflection;

        // Add the reflection to the video timeline
        addBalloonToTimeline(currentTime, reflection);
    } else {
        console.error("Reflection was empty or canceled");
        alert("Please enter a reflection.");
    }
}

// Add a balloon to the video timeline for a reflection
function addBalloonToTimeline(time, text) {
    const timelineContainer = document.getElementById('timeline-container');
    const balloon = document.createElement('div');
    balloon.classList.add('timeline-label');
    balloon.style.left = `${(time / player.getDuration()) * 100}%`;
    balloon.innerText = text;

    balloon.addEventListener('click', () => {
        player.seekTo(time);
    });

    timelineContainer.appendChild(balloon);
    console.log(`Reflection balloon added at ${time.toFixed(2)}s`);
}

// Function to capture star rating
document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', function() {
        currentRating = this.getAttribute('data-value');
        document.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));
        this.classList.add('selected');
        console.log(`Rating set to ${currentRating} stars`);
    });
});

// Function to send reflections to the API
function sendReflections() {
    const videoUrl = document.getElementById('video-url').value;
    const videoId = getYouTubeVideoId(videoUrl);
    const tagSelect = document.getElementById('tag-select');
    const newTag = document.getElementById('tag').value;
    const selectedTag = tagSelect.value;

    const tag = newTag ? newTag : selectedTag;

    if (!token) {
        console.error("User is not logged in. Cannot send reflections.");
        alert("You must log in to send reflections.");
        return;
    }

    if (reflections.length === 0) {
        console.error("No reflections to send");
        alert("No reflections to send.");
        return;
    }

    if (!tag || currentRating === 0) {
        console.error("Missing tag or rating");
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
            console.log("Reflections sent successfully:", data);
        } else {
            console.error("Failed to send reflections:", data);
            alert("Failed to save reflections.");
        }
    })
    .catch(error => {
        console.error("Error sending reflections:", error);
        alert("Failed to send reflections.");
    });
}

// Hide login form and show greeting
function hideLoginForm() {
    document.getElementById('login-form').style.display = 'none';  // Hide login form
    document.getElementById('greeting').innerText = `Hi, ${userName}!`;  // Show greeting with user's name
    console.log(`Hi, ${userName}! Welcome back.`);
}

// Event listeners
document.getElementById('login-button').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (email && password) {
        login(email, password);
    } else {
        console.error("Email or password is missing");
        alert("Please enter both email and password.");
    }
});

document.getElementById('add-reflection').addEventListener('click', addReflection);
document.getElementById('send-reflections').addEventListener('click', sendReflections);

// Refresh video based on the input URL
document.getElementById('refresh-video').addEventListener('click', () => {
    const videoUrl = document.getElementById('video-url').value;
    if (videoUrl) {
        loadYouTubeAPI();
        loadVideo(videoUrl);
    } else {
        console.error("Video URL is missing");
        alert("Please enter a YouTube video URL.");
    }
});

// Check if user is already logged in
const storedToken = localStorage.getItem('authToken');
const storedUserName = localStorage.getItem('userName');
if (storedToken && storedUserName) {
    token = storedToken;
    userName = storedUserName;
    hideLoginForm();
    loadTags(token);  // Load tags if user is already logged in
}
