
// index.js

let player;
let playerReady = false;
let token = null;
let reflections = [];
let currentRating = 0;
let videoId = null;
let videoUrl = null; // Store the full YouTube URL

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

// Handle videoId from URL after login
function handleVideoIdFromURL() {
    const queryParams = getQueryParams();
    if (queryParams.videoId) {
        videoId = queryParams.videoId;
        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        // Set the video URL input value
        document.getElementById('video-url').value = videoUrl;
        // Show the video URL input
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
    fetchReflectionsForVideo(videoUrl); // Pass the full video URL
}

// Extract YouTube video ID from URL
function getYouTubeVideoId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            // Shortened URL
            return urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            if (urlObj.searchParams.get('v')) {
                // Standard URL with 'v' parameter
                return urlObj.searchParams.get('v');
            } else if (urlObj.pathname.startsWith('/embed/')) {
                // Embed URL
                return urlObj.pathname.split('/embed/')[1];
            }
        }
    } catch (error) {
        console.error("Error parsing YouTube URL:", error);
    }
    return null;
}

// Normalize YouTube URLs for consistent comparison
function normalizeYouTubeUrl(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.get('v')) {
            return `https://www.youtube.com/watch?v=${urlObj.searchParams.get('v')}`;
        } else if (urlObj.hostname === 'youtu.be') {
            return `https://www.youtube.com/watch?v=${urlObj.pathname.slice(1)}`;
        } else {
            return url;
        }
    } catch (error) {
        console.error("Error normalizing YouTube URL:", error);
        return url;
    }
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
function fetchReflectionsForVideo(videoUrl) {
    if (!token) {
        console.error("User is not authenticated.");
        return;
    }

    if (!videoUrl) {
        console.error("videoUrl is not set. Cannot fetch reflections.");
        return;
    }

    console.log(`Fetching reflections for video URL: ${videoUrl}`);

    // Use the full video URL as the parameter
    fetch(`http://127.0.0.1:8000/api/resources?video_url=${encodeURIComponent(videoUrl)}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        console.log(`Response status: ${response.status}`);
        if (response.ok) {
            return response.json();
        } else if (response.status === 404) {
            console.log("No reflections found for this video.");
            return null;
        } else {
            return response.json().then(errorData => {
                throw new Error(errorData.message || "Failed to fetch reflections.");
            });
        }
    })
    .then(data => {
        if (data) {
            console.log("Reflections data received:", data);
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
    if (data && data.resources && data.resources.length > 0) {
        // Normalize the current video URL
        const currentUrl = normalizeYouTubeUrl(videoUrl);

        // Find all resources that match the current video URL
        const matchingResources = data.resources.filter(resource => {
            const resourceUrl = normalizeYouTubeUrl(resource.text);
            return resourceUrl === currentUrl;
        });

        if (matchingResources.length > 0) {
            console.log(`Found ${matchingResources.length} matching resources.`);

            // Sort the matching resources by 'updated_at' in descending order
            matchingResources.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

            // Select the latest resource
            const latestResource = matchingResources[0];
            console.log("Latest resource selected:", latestResource);

            // Extract reflections, rating, and tag from the latest resource
            const { reflection, rating, tag_title } = latestResource;
            const tag = tag_title; // Adjust field name if necessary

            if (reflection) {
                console.log("Raw reflections data:", reflection);
                let fetchedReflections = [];

                try {
                    fetchedReflections = JSON.parse(reflection);
                    // Handle possible double-stringification
                    if (typeof fetchedReflections === 'string') {
                        fetchedReflections = JSON.parse(fetchedReflections);
                    }
                    console.log("Parsed reflections data:", fetchedReflections);
                } catch (error) {
                    console.error("Error parsing reflections:", error);
                    alert("Failed to parse reflections data.");
                    return;
                }

                if (Array.isArray(fetchedReflections)) {
                    // Clear existing reflections
                    reflections = [];
                    document.getElementById('reflection-table').innerHTML = '';
                    document.getElementById('timeline-container').innerHTML = '';

                    fetchedReflections.forEach(reflectionItem => {
                        if (reflectionItem && reflectionItem.time && reflectionItem.text) {
                            reflections.push(reflectionItem);
                            addReflectionToTableAndTimeline(reflectionItem.time, reflectionItem.text);
                        } else {
                            console.warn("Invalid reflection item:", reflectionItem);
                        }
                    });
                    console.log("Reflections loaded from API.");
                } else {
                    console.error("Reflections data is not an array:", fetchedReflections);
                    alert("Reflections data is invalid.");
                }
            } else {
                console.log("No reflections found for this video.");
                // Clear existing reflections if any
                reflections = [];
                document.getElementById('reflection-table').innerHTML = '';
                document.getElementById('timeline-container').innerHTML = '';
            }

            // Set current rating and tag if available
            if (rating) {
                currentRating = rating;
                updateStarDisplay(currentRating);
            }

            if (tag) {
                document.getElementById('tag-select').value = tag;
            }

            // Inform user if multiple resources were found
            if (matchingResources.length > 1) {
                alert(`Multiple entries found for this video. Displaying the latest reflections.`);
            }

        } else {
            console.log("No matching resource found for this video.");
            // Handle case where no resources match
            reflections = [];
            document.getElementById('reflection-table').innerHTML = '';
            document.getElementById('timeline-container').innerHTML = '';
        }
    } else {
        console.log("No resources found in data.");
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
    const newTag = document.getElementById('tag').value.trim();
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

    console.log("Sending reflections with payload:", payload);

    fetch("http://127.0.0.1:8000/api/resources", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        console.log(`Response status: ${response.status}`);
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
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (email && password) {
        login(email, password);
    } else {
        alert("Please enter both email and password.");
    }
});

document.getElementById('add-reflection').addEventListener('click', addReflection);
document.getElementById('send-reflections').addEventListener('click', sendReflections);

// Event listener for loading the video
document.getElementById('load-video-button').addEventListener('click', () => {
    videoUrl = document.getElementById('video-url').value.trim(); // Store the full YouTube URL
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
