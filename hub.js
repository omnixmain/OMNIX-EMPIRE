const API_URL = 'https://omnix-empire-database.pages.dev/playlist/RoarZone_EMBY.json';
const moviesContainer = document.getElementById('movies-container');
const searchInput = document.getElementById('movieSearch');
let allMovies = [];

// Initialize
async function init() {
    try {
        const response = await fetch(API_URL);
        allMovies = await response.json();

        // Hide loader
        document.getElementById('loader').style.display = 'none';

        renderMovies(allMovies);
    } catch (error) {
        console.error('Error fetching movies:', error);
        moviesContainer.innerHTML = `<div class="error">Failed to load movies. Please try again later.</div>`;
    }
}

async function renderMovies(movies) {
    // Clear container except loader
    const existingCategories = moviesContainer.querySelectorAll('.category-section');
    existingCategories.forEach(cat => cat.remove());

    if (movies.length === 0) {
        moviesContainer.innerHTML += `<div class="no-results" style="padding: 3rem; text-align: center; color: var(--text-gray);">No movies found match your search.</div>`;
        return;
    }

    // Group by category
    const categories = {};
    movies.forEach(movie => {
        const cat = movie.category || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(movie);
    });

    // Sort categories alphabetically
    const categoryNames = Object.keys(categories).sort();

    // RENDER CATEGORIES ONE BY ONE (Non-blocking)
    for (const catName of categoryNames) {
        // Essential for performance: let the browser paint the first categories immediately
        await new Promise(resolve => setTimeout(resolve, 10));

        // SORT BY ID DESCENDING (Latest first)
        const sortedMovies = categories[catName].sort((a, b) => parseInt(b.id) - parseInt(a.id));

        const section = document.createElement('section');
        section.className = 'category-section';

        // LIMIT TO 15 FOR HUB - others via See All
        const displayLimit = 15;
        const moviesToDisplay = sortedMovies.slice(0, displayLimit);
        const hasMore = sortedMovies.length > displayLimit;

        section.innerHTML = `
            <div class="category-header">
                <h2 class="category-title">${catName}</h2>
                <a href="category.html?name=${encodeURIComponent(catName)}" class="see-all-link">See All →</a>
            </div>
            <div class="movie-grid">
                ${moviesToDisplay.map(movie => createMovieCard(movie)).join('')}
                ${hasMore ? `
                    <div class="movie-card see-more-card" onclick="window.location.href='category.html?name=${encodeURIComponent(catName)}'">
                        <div class="see-more-content">
                            <div class="icon-circle">
                                <span>+${sortedMovies.length - displayLimit}</span>
                            </div>
                            <span>View All</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        moviesContainer.appendChild(section);
    }
}

function createMovieCard(movie) {
    const rating = movie.rating && movie.rating !== "" ? `<div class="rating-tag">⭐ ${movie.rating}</div>` : "";

    return `
        <div class="movie-card" onclick="openMovieDetails('${movie.id}')">
            <div class="card-image">
                <img src="${movie.image}" 
                     alt="${movie.title}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                ${rating}
            </div>
            <div class="card-info">
                <h3>${movie.title}</h3>
                <p>${movie.year} • ${movie.duration || 'N/A'}</p>
            </div>
        </div>
    `;
}

// Function to open details page
window.openMovieDetails = (id) => {
    // We'll pass the movie ID to the details page
    window.location.href = `movie.html?id=${id}`;
};

// Search handling
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allMovies.filter(movie =>
        movie.title.toLowerCase().includes(term) ||
        movie.genres.toLowerCase().includes(term) ||
        movie.category.toLowerCase().includes(term)
    );
    renderMovies(filtered);
});

init();
