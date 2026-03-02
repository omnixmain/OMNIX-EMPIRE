// Obfuscated API URL
const _0x1a2b = 'aHR0cHM6Ly9vbW5peC1lbXBpcmUtZGF0YWJhc2UucGFnZXMuZGV2L3BsYXlsaXN0L29tbml4LWtpbmctZmluYWwtZGF0YS5qc29u';
const API_URL = atob(_0x1a2b);

async function initPlayer() {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    const quality = urlParams.get('q');

    if (!movieId) {
        window.location.href = 'hub.html';
        return;
    }

    try {
        const response = await fetch(API_URL);
        const rawData = await response.json();

        let allMovies = [];
        if (Array.isArray(rawData)) {
            allMovies = rawData;
        } else {
            for (const category in rawData) {
                rawData[category].forEach(m => allMovies.push(m));
            }
        }

        const movie = allMovies.find(m => m.id === movieId);

        if (!movie) {
            alert('Movie not found');
            window.location.href = 'hub.html';
            return;
        }

        // Determine stream URL
        if (movie.watchNowUrls) {
            if (quality && movie.watchNowUrls[quality]) {
                movie.stream_url = movie.watchNowUrls[quality];
            } else {
                const availableQualities = Object.keys(movie.watchNowUrls);
                if (availableQualities.length > 0) {
                    movie.stream_url = movie.watchNowUrls[availableQualities[0]];
                }
            }
        }

        setupVideo(movie);
    } catch (error) {
        console.error('Error loading movie for player:', error);
    }
}

function setupVideo(movie) {
    const video = document.getElementById('omnix-video');
    const loadingOverlay = document.getElementById('loading-overlay');
    const headerTitle = document.getElementById('movie-title-header');

    headerTitle.textContent = movie.title;

    // Reset video
    video.pause();
    video.innerHTML = '';

    // Instead of <source>, directly assign src for better mobile/error handling with direct links
    video.src = movie.stream_url;
    video.load();

    // Fallback: If it's a direct download URL that doesn't trigger an error but just hangs
    const bufferTimeout = setTimeout(() => {
        if (loadingOverlay.style.display !== 'none') {
            alert('Stream is taking too long or is a direct download link. Redirecting you to the source...');
            window.location.href = movie.stream_url;
        }
    }, 5000); // 5 seconds timeout for buffering

    video.oncanplay = () => {
        clearTimeout(bufferTimeout);
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 500);
    };

    video.onerror = () => {
        clearTimeout(bufferTimeout);
        alert('Error playing this stream. It might be offline or requires a direct download.\n\nOpening the source link directly...');
        window.location.href = movie.stream_url;
    };
}

initPlayer();
