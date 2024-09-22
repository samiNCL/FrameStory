let player;
let reflections = [];
let currentRating = 0;
let token = null;  // Store authentication token after login

// API base URL (adjust to your actual API URL)
const apiBaseUrl = "http://127.0.0.1:8000";  // Replace with actual API

// Handle login using the example extension method
function login(email, password) {
    fetch(`${apiBaseUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            token = data.access_token;

            // Store token in chrome.storage like in the working extension
            chrome.storage.local.set({ authToken: token }, function () {
                alert("Login successful!");
                loadTags(token);  // Load tags once logged in
            });
        } else {
            alert("Login failed. Please check your credentials.");
        }
    })
    .catch(error => {
        console.error("Login error:", error);
        alert("An error occurred during login.");
    });
}

// Function to load tags from the API (uses the same logic from the example extension)
function loadTags(authToken) {
    fetch(`${apiBaseUrl}/api/tags`, {
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

// Add reflection to the table and video timeline (reuses the correct reflection handling from your working extension)
function addReflection() {
    if (!player || typeof player.getCurrentTime !== 'function') {
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
    balloon.style.left = `${(time / player.getDuration()) * 100}%`;
    balloon.innerText = text;

    balloon.addEventListener('click', () => {
        player.seekTo(time);
    });

    timelineContainer.appendChild(balloon);
}

// Send reflections to the API like the working extension (uses the same correct API call logic)
function sendReflections() {
    const videoId = new URLSearchParams(window.location.search).get('videoId');
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
        text: videoId,  // Send video ID
        reflection: JSON.stringify(reflections),  // Reflections data
        tag: tag,  // Either new or selected tag
        rating: currentRating  // Video rating
    };

    fetch(`${apiBaseUrl}/api/resources`, {
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
        } else {
            alert("Failed to save reflections.");
        }
    })
    .catch(error => {
        console.error("Error sending reflections:", error);
        alert("Failed to send reflections.");
    });
}

// Event listeners (following the structure of the working example)
document.getElementById('login-button').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
});

document.getElementById('add-reflection').addEventListener('click', addReflection);
document.getElementById('send-reflections').addEventListener('click', sendReflections);
