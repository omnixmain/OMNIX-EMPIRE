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

let shakaPlayer = null;
let shakaUI = null;

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

    // Limit rendering for performance
    // Let's render max 50 items initially to avoid DOM lock
    const renderLimit = Math.min(filtered.length, 50);

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
            // Replace lazy video hover previews with placeholder to save resources
            mediaHtml = `<img src="https://via.placeholder.com/300x169/141414/e50914?text=${encodeURIComponent(item.title)}" loading="lazy" alt="${item.title}">`;
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
}

function openPlayer(item) {
    playerTitle.textContent = item.title;
    const url = item.url;

    // We will initialize the player if it doesn't exist yet for this session.
    // If it does exist, we just load the new source.
    initPlayer().then(() => {
        loadVideo(url);
    }).catch(error => {
        console.error("Error setting up Shaka Player:", error);
    });

    populateRecommended(item);
    playerModal.style.display = 'flex';
}

async function initPlayer() {
    if (shakaPlayer) return; // Already initialized

    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();

    // Check to see if the browser supports the basic APIs Shaka needs.
    if (!shaka.Player.isBrowserSupported()) {
        console.error('Browser not supported!');
        return;
    }

    const video = document.getElementById('mainVideo');
    const container = document.getElementById('videoContainer');

    shakaPlayer = new shaka.Player(video);
    shakaUI = new shaka.ui.Overlay(shakaPlayer, container, video);

    // Configure the Player logic to avoid freezing
    shakaPlayer.configure({
        streaming: {
            bufferingGoal: 7, // Kept low for Live streams with limited windows
            rebufferingGoal: 1.5, // Start playing faster after a freeze
            bufferBehind: 10,
            jumpLargeGaps: true, // Jump over gaps in the stream
            ignoreTextStreamFailures: true,
            alwaysStreamText: false,
        },
        manifest: {
            retryParameters: {
                maxAttempts: 15, // Increase max attempts for flaky streams
                baseDelay: 1000,
                backoffFactor: 1.5,
                fuzzFactor: 0.5,
                timeout: 10000,
            }
        },
        abr: {
            enabled: false, // Many IPTV streams report wrong bandwidth leading to constant freezing attempts
        }
    });

    // Configure the UI
    const config = {
        'controlPanelElements': [
            'play_pause', 'time_and_duration', 'spacer', 'mute', 'volume',
            'playback_rate', 'quality', 'language', 'picture_in_picture', 'fullscreen'
        ],
        'playbackRates': [0.5, 0.75, 1, 1.25, 1.5, 2],
    };
    shakaUI.configure(config);

    // Listen for error events.
    shakaPlayer.addEventListener('error', onErrorEvent);
}

async function loadVideo(url) {
    if (!shakaPlayer) return;
    try {
        await shakaPlayer.load(url);
        // This runs if the asynchronous load is successful.
        console.log('The video has now been loaded!');
    } catch (e) {
        onError(e);
    }
}

function onErrorEvent(event) {
    onError(event.detail);
}

function onError(error) {
    console.error('Error code', error.code, 'object', error);
}

/* Removed old Plyr / HLS.js logic */

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

    const finalRecs = similar.sort(() => 0.5 - Math.random()).slice(0, 8);

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
            // Replace lazy video hover previews with placeholder to save resources
            mediaHtml = `<img src="https://via.placeholder.com/300x169/141414/e50914?text=${encodeURIComponent(item.title)}" loading="lazy" alt="${item.title}">`;
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
}

function closePlayer() {
    playerModal.style.display = 'none';
    if (shakaPlayer) {
        // Unload the current stream to stop downloading and playing
        shakaPlayer.unload().catch(error => {
            console.error("Error unloading Shaka player:", error);
        });
    }
}

// Close player if clicked outside the content content
playerModal.addEventListener('click', (e) => {
    if (e.target === playerModal) {
        closePlayer();
    }
});

init();
