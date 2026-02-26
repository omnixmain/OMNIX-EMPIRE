const API_URL = 'https://omnix-empire-database.pages.dev/playlist/RoarZone_EMBY.json';

async function initPlayer() {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    if (!movieId) {
        window.location.href = 'hub.html';
        return;
    }

    try {
        const response = await fetch(API_URL);
        const movies = await response.json();
        const movie = movies.find(m => m.id === movieId);

        if (!movie) {
            alert('Movie not found');
            window.location.href = 'hub.html';
            return;
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
    video.src = movie.stream_url;

    video.oncanplay = () => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 500);
    };

    video.onerror = () => {
        alert('Error playing this stream. It might be offline or private.');
        window.history.back();
    };
}

initPlayer();
