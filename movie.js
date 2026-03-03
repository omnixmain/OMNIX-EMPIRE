// Obfuscated API URL
const _0x1a2b = 'aHR0cHM6Ly9vbW5peC1lbXBpcmUtZGF0YWJhc2UucGFnZXMuZGV2L3BsYXlsaXN0L29tbml4LWtpbmctZmluYWwtZGF0YS5qc29u';
const API_URL = atob(_0x1a2b);
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
        const rawData = await response.json();

        allMovies = [];
        if (Array.isArray(rawData)) {
            allMovies = rawData;
        } else {
            for (const category in rawData) {
                rawData[category].forEach(m => {
                    m.category = category;
                    m.image = m.poster || m.image;
                    if (m.metadata && typeof m.metadata === 'string') {
                        const parts = m.metadata.split('•').map(p => p.trim());
                        m.duration = parts[0]?.trim() || '';
                        m.genres = parts[1]?.trim() || '';
                    }
                    allMovies.push(m);
                });
            }
        }

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
                        <span class="meta-item" style="color:#46d369; font-weight:800;">${Math.floor(Math.random() * 20) + 80}% Match</span>
                        <span class="meta-item">${movie.year}</span>
                        <span class="quality-badge">${movie.video_quality || 'HD'}</span>
                        <span class="meta-item">${movie.duration || ''}</span>
                    </div>
                    <p class="overview">${movie.overview || ''}</p>
                    <p style="color:var(--text-gray); font-size: 0.9rem; margin-bottom: 2rem;"><strong>Genres:</strong> ${movie.genres || 'N/A'}</p>
                    
                    <div class="actions" style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 1.5rem;">
                        ${movie.watchNowUrls ? Object.keys(movie.watchNowUrls).map(quality => `
                            <div style="display: flex; gap: 10px; align-items: center; border: 1px solid rgba(255,255,255,0.2); padding: 5px; border-radius: 8px; background: rgba(0,0,0,0.5);">
                                <button class="primary-btn" onclick="goToPlayer('${movie.id}', '${quality}')" style="background: white; color: black; font-size: 1rem; padding: 8px 20px; border-radius: 6px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                    Play ${quality}
                                </button>
                                <button class="primary-btn" onclick="downloadVideo('${movie.watchNowUrls[quality]}')" style="background: rgba(255,255,255,0.1); color: white; font-size: 1rem; padding: 8px 15px; border-radius: 6px;" title="Download">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    Download
                                </button>
                            </div>
                        `).join('') : `
                            <div style="display: flex; gap: 10px; align-items: center; border: 1px solid rgba(255,255,255,0.2); padding: 5px; border-radius: 8px; background: rgba(0,0,0,0.5);">
                                <button class="primary-btn" onclick="goToPlayer('${movie.id}', 'default')" style="background: white; color: black; font-size: 1rem; padding: 8px 20px; border-radius: 6px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                    Play
                                </button>
                            </div>
                        `}
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

window.goToPlayer = (id, quality) => {
    window.location.href = `vodplay.html?id=${id}&q=${quality}&back=movie.html`;
};

window.downloadVideo = (url) => {
    // Open the direct link for downloading/streaming externally
    window.open(url, '_blank');
};

init();
