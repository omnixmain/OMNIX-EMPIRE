const API_URL = 'https://omnix-empire-database.pages.dev/playlist/RoarZone_EMBY.json';
const detailsContainer = document.getElementById('movie-details');

let allMovies = [];

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    if (!movieId) {
        window.location.href = 'hub.html';
        return;
    }

    try {
        const response = await fetch(API_URL);
        allMovies = await response.json();
        const movie = allMovies.find(m => m.id === movieId);

        if (!movie) {
            detailsContainer.innerHTML = `<div class="container"><p>Movie not found.</p></div>`;
            return;
        }

        renderMovieDetails(movie);
        renderRecommendations(movie);
    } catch (error) {
        console.error('Error loading movie:', error);
        detailsContainer.innerHTML = `<div class="container"><p>Error loading movie data.</p></div>`;
    }
}

function renderMovieDetails(movie) {
    document.title = `${movie.title} | OMNIX HUB`;

    const html = `
        <div class="backdrop">
            <img src="${movie.image}" alt="">
        </div>
        
        <div class="container">
            <div class="movie-header">
                <img src="${movie.image}" alt="${movie.title}" class="poster-large">
                <div class="movie-info-text">
                    <h1>${movie.title}</h1>
                    <div class="meta-row">
                        <span class="meta-item">${movie.year}</span>
                        <span class="meta-item">${movie.duration || 'N/A'}</span>
                        <span class="meta-item">${movie.genres || 'Genre'}</span>
                        ${movie.rating ? `<span class="meta-item" style="color:#ffcc00">⭐ ${movie.rating}</span>` : ''}
                        <span class="quality-badge">${movie.video_quality || 'HD'}</span>
                    </div>
                    <p class="overview">${movie.overview || 'No description available.'}</p>
                    
                    <div class="actions">
                        <button class="primary-btn" onclick="goToPlayer('${movie.id}')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Play Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    detailsContainer.innerHTML = html;
}

function renderRecommendations(currentMovie) {
    const recommendedContainer = document.getElementById('recommended-movies');

    // Filter movies in the same category, excluding the current one
    const recommended = allMovies
        .filter(m => m.category === currentMovie.category && m.id !== currentMovie.id)
        .slice(0, 10); // Show up to 10

    if (recommended.length === 0) {
        document.querySelector('.recommendations').style.display = 'none';
        return;
    }

    recommendedContainer.innerHTML = recommended.map(movie => createMovieCard(movie)).join('');
}

function createMovieCard(movie) {
    const rating = movie.rating && movie.rating !== "" ? `<div class="rating-tag">⭐ ${movie.rating}</div>` : "";
    return `
        <div class="movie-card" onclick="openMovieDetails('${movie.id}')">
            <div class="card-image">
                <img src="${movie.image}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                ${rating}
            </div>
            <div class="card-info">
                <h3>${movie.title}</h3>
                <p>${movie.year} • ${movie.duration || 'N/A'}</p>
            </div>
        </div>
    `;
}

window.openMovieDetails = (id) => {
    window.location.href = `movie.html?id=${id}`;
};

window.goToPlayer = (id) => {
    window.location.href = `player.html?id=${id}`;
};

init();
