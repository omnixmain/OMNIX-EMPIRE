const SOURCE_1 = 'https://raw.githubusercontent.com/bugsfreeweb/LiveTVCollector/refs/heads/main/Movies/Private/Movies.m3u';
const SOURCE_2 = 'https://xc.adultiptv.net/get.php?username=adultiptv&password=adultiptv&type=m3u';

const videoGrid = document.getElementById('videoGrid');
const searchInput = document.getElementById('searchInput');
const categoryList = document.getElementById('categoryList');
const loader = document.getElementById('loader');

// Player Elements
const playerModal = document.getElementById('playerModal');
const mainVideo = document.getElementById('mainVideo');
const playerTitle = document.getElementById('playerTitle');

let allItems = [];
let currentCategory = 'all';

let plyrPlayer = null;
let hlsInstance = null;

const CORS_PROXIES = [
    '', // Try direct first
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
];

async function fetchWithProxy(url) {
    for (let proxy of CORS_PROXIES) {
        try {
            const fetchUrl = proxy ? proxy + encodeURIComponent(url) : url;
            const res = await fetch(fetchUrl);
            if (res.ok) {
                return await res.text();
            }
        } catch (e) {
            console.warn(`Proxy ${proxy} failed for ${url}`);
        }
    }
    return "";
}

async function init() {
    try {
        // Fetch both sources concurrently using proxy fallback
        const [text1, text2] = await Promise.all([
            fetchWithProxy(SOURCE_1),
            fetchWithProxy(SOURCE_2)
        ]);

        // Parse both
        const items1 = parseM3U(text1, 'Source 1');
        const items2 = parseM3U(text2, 'Source 2');

        allItems = [...items1, ...items2];

        loader.style.display = 'none';

        if (allItems.length === 0) {
            videoGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2rem;">No content could be loaded. It might be blocked by CORS at this moment. You can try installing a CORS unblocker extension.</div>`;
            return;
        }

        populateCategories();
        renderGrid();
    } catch (error) {
        console.error("Error loading M3U:", error);
        loader.innerHTML = `<p style="color:var(--primary)">Failed to load data. Please check connection.</p>`;
    }
}

function parseM3U(m3uText, sourceName) {
    if (!m3uText) return [];

    const lines = m3uText.split(/\r?\n/);
    const results = [];
    let currentItem = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
            currentItem = {};

            // Extract duration (the number right after #EXTINF:)
            const durationMatch = line.match(/#EXTINF:([-0-9]+)/);
            let duration = durationMatch ? durationMatch[1] : "-1";

            // Extract other attributes
            const getAttr = (name) => {
                const regex = new RegExp(`${name}=(?:"([^"]*)"|([^ ,]+))`, 'i');
                const match = line.match(regex);
                return match ? (match[1] !== undefined ? match[1] : match[2]) : "";
            };

            let logo = getAttr('tvg-logo');
            if (!logo) logo = getAttr('logo');
            let group = getAttr('group-title');

            if (!group) {
                // simple fallback if group-title missing
                group = "Other";
            }

            // Extract title (everything after the last comma)
            const splitComma = line.split(',');
            const title = splitComma.length > 1 ? splitComma[splitComma.length - 1].trim() : "Unknown Title";

            currentItem.title = title;
            currentItem.logo = logo;
            currentItem.group = group;

        } else if (line.startsWith('http') && currentItem) {
            currentItem.url = line;

            // Per user request, force everything to show as LIVE
            currentItem.type = 'live';

            results.push(currentItem);
            currentItem = null;
        }
    }
    return results;
}

function populateCategories() {
    const groups = new Set();
    allItems.forEach(item => {
        if (item.group) groups.add(item.group);
    });

    const sortedGroups = Array.from(groups).sort();

    sortedGroups.forEach(group => {
        const li = document.createElement('li');
        li.className = 'cat-item';
        li.dataset.cat = group;
        li.textContent = group;
        li.addEventListener('click', () => {
            document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            currentCategory = group;
            renderGrid();
        });
        categoryList.appendChild(li);
    });

    // Reattach event for 'All Categories'
    document.querySelector('.cat-item[data-cat="all"]').addEventListener('click', (e) => {
        document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = 'all';
        renderGrid();
    });
}

