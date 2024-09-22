(function() {
    let player;
    let playerReady = false;
    let token = null;
    let reflections = [];
    let currentRating = 0;
    let userName = '';
    const API_BASE_URL = "http://127.0.0.1:8000/api";
    const notificationsContainer = document.getElementById('notifications');

    // Load YouTube API and video
    function loadYouTubeAPI() {
        if (!document.getElementById('youtube-api-script')) {
            const tag = document.createElement('script');
            tag.id = 'youtube-api-script';
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            console.log("YouTube API loaded");
        }
    }

    // Called when YouTube Iframe API is ready
    window.onYouTubeIframeAPIReady = function() {
        const youtubeVideoIframe = document.getElementById('youtube-video');
        player = new YT.Player(youtubeVideoIframe, {
            events: {
                'onReady': onPlayerReady,
                'onError': function(event) {
                    console.error("Error occurred while loading the player", event);
                    showNotification("An error occurred while loading the YouTube player.", "error");
                }
            }
        });
    };

    // Called when player is fully ready
    function onPlayerReady(event) {
        playerReady = true;
        console.log("Player is ready");
        document.getElementById('add-reflection').disabled = false;
        document.getElementById('send-reflections').disabled = false;
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
            showNotification("Invalid YouTube link. Please check the URL.", "error");
            return null;
        }
    }

    // Load the video using YouTube video ID
    function loadVideo(videoUrl) {
        const videoId = getYouTubeVideoId(videoUrl);
        if (!videoId) {
            return;
        }
        const youtubeVideoIframe = document.getElementById('youtube-video');
        youtubeVideoIframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
        console.log(`Video with ID ${videoId} is being loaded`);
    }

    // Handle login process
    function login(email, password) {
        console.log("Logging in user...");
        fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        })
        .then(response => {
            if (response.status === 401) {
                throw new Error("Invalid credentials");
            }
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            console.log("Login API response:", data);

            // Adjusted based on API response structure
            if (data.access_token) {
                token = data.access_token;

                // Handle different possible structures for user information
                if (data.user && data.user.name) {
                    userName = data.user.name;
                } else if (data.name) {
                    userName = data.name;
                } else {
                    userName = email; // Fallback to email if name is not provided
                }

                localStorage.setItem('authToken', token);
                localStorage.setItem('userName', userName);
                console.log(`Login successful. Welcome, ${userName}!`);
                hideLoginForm();
                loadTags(token);

                const videoUrl = document.getElementById('video-url').value;
                if (videoUrl) {
                    loadYouTubeAPI();
                    loadVideo(videoUrl);
                } else {
                    console.log("No video URL provided after login.");
                }
            } else {
                console.error("Login failed: Invalid response from API");
                showNotification("Login failed. Please check your credentials.", "error");
            }
        })
        .catch(error => {
            console.error("Login error:", error);
            showNotification(error.message, "error");
        });
    }

    // Function to load tags after login
    function loadTags(authToken) {
        console.log("Loading tags...");
        fetch(`${API_BASE_URL}/tags`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            if (response.status === 401) {
                handleUnauthorized();
                throw new Error("Unauthorized");
            }
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
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
                showNotification("Failed to load tags.", "error");
            }
        })
        .catch(error => {
            console.error("Error loading tags:", error);
            showNotification("Failed to load tags.", "error");
        });
    }

    // Function to handle adding reflections
    function addReflection() {
        if (!player || !playerReady || typeof player.getCurrentTime !== 'function') {
            console.error("Player is not ready yet or getCurrentTime() is not available");
            showNotification("Player is not ready yet.", "error");
            return;
        }

        const currentTime = player.getCurrentTime();
        const reflectionText = document.getElementById('reflection-text').value.trim();

        if (reflectionText) {
            reflections.push({ time: currentTime.toFixed(2), text: reflectionText });
            console.log(`Reflection added at ${currentTime.toFixed(2)}s: ${reflectionText}`);

            // Display the reflection in the table
            const reflectionTable = document.getElementById('reflection-table');
            const newRow = reflectionTable.insertRow();
            newRow.insertCell(0).textContent = `${currentTime.toFixed(2)}s`;
            newRow.insertCell(1).textContent = reflectionText;

            // Add the reflection to the video timeline
            addBalloonToTimeline(currentTime, reflectionText);

            closeReflectionModal();
            document.getElementById('reflection-text').value = '';  // Clear the text area
        } else {
            console.error("Reflection was empty or canceled");
            showNotification("Please enter a reflection.", "error");
        }
    }

    // Add a balloon to the video timeline for a reflection
    function addBalloonToTimeline(time, text) {
        const duration = player.getDuration();
        if (duration > 0) {
            const timelineContainer = document.getElementById('timeline-container');
            const balloon = document.createElement('div');
            balloon.classList.add('timeline-label');
            balloon.style.left = `${(time / duration) * 100}%`;
            balloon.textContent = text;

            balloon.addEventListener('click', () => {
                player.seekTo(time);
            });

            timelineContainer.appendChild(balloon);
            console.log(`Reflection balloon added at ${time.toFixed(2)}s`);
        } else {
            console.error("Invalid video duration.");
        }
    }

    // Function to capture star rating
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.getAttribute('data-value'));
            document.querySelectorAll('.star').forEach(s => {
                s.classList.remove('selected');
                if (parseInt(s.getAttribute('data-value')) <= currentRating) {
                    s.classList.add('selected');
                }
            });
            console.log(`Rating set to ${currentRating} stars`);
        });
    });

    // Function to send reflections to the API
    function sendReflections() {
        const videoUrl = document.getElementById('video-url').value;
        const videoId = getYouTubeVideoId(videoUrl);
        const tagSelect = document.getElementById('tag-select');
        const newTag = document.getElementById('tag').value.trim();
        const selectedTag = tagSelect.value;

        const tag = newTag ? newTag : selectedTag;

        if (!token) {
            console.error("User is not logged in. Cannot send reflections.");
            showNotification("You must log in to send reflections.", "error");
            return;
        }

        if (reflections.length === 0) {
            console.error("No reflections to send");
            showNotification("No reflections to send.", "error");
            return;
        }

        if (!tag || currentRating === 0) {
            console.error("Missing tag or rating");
            showNotification("Please add a tag and rating before sending.", "error");
            return;
        }

        const payload = {
            text: videoId,
            reflection: JSON.stringify(reflections),
            tag: tag,
            rating: currentRating
        };

        fetch(`${API_BASE_URL}/resources`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (response.status === 401) {
                handleUnauthorized();
                throw new Error("Unauthorized");
            }
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            if (data.id) {
                showNotification("Reflections sent successfully!", "success");
                console.log("Reflections sent successfully:", data);
                // Optionally, reset reflections and UI here
            } else {
                console.error("Failed to send reflections:", data);
                showNotification("Failed to save reflections.", "error");
            }
        })
        .catch(error => {
            console.error("Error sending reflections:", error);
            showNotification("Failed to send reflections.", "error");
        });
    }

    // Hide login form and show greeting
    function hideLoginForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('greeting').textContent = `Hi, ${userName}!`;
        document.getElementById('user-info').style.display = 'block';
        console.log(`Hi, ${userName}! Welcome back.`);
    }

    // Logout function
    function logout() {
        token = null;
        userName = '';
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('login-form').style.display = 'flex';
        showNotification("Logged out successfully.", "success");
        console.log("User logged out.");
    }

    // Handle unauthorized responses
    function handleUnauthorized() {
        logout();
        showNotification("Session expired. Please log in again.", "error");
    }

    // Show notifications
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        notification.textContent = message;
        notificationsContainer.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Reflection modal functions
    function openReflectionModal() {
        document.getElementById('reflection-modal').style.display = 'block';
    }

    function closeReflectionModal() {
        document.getElementById('reflection-modal').style.display = 'none';
    }

    // Event listeners
    document.getElementById('login-button').addEventListener('click', () => {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        if (email && password) {
            login(email, password);
        } else {
            console.error("Email or password is missing");
            showNotification("Please enter both email and password.", "error");
        }
    });

    document.getElementById('add-reflection').addEventListener('click', () => {
        openReflectionModal();
    });

    document.getElementById('save-reflection').addEventListener('click', () => {
        addReflection();
    });

    document.querySelector('.close-button').addEventListener('click', () => {
        closeReflectionModal();
    });

    document.getElementById('send-reflections').addEventListener('click', sendReflections);

    document.getElementById('logout-button').addEventListener('click', logout);

    // Refresh video based on the input URL
    document.getElementById('refresh-video').addEventListener('click', () => {
        const videoUrl = document.getElementById('video-url').value;
        if (videoUrl) {
            loadYouTubeAPI();
            loadVideo(videoUrl);
        } else {
            console.error("Video URL is missing");
            showNotification("Please enter a YouTube video URL.", "error");
        }
    });

    // Check if user is already logged in
    const storedToken = localStorage.getItem('authToken');
    const storedUserName = localStorage.getItem('userName');
    if (storedToken && storedUserName) {
        token = storedToken;
        userName = storedUserName;
        hideLoginForm();
        loadTags(token);
    }
})();
