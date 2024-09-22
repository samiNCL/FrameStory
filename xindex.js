let player;
let reflections = [];
let currentRating = 0;  // Track the current rating
let token = null;  // Store authentication token after login

// API base URL from your setup
const apiBaseUrl = "http://127.0.0.1:8000";  // Replace with the actual API base URL

// Function to handle star rating selection
const stars = document.querySelectorAll('.star');
stars.forEach(star => {
    star.addEventListener('click', function () {
        currentRating = this.getAttribute('data-value');
        updateStarRating();
    });
});

// Update star rating display
function updateStarRating() {
    stars.forEach(star => {
        if (star.getAttribute('data-value') <= currentRating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

// Function to log in and get a token
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
            chrome.storage.local.set({ authToken: token }, function () {
                alert("Login successful!");
                loadTags(token);  // Load tags after successful login
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

// Function to load existing tags from the API
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

// Function to send reflections to the API
function sendReflections() {
    const videoId = new URLSearchParams(window.location.search).get('videoId');
    const tagSelect = document.getElementById('tag-select');
    const newTag = document.getElementById('tag').value;
    const selectedTag = tagSelect.value;

    const tag = newTag ? newTag : selectedTag;  // Use new tag if provided, else the selected tag

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
        text: videoId,  // Video ID as the text
        reflection: JSON.stringify(reflections),
        tag: tag,  // Either selected or new tag
        rating: currentRating  // The selected rating
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
        console.error("Error saving reflections:", error);
        alert("Failed to send reflections.");
    });
}

// Event listeners
document.getElementById('login-button').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
});

document.getElementById('add-reflection').addEventListener('click', addReflection);
document.getElementById('send-reflections').addEventListener('click', sendReflections);