// Search input handler
searchInput.addEventListener('input', () => {
    renderGrid();
});

function renderGrid() {
    const searchTerm = searchInput.value.toLowerCase();

    const filtered = allItems.filter(item => {
        // Filter by Category
        if (currentCategory !== 'all' && item.group !== currentCategory) return false;

        // Filter by Search
        if (searchTerm && !item.title.toLowerCase().includes(searchTerm) && !item.group.toLowerCase().includes(searchTerm)) return false;

        return true;
    });

    videoGrid.innerHTML = '';

    if (filtered.length === 0) {
        videoGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color:var(--text-gray);">No videos found.</div>`;
        return;
    }

    // Limit rendering for performance if it's too huge, but usually adult M3Us are easily handleable
    // Let's render max 200 items initially to avoid DOM lock
    const renderLimit = Math.min(filtered.length, 300);

    for (let i = 0; i < renderLimit; i++) {
        const item = filtered[i];

        const card = document.createElement('div');
        card.className = 'video-card';
        card.onclick = () => openPlayer(item);

        const badgeClass = item.type === 'live' ? 'live-badge' : 'vod-badge';
        const badgeText = item.type === 'live' ? 'LIVE' : 'VOD';

        let mediaHtml = '';
        if (item.logo) {
            mediaHtml = `<img src="${item.logo}" alt="${item.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x169/141414/e50914?text=No+Image'">`;
        } else {
            mediaHtml = `<video data-src="${item.url}" class="lazy-video" preload="none" muted playsinline style="width:100%; height:100%; object-fit:cover;" onmouseover="this.play().catch(e=>{})" onmouseout="this.pause()"></video>`;
        }

        card.innerHTML = `
            <div class="card-image">
                <span class="${badgeClass}">${badgeText}</span>
                ${mediaHtml}
            </div>
            <div class="card-info">
                <h3>${item.title}</h3>
                <p>${item.group}</p>
            </div>
        `;

        videoGrid.appendChild(card);
    }

    // IntersectionObserver to fetch video metadata when in view
    if (!window.videoObserver) {
        window.videoObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                const v = entry.target;
                if (entry.isIntersecting) {
                    if (v.dataset.src) {
                        v.src = v.dataset.src;
                        v.preload = "metadata"; // Load just enough for a starting frame
                        v.removeAttribute('data-src');
                    }
                } else if (!v.paused) {
                    v.pause(); // Pause off-screen videos to save resources
                }
            });
        }, { rootMargin: '150px' });
    }

    document.querySelectorAll('.video-grid .lazy-video').forEach(vid => {
        window.videoObserver.observe(vid);
    });
}

