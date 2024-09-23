// index.js

let player;
let playerReady = false;
let token = null;
let reflections = [];
let currentRating = 0;
let videoId = null;
let videoUrl = null; // Global variable to store the full YouTube URL

// Function to get query parameters from URL
function getQueryParams() {
    const params = {};
    window.location.search.substr(1).split('&').forEach(function(item) {
        if (item) {
            const parts = item.split('=');
            params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
        }
    });
    return params;
}

// Function to handle videoId from URL after login
function handleVideoIdFromURL() {
    const queryParams = getQueryParams();
    if (queryParams.videoId) {
        videoId = queryParams.videoId;
        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        // Set the video URL input value
        document.getElementById('video-url').value = videoUrl;
        // Show the video URL input (in case it's hidden)
        document.getElementById('video-url-container').style.display = 'block';
    } else {
        // Show the video URL input
        document.getElementById('video-url-container').style.display = 'block';
    }
}

// Load YouTube API and initialize the player
function loadYouTubeAPI() {
    if (window.YT && YT.Player) {
        console.log("YouTube IFrame API already loaded.");
        onYouTubeIframeAPIReady();
    } else {
        console.log("Loading YouTube IFrame API script.");
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
}

// YouTube IFrame API ready callback
function onYouTubeIframeAPIReady() {
    console.log("YouTube IFrame API is ready.");
    if (!videoId) {
        console.error("videoId is not set. Cannot initialize player.");
        return;
    }
    player = new YT.Player('youtube-video', {
        height: '450',
        width: '800',
        videoId: videoId,
        events: {
            'onReady': onPlayerReady,
            'onError': function(event) {
                console.error("YouTube Player Error:", event.data);
            }
        }
    });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady; // Ensure global scope

// Player ready callback
function onPlayerReady(event) {
    playerReady = true;
    console.log("Player is ready.");
    // Display UI elements
    document.getElementById('video-container').style.display = 'flex';
    document.getElementById('add-reflection').style.display = 'block';
    document.getElementById('tag-container').style.display = 'block';
    document.querySelector('.star-rating').style.display = 'flex';
    document.querySelector('h2').style.display = 'block';
    document.querySelector('table').style.display = 'table';
    document.getElementById('send-reflections').style.display = 'block';

    // Fetch existing reflections for this video AFTER videoId is set and player is ready
    fetchReflectionsForVideo(videoId);
}

// Extract YouTube video ID from URL
function getYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?\/)|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const matches = url.match(regex);
    return matches ? matches[1] : null;
}

// Handle login
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
            loadTags(token);

            // Hide the login form
            document.getElementById('login-form').style.display = 'none';

            // Handle videoId from URL
            handleVideoIdFromURL();
        } else {
            alert("Login failed. Please check your credentials.");
        }
    })
    .catch(error => {
        console.error("Login error:", error);
        alert("An error occurred during login.");
    });
}

// Load tags from the backend
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

// Fetch existing reflections for the video
function fetchReflectionsForVideo(videoId) {
    if (!token) {
        console.error("User is not authenticated.");
        return;
    }

    if (!videoId) {
        console.error("videoId is not set. Cannot fetch reflections.");
        return;
    }

    fetch(`http://127.0.0.1:8000/api/resources?videoId=${videoId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else if (response.status === 404) {
            console.log("No reflections found for this video.");
            return null;
        } else {
            // Handle other errors
            return response.json().then(errorData => {
                throw new Error(errorData.message || "Failed to fetch reflections.");
            });
        }
    })
    .then(data => {
        if (data) {
            displayReflections(data);
        }
    })
    .catch(error => {
        console.error("Error fetching reflections:", error);
        alert(`Failed to fetch reflections: ${error.message}`);
    });
}

// Display reflections
function displayReflections(data) {
    if (data && data.reflection) {
        // Clear existing reflections
        reflections = [];
        document.getElementById('reflection-table').innerHTML = '';
        document.getElementById('timeline-container').innerHTML = '';

        // Set current rating and tag if available
        if (data.rating) {
            currentRating = data.rating;
            updateStarDisplay(currentRating);
        }

        if (data.tag) {
            document.getElementById('tag-select').value = data.tag;
        }

        // Parse and display reflections
        const fetchedReflections = JSON.parse(data.reflection);
        fetchedReflections.forEach(reflection => {
            reflections.push(reflection);
            addReflectionToTableAndTimeline(reflection.time, reflection.text);
        });

        console.log("Reflections loaded from API.");
    } else {
        console.log("No reflections found for this video.");
    }
}

// Add reflection to table and timeline
function addReflectionToTableAndTimeline(time, text) {
    const reflectionTable = document.getElementById('reflection-table');
    const newRow = reflectionTable.insertRow();
    newRow.insertCell(0).innerText = `${parseFloat(time).toFixed(2)}s`;
    newRow.insertCell(1).innerText = text;

    addBalloonToTimeline(parseFloat(time), text);
}

// Add reflection at the current video time
function addReflection() {
    if (!player || !playerReady || typeof player.getCurrentTime !== 'function') {
        alert("Player is not ready yet.");
        console.error("Player is not ready. playerReady:", playerReady);
        return;
    }

    const currentTime = player.getCurrentTime();
    const reflection = prompt("Enter your reflection:");

    if (reflection) {
        const reflectionData = { time: currentTime.toFixed(2), text: reflection };
        reflections.push(reflectionData);
        addReflectionToTableAndTimeline(currentTime, reflection);
    }
}

// Add a balloon marker to the timeline
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

// Send reflections to the backend
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
        text: videoUrl, // Include the full YouTube URL as 'text'
        reflection: JSON.stringify(reflections), // Use 'reflection' as the field name
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
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            // Handle errors
            return response.json().then(errorData => {
                throw new Error(errorData.message || "Failed to save reflections.");
            });
        }
    })
    .then(data => {
        if (data.id) {
            alert("Reflections sent successfully!");
            // Clear reflections and reset form
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
        alert(`Failed to send reflections: ${error.message}`);
    });
}

// Handle star rating selection
function handleStarRating() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.getAttribute('data-value'));
            updateStarDisplay(currentRating);
        });
    });
}

// Update star display based on rating
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

// Reset star rating display
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

// Event listener for loading the video
document.getElementById('load-video-button').addEventListener('click', () => {
    videoUrl = document.getElementById('video-url').value; // Store the full YouTube URL
    videoId = getYouTubeVideoId(videoUrl);
    if (videoId) {
        console.log("Video ID set to:", videoId);
        loadYouTubeAPI();  // Load the YouTube API script and initialize the player
        // Hide the video URL input after loading the video
        document.getElementById('video-url-container').style.display = 'none';
    } else {
        alert("Invalid YouTube video URL. Please try again.");
    }
});

// Initialize star rating functionality
handleStarRating();

// Check for existing token and load tags if logged in
const storedToken = localStorage.getItem('authToken');
if (storedToken) {
    token = storedToken;
    loadTags(token);
    // Hide the login form
    document.getElementById('login-form').style.display = 'none';

    // Handle videoId from URL
    handleVideoIdFromURL();
} else {
    // Show login form
    document.getElementById('login-form').style.display = 'block';
}
