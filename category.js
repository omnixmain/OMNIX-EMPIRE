const API_URL = 'https://omnix-empire-database.pages.dev/playlist/RoarZone_EMBY.json';
const categoryGrid = document.getElementById('category-grid');
const pageTitle = document.getElementById('page-title');
const navTitle = document.getElementById('category-title-nav');
const movieCount = document.getElementById('movie-count');

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryName = urlParams.get('name');

    if (!categoryName) {
        window.location.href = 'hub.html';
        return;
    }

    pageTitle.textContent = categoryName;
    navTitle.textContent = categoryName;
    document.title = `${categoryName} | OMNIX HUB`;

    try {
        const response = await fetch(API_URL);
        const allMovies = await response.json();

        const filtered = allMovies
            .filter(m => m.category === categoryName)
            .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Latest first

        movieCount.textContent = `${filtered.length} Movies`;
        renderCategory(filtered);
    } catch (error) {
        console.error('Error loading category:', error);
        categoryGrid.innerHTML = `<p>Error loading movies.</p>`;
    }
}

function renderCategory(movies) {
    categoryGrid.innerHTML = movies.map(movie => createMovieCard(movie)).join('');
}

function createMovieCard(movie) {
    const rating = movie.rating && movie.rating !== "" ? `<div class="rating-tag">⭐ ${movie.rating}</div>` : "";
    return `
        <div class="movie-card" onclick="openMovieDetails('${movie.id}')">
            <div class="card-image">
                <img src="${movie.image}" alt="${movie.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
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

init();