function openPlayer(item) {
    if (plyrPlayer) {
        plyrPlayer.destroy();
        plyrPlayer = null;
    }
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }

    playerTitle.textContent = item.title;
    const url = item.url;

    // Clear old source
    mainVideo.src = '';
    mainVideo.removeAttribute('src');

    const defaultOptions = {
        autoplay: true,
        controls: [
            'play-large', 'restart', 'rewind', 'play', 'fast-forward',
            'progress', 'current-time', 'duration', 'mute', 'volume',
            'captions', 'settings', 'pip', 'airplay', 'fullscreen'
        ],
        settings: ['quality', 'speed', 'loop'],
    };

    if (Hls.isSupported() && (url.includes('.m3u8') || url.includes('.ts') || url.includes('.m3u'))) {
        hlsInstance = new Hls({
            maxMaxBufferLength: 60,
            maxBufferSize: 30 * 1000 * 1000,
            manifestLoadingMaxRetry: 5,
        });

        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(mainVideo);
        window.hlsInstance = hlsInstance;

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
            const availableQualities = hlsInstance.levels.map((l) => l.height);
            availableQualities.unshift(0); // Auto mode

            defaultOptions.quality = {
                default: 0,
                options: availableQualities,
                forced: true,
                onChange: (e) => updateQuality(e),
            };

            plyrPlayer = new Plyr(mainVideo, defaultOptions);
            plyrPlayer.play().catch(e => console.log('Autoplay prevented', e));
        });

        hlsInstance.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log("fatal network error encountered, try to recover");
                        hlsInstance.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log("fatal media error encountered, try to recover");
                        hlsInstance.recoverMediaError();
                        break;
                    default:
                        hlsInstance.destroy();
                        break;
                }
            }
        });
    } else {
        // Native fallback or MP4
        mainVideo.src = url;
        plyrPlayer = new Plyr(mainVideo, defaultOptions);
        plyrPlayer.play().catch(e => console.log('Autoplay prevented', e));
    }

    populateRecommended(item);

    playerModal.style.display = 'flex';
}

function updateQuality(newQuality) {
    if (!window.hlsInstance) return;
    window.hlsInstance.levels.forEach((level, levelIndex) => {
        if (level.height === newQuality) {
            console.log("Found quality match with " + newQuality);
            window.hlsInstance.currentLevel = levelIndex;
        }
    });
    if (newQuality === 0) {
        window.hlsInstance.currentLevel = -1; //Enable AUTO quality if option.value = 0
    }
}

function populateRecommended(currentItem) {
    const recommendedGrid = document.getElementById('recommendedGrid');
    recommendedGrid.innerHTML = '';

    // Filter videos for the same category, excluding current
    let similar = allItems.filter(v => v !== currentItem && v.group === currentItem.group);

    // If not enough similar, add random ones
    if (similar.length < 10) {
        const others = allItems.filter(v => v !== currentItem && v.group !== currentItem.group);
        const randomOthers = others.sort(() => 0.5 - Math.random()).slice(0, 12 - similar.length);
        similar = [...similar, ...randomOthers];
    }

    const finalRecs = similar.sort(() => 0.5 - Math.random()).slice(0, 12);

    finalRecs.forEach(item => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.onclick = () => {
            document.querySelector('.player-body').scrollTop = 0;
            openPlayer(item);
        };

        const badgeClass = item.type === 'live' ? 'live-badge' : 'vod-badge';
        const badgeText = item.type === 'live' ? 'LIVE' : 'VOD';

        let mediaHtml = '';
        if (item.logo) {
            mediaHtml = `<img src="${item.logo}" alt="${item.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x169/141414/e50914?text=No+Image'">`;
        } else {
            mediaHtml = `<video data-src="${item.url}" class="lazy-video" preload="none" muted playsinline style="width:100%; height:100%; object-fit:cover;" onmouseover="this.play().catch(e=>{})" onmouseout="this.pause()"></video>`;
        }

        card.innerHTML = `
            <div class="card-image">
                <span class="${badgeClass}">${badgeText}</span>
                ${mediaHtml}
            </div>
            <div class="card-info">
                <h3>${item.title}</h3>
                <p>${item.group}</p>
            </div>
        `;
        recommendedGrid.appendChild(card);
    });

    // Attach observer to new recommended videos
    document.querySelectorAll('#recommendedGrid .lazy-video').forEach(vid => {
        if (window.videoObserver) window.videoObserver.observe(vid);
    });
}

function closePlayer() {
    playerModal.style.display = 'none';
    if (plyrPlayer) {
        plyrPlayer.pause();
        plyrPlayer.destroy();
        plyrPlayer = null;
    }
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    mainVideo.src = '';
}

// Close player if clicked outside the content content
playerModal.addEventListener('click', (e) => {
    if (e.target === playerModal) {
        closePlayer();
    }
});

init();
