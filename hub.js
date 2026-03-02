const _0x1a2b = 'aHR0cHM6Ly9vbW5peC1lbXBpcmUtZGF0YWJhc2UucGFnZXMuZGV2L3BsYXlsaXN0L29tbml4LWtpbmctZmluYWwtZGF0YS5qc29u';
const API_URL = atob(_0x1a2b);
const moviesContainer = document.getElementById('movies-container');
const searchInput = document.getElementById('movieSearch');
const categoryBar = document.querySelector('.category__bar');
const paginationControls = document.getElementById('pagination-controls');

let allMovies = [];
let categoriesList = new Set();
let filteredMovies = [];
let currentCategory = 'All';
let currentPage = 1;
const itemsPerPage = 20;

async function init() {
    try {
        const response = await fetch(API_URL);
        const rawData = await response.json();

        allMovies = [];
        categoriesList.add('All');

        if (Array.isArray(rawData)) {
            allMovies = rawData;
        } else {
            for (const category in rawData) {
                categoriesList.add(category);
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

        // Sort movies: Newest to Oldest based on releasedate or year
        allMovies.sort((a, b) => {
            const dateA = a.releasedate ? new Date(a.releasedate) : new Date(`${a.year || 2000}-01-01`);
            const dateB = b.releasedate ? new Date(b.releasedate) : new Date(`${b.year || 2000}-01-01`);
            return dateB - dateA;
        });

        filteredMovies = [...allMovies];

        document.getElementById('loader').style.display = 'none';

        renderCategoryBar();
        renderGrid();

    } catch (error) {
        console.error('Error fetching movies:', error);
        moviesContainer.innerHTML = '<p style="text-align:center; padding: 40px;">Error loading OMNIX movies.</p>';
    }
}

function renderCategoryBar() {
    categoryBar.innerHTML = '';

    // Add standard categories
    categoriesList.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${currentCategory === cat ? 'active' : ''}`;
        btn.textContent = cat;
        btn.onclick = () => filterByCategory(cat);
        categoryBar.appendChild(btn);
    });

    // Add optional telegram button
    const tgBtn = document.createElement('a');
    tgBtn.href = "https://t.me/+vAocHIblVIBhZDc9"; // Replacing with custom link if needed, or leave generic
    tgBtn.target = "_blank";
    tgBtn.className = "telegram-btn";
    tgBtn.textContent = "Telegram";
    tgBtn.style.textDecoration = "none";
    categoryBar.appendChild(tgBtn);
}

function filterByCategory(cat) {
    currentCategory = cat;
    currentPage = 1; // reset page array

    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === cat);
    });

    const searchTerm = searchInput.value.toLowerCase().trim();
    applyFilters(searchTerm, cat);
}

function applyFilters(searchTerm, category) {
    filteredMovies = allMovies.filter(m => {
        const matchesSearch = m.title.toLowerCase().includes(searchTerm) ||
            (m.genres && m.genres.toLowerCase().includes(searchTerm));
        const matchesCategory = category === 'All' || m.category === category;
        return matchesSearch && matchesCategory;
    });

    currentPage = 1;
    renderGrid();
}

function renderGrid() {
    // Clear movie nodes, keep loader if needed but hidden
    moviesContainer.innerHTML = '';

    if (filteredMovies.length === 0) {
        moviesContainer.innerHTML = '<p style="text-align:center; padding: 40px; width: 100%;">No movies found.</p>';
        paginationControls.innerHTML = '';
        return;
    }

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedItems = filteredMovies.slice(startIdx, endIdx);

    paginatedItems.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => window.location.href = `movie.html?id=${movie.id}`;

        let qualities = "";
        if (movie.watchNowUrls) {
            qualities = Object.keys(movie.watchNowUrls).join(' ');
        }

        card.innerHTML = `
            <div class="card-image">
                <img src="${movie.image}" alt="${movie.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450?text=OMNIX'">
                ${movie.rating ? `<div class="rating-tag">⭐ ${movie.rating}</div>` : ''}
            </div>
            <div class="card-info">
                <h3>${movie.title}</h3>
                <p>Download ${qualities}</p>
            </div>
        `;
        moviesContainer.appendChild(card);
    });

    renderPagination();
}

function renderPagination() {
    paginationControls.innerHTML = '';
    const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);

    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderGrid();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    paginationControls.appendChild(prevBtn);

    // Page Numbers (Truncated logic for clean UI)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        paginationControls.appendChild(createPageBtn(1));
        if (startPage > 2) paginationControls.appendChild(createEllipsis());
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationControls.appendChild(createPageBtn(i));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) paginationControls.appendChild(createEllipsis());
        paginationControls.appendChild(createPageBtn(totalPages));
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderGrid();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    paginationControls.appendChild(nextBtn);
}

function createPageBtn(pageNum) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${currentPage === pageNum ? 'active' : ''}`;
    btn.textContent = pageNum;
    btn.onclick = () => {
        currentPage = pageNum;
        renderGrid();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    return btn;
}

function createEllipsis() {
    const span = document.createElement('span');
    span.textContent = '...';
    span.style.color = 'var(--text-gray)';
    return span;
}

// Search listener
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
