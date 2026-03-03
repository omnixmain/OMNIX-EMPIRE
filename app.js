// OMNIX SPORTS HUB - Main Logic
const API_ENDPOINTS = {
    fancode1: 'https://allinonereborn.online/fctest/json/fancode_latest.json',
    fancode2: 'https://raw.githubusercontent.com/Jitendra-unatti/fancode/refs/heads/main/data/fancode.json',
    sonyliv1: 'https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json',
    sonyliv2: 'https://github.com/doctor-8trange/zyphora/raw/refs/heads/main/data/sony.json',
    jiohot: 'https://voot.vodep39240327.workers.dev?voot.m3u',
    m3u1: 'https://dl.dropbox.com/scl/fi/d9n6xrp813zx4o7wc56w9/tv-prueba.txt?rlkey=x7c45o26fr8x7bqqa42uv470m&st=8aic1pey&.m3u',
    m3u2: 'https://raw.githubusercontent.com/BuddyChewChew/sports/refs/heads/main/liveeventsfilter.m3u8'
};

let allEvents = [];
let currentFilter = 'all';
let currentStatus = 'all';

// DOM Elements
const eventsGrid = document.getElementById('eventsGrid');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('searchInput');
const navLinks = document.querySelectorAll('.nav-links li');
const filterBtns = document.querySelectorAll('.filter-btn');
const categoryTitle = document.getElementById('categoryTitle');

// Modal & Player
const modal = document.getElementById('playerModal');
const closeModalBtn = document.getElementById('closeModal');
const videoElement = document.getElementById('videoElement');
const modalTitle = document.getElementById('modalTitle');
const modalCategory = document.getElementById('modalCategory');
const modalDesc = document.getElementById('modalDesc');
const playerError = document.getElementById('playerError');

let shakaPlayer = null;

// Initialize Shaka Player
async function initPlayer() {
    shaka.polyfill.installAll();
    if (shaka.Player.isBrowserSupported()) {
        shakaPlayer = new shaka.Player(videoElement);
        shakaPlayer.addEventListener('error', onPlayerErrorEvent);
    } else {
        console.error('Browser not supported by Shaka Player.');
    }
}

function onPlayerErrorEvent(event) {
    console.error('Shaka Error:', event.detail);
    showPlayerError(event.detail ? event.detail.code : null);
}

function showPlayerError(code) {
    const errorP = playerError.querySelector('p');
    if (code) {
        errorP.textContent = `Stream error (Shaka Code: ${code}). CORS restriction or DRM missing.`;
    } else {
        errorP.textContent = 'Stream not available or requires DRM keys not present in API.';
    }
    playerError.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    initPlayer();
    fetchAllData();
});

// Fetching Logic
async function fetchAllData() {
    loader.classList.remove('hidden');
    eventsGrid.innerHTML = '';

    try {
        const [fc1Res, fc2Res, sl1Res, sl2Res, jiohotRes, m3u1Res, m3u2Res] = await Promise.allSettled([
            fetch(API_ENDPOINTS.fancode1).then(r => r.json()),
            fetch(API_ENDPOINTS.fancode2).then(r => r.json()),
            fetch(API_ENDPOINTS.sonyliv1).then(r => r.json()),
            fetch(API_ENDPOINTS.sonyliv2).then(r => r.json()),
            fetch(API_ENDPOINTS.jiohot).then(r => r.text()),
            fetch(API_ENDPOINTS.m3u1).then(r => r.text()),
            fetch(API_ENDPOINTS.m3u2).then(r => r.text())
        ]);

        let parsedEvents = [];

        // Parse Fancode 1
        if (fc1Res.status === 'fulfilled' && fc1Res.value.matches) {
            parsedEvents = parsedEvents.concat(parseFancode(fc1Res.value.matches, 'Fancode 1', 'fancode1', fc1Res.value.headers));
        }
        // Parse Fancode 2
        if (fc2Res.status === 'fulfilled' && fc2Res.value.matches) {
            parsedEvents = parsedEvents.concat(parseFancode(fc2Res.value.matches, 'Fancode 2', 'fancode2', fc2Res.value.headers));
        }

        // Parse Sony Liv 1
        if (sl1Res.status === 'fulfilled') {
            const val1 = sl1Res.value;
            if (val1 && Array.isArray(val1)) {
                val1.forEach(item => {
                    if (item.matches && Array.isArray(item.matches)) {
                        parsedEvents = parsedEvents.concat(parseSonyLiv(item.matches, 'Sony Liv 1', 'sonyliv1'));
                    } else if (item.event_name) {
                        parsedEvents = parsedEvents.concat(parseSonyLiv([item], 'Sony Liv 1', 'sonyliv1'));
                    }
                });
            } else if (val1 && val1.matches) {
                parsedEvents = parsedEvents.concat(parseSonyLiv(val1.matches, 'Sony Liv 1', 'sonyliv1'));
            }
        }

        // Parse Sony Liv 2
        if (sl2Res.status === 'fulfilled') {
            const val2 = sl2Res.value;
            if (val2 && val2.data && Array.isArray(val2.data)) {
                parsedEvents = parsedEvents.concat(parseSonyLiv(val2.data, 'Sony Liv 2', 'sonyliv2'));
            } else if (val2 && val2.upcoming && Array.isArray(val2.upcoming)) {
                parsedEvents = parsedEvents.concat(parseSonyLiv(val2.upcoming, 'Sony Liv 2', 'sonyliv2'));
            } else if (val2 && Array.isArray(val2)) {
                parsedEvents = parsedEvents.concat(parseSonyLiv(val2, 'Sony Liv 2', 'sonyliv2'));
            }
        }

        // Parse JIO-HOT
        if (jiohotRes.status === 'fulfilled') {
            parsedEvents = parsedEvents.concat(parseJioHot(jiohotRes.value));
        }

        // Parse M3U
        if (m3u1Res.status === 'fulfilled') {
            parsedEvents = parsedEvents.concat(parseM3U(m3u1Res.value, 'Live Channels', 'm3u'));
        }
        if (m3u2Res.status === 'fulfilled') {
            parsedEvents = parsedEvents.concat(parseM3U(m3u2Res.value, 'Live Events', 'm3u'));
        }

        // Deduplicate slightly by title or ID (optional, simple dedup logic)
        allEvents = dedupEvents(parsedEvents);

        renderEvents();
    } catch (e) {
        console.error("Error fetching data:", e);
    } finally {
        loader.classList.add('hidden');
    }
}

// Parsers
function parseFancode(matches, source, sourceFilter, globalHeaders = {}) {
    return matches.map(m => {
        let streamUrl = null;
        let headers = { ...globalHeaders };
        let drm = null;

        if (m.STREAMING_CDN && m.STREAMING_CDN.Primary_Playback_URL && m.STREAMING_CDN.Primary_Playback_URL !== "Unavailable") {
            streamUrl = m.STREAMING_CDN.Primary_Playback_URL;
        } else if (m.STREAMING_CDN && m.STREAMING_CDN.fancode_cdn && m.STREAMING_CDN.fancode_cdn !== "Unavailable") {
            streamUrl = m.STREAMING_CDN.fancode_cdn;
        } else if (m.streams && m.streams.length > 0) {
            streamUrl = m.streams[0].playlist_url || null;
        } else if (m.auto_streams && m.auto_streams.length > 0 && m.auto_streams[0].auto) {
            // Some providers put the Master M3U in 'auto', but we prefer a direct link
            streamUrl = m.auto_streams[0].stream_url || m.auto_streams[0].url || null;
            if (!streamUrl && m.streams?.[0]?.playlist_url) streamUrl = m.streams[0].playlist_url;
        }

        // Fancode specific headers
        if (streamUrl) {
            if (!headers["User-Agent"]) headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            if (!headers["Referer"]) headers["Referer"] = "https://fancode.com/";
            if (!headers["Origin"]) headers["Origin"] = "https://fancode.com";
        }

        return {
            id: m.match_id || Math.random().toString(),
            title: m.title || "Unknown Event",
            category: m.category || "Cricket",
            image: m.image_cdn?.APP || m.image || 'https://via.placeholder.com/640x360/1F2833/66FCF1?text=OMNIX+Sports',
            status: m.status === 'LIVE' ? 'LIVE' : 'UPCOMING',
            startTime: m.startTime || "",
            source: source,
            sourceFilter: sourceFilter,
            streamUrl: streamUrl,
            headers: headers,
            drm: drm
        };
    });
}

function parseSonyLiv(items, source, sourceFilter) {
    return items.map(m => {
        let streamUrl = m.src_url || m.streamUrl || null;
        let drm = null;
        let headers = {};

        // In JSON data, check for stream_info or secondary links
        if (!streamUrl && m.stream_info) {
            // Future expansion for protected SonyLiv links
        }

        return {
            id: m.contentId || Math.random().toString(),
            title: m.event_name || m.title || "Sony Liv Event",
            category: m.event_category || "Sports",
            image: m.src || m.image || 'https://via.placeholder.com/640x360/1F2833/45A29E?text=Sony+Liv',
            status: m.isLive ? 'LIVE' : 'UPCOMING',
            startTime: m.startTime || "Live TV",
            source: source,
            sourceFilter: sourceFilter,
            streamUrl: streamUrl,
            headers: headers,
            drm: drm
        };
    });
}

// Helper to extract attributes from #EXTINF line
function extractM3UAttribute(line, attr) {
    const match = line.match(new RegExp(`${attr}="([^"]+)"`, 'i'));
    return match ? match[1] : null;
}

// Parser for standard M3U playlist format (#EXTINF lines)
function parseM3U(text, source, sourceFilter = 'm3u') {
    const lines = text.split('\n');
    let events = [];
    let currentEvent = null;

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            currentEvent = {
                id: Math.random().toString(),
                status: 'LIVE',
                source: source,
                sourceFilter: sourceFilter,
                startTime: '24/7 Channel',
                streamUrl: null,
                drm: null,
                headers: {},
                image: extractM3UAttribute(line, 'tvg-logo') || 'https://via.placeholder.com/640x360/0B0C10/FFFFFF?text=Live+TV',
                category: extractM3UAttribute(line, 'group-title') || "TV Channel"
            };

            // Extract Title
            const titleSplit = line.split(',');
            if (titleSplit.length > 1) {
                currentEvent.title = titleSplit[titleSplit.length - 1].trim();
            } else {
                currentEvent.title = "Live Channel";
            }

        } else if (line.startsWith('#KODIPROP:') || line.startsWith('#WV_LICENSE_URL:') || line.startsWith('#DRM-LICENSE-URL:')) {
            if (currentEvent) {
                const tag = line.includes(':') ? line.split(':')[0] : '#KODIPROP';
                const parts = line.replace(tag + ':', '').split('=');
                if (parts.length >= 2 || line.startsWith('#WV_LICENSE_URL') || line.startsWith('#DRM-LICENSE-URL')) {
                    if (!currentEvent.drm) currentEvent.drm = { type: 'com.widevine.alpha' };

                    if (line.includes('license_type')) currentEvent.drm.type = parts[parts.length - 1].trim();
                    if (line.includes('license_key') || line.startsWith('#WV_LICENSE_URL') || line.startsWith('#DRM-LICENSE-URL')) {
                        currentEvent.drm.licenseUrl = line.split(':').slice(1).join(':').trim();
                        if (currentEvent.drm.licenseUrl.includes('=')) {
                            currentEvent.drm.licenseUrl = parts.slice(1).join('=').trim();
                        }
                    }
                }
            }
        } else if (line.startsWith('#EXT-X-SESSION-KEY:')) {
            if (currentEvent) {
                const uriMatch = line.match(/URI="([^"]+)"/);
                if (uriMatch) {
                    if (!currentEvent.drm) currentEvent.drm = { type: 'com.widevine.alpha' };
                    currentEvent.drm.licenseUrl = uriMatch[1];
                }
            }
        } else if (line.startsWith('#EXTHTTP:')) {
            if (currentEvent) {
                try {
                    currentEvent.headers = JSON.parse(line.replace('#EXTHTTP:', ''));
                } catch (e) { }
            }
        } else if (line.startsWith('http')) {
            if (currentEvent) {
                currentEvent.streamUrl = line;
                events.push(currentEvent);
                currentEvent = null;
            }
        }
    });
    return events;
}

// Parser for JIO-HOT non-standard format:
// Handles both #EXTINF and URL-only variants, extracts DRM and headers
function parseJioHot(text) {
    const lines = text.split('\n');
    let events = [];
    let current = null;
    let channelIndex = 1;

    // Category logos
    const LOGOS = {
        'Sports': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Star_Sports_logo.svg/200px-Star_Sports_logo.svg.png',
        'Entertainment': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Hotstar_Logo.png/200px-Hotstar_Logo.png',
        'News': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/CNBC-TV18_Logo.svg/200px-CNBC-TV18_Logo.svg.png',
        'Kids': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Nickelodeon_2009_logo.svg/200px-Nickelodeon_2009_logo.svg.png',
        'Music': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/MTV_India_2022_Logo.svg/200px-MTV_India_2022_Logo.svg.png',
        'Movies': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Hotstar_Logo.png/200px-Hotstar_Logo.png',
        'JIO-HOT': 'https://img.hotstar.com/image/upload/v1737554969/web-assets/prod/images/rebrand/logo.png',
    };

    // Helper to clean hashes and generic segments
    const isHexHash = s => /^[0-9a-f]{10,}$/i.test(s);
    const SKIP = new Set(['dash', 'live', 'bpk-tv', 'mp1', 'mp2', 'Fallback', 'index_7.m3u8', 'master.mpd', 'manifest']);

    function resetCurrent() {
        current = {
            id: 'jiohot_' + (channelIndex++),
            status: 'LIVE',
            startTime: '24/7 Live',
            source: 'JIO-HOT',
            sourceFilter: 'jiohot',
            headers: {},
            drm: null,
            image: null,
            category: 'JIO-HOT'
        };
    }

    resetCurrent();

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            current.title = line.split(',').pop().trim();
            current.image = extractM3UAttribute(line, 'tvg-logo');
            current.category = extractM3UAttribute(line, 'group-title') || 'JIO-HOT';
        } else if (line.startsWith('#EXTHTTP:')) {
            try {
                current.headers = JSON.parse(line.replace('#EXTHTTP:', ''));
            } catch (e) { }
        } else if (line.startsWith('#KODIPROP:')) {
            const parts = line.replace('#KODIPROP:', '').split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                if (!current.drm) current.drm = {};
                if (key.includes('license_type')) current.drm.type = value;
                if (key.includes('license_key')) current.drm.licenseUrl = value;
            }
        } else if (line.startsWith('http')) {
            current.streamUrl = line;

            // Derive title if missing
            if (!current.title) {
                try {
                    const url = new URL(line);
                    const segments = url.pathname.split('/').filter(s => s && !SKIP.has(s) && !isHexHash(s));
                    if (segments.length > 0) {
                        current.title = segments[segments.length - 1]
                            .replace(/[-_]/g, ' ')
                            .replace(/\b\w/g, c => c.toUpperCase())
                            .replace(/\s*(Wv|Mob|Hls|Livetvwv|Livetvhls|Hd\d?)$/i, '')
                            .replace(/News18\s+/i, 'News18 ')
                            .trim();
                    }
                } catch (e) { }
            }
            if (!current.title) current.title = 'JIO-HOT Ch ' + (channelIndex - 1);

            // Derive category and logo
            const lowerTitle = current.title.toLowerCase();
            const lowerUrl = line.toLowerCase();
            if (lowerTitle.includes('sports') || lowerUrl.includes('sshd') || lowerUrl.includes('select')) current.category = 'Sports';
            else if (lowerTitle.includes('news') || lowerUrl.includes('cnbc') || lowerUrl.includes('news18')) current.category = 'News';
            else if (lowerTitle.includes('colors') || lowerTitle.includes('gec') || lowerTitle.includes('star') || lowerUrl.includes('hotstar')) current.category = 'Entertainment';
            else if (lowerTitle.includes('nick') || lowerTitle.includes('sonic')) current.category = 'Kids';
            else if (lowerTitle.includes('music') || lowerTitle.includes('mtv')) current.category = 'Music';

            if (!current.image) {
                current.image = LOGOS[current.category] || LOGOS['JIO-HOT'];
            }

            // Fallback DRM for Widevine
            if (!current.drm && line.includes('.mpd')) {
                current.drm = {
                    type: 'com.widevine.alpha',
                    licenseUrl: 'https://pallycon.allinonereborn.workers.dev/api/license/widevine'
                };
            }

            events.push(current);
            resetCurrent();
        }
    });

    return events;
}

function dedupEvents(events) {
    const seen = new Set();
    return events.filter(e => {
        const uniqueKey = `${e.title}_${e.source}`;
        if (seen.has(uniqueKey)) return false;
        seen.add(uniqueKey);
        return true;
    });
}

// Navigation Elements
const statusLinks = document.querySelectorAll('.status-links li');
const catLinks = document.querySelectorAll('.cat-links li');

let currentProvider = 'fancode1';

// Provider Sidebar Filtering (Fancode / SonyLiv / etc.)
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        navLinks.forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentProvider = e.currentTarget.dataset.filter;
        renderEvents();
    });
});

// Status filtering (All, Live, Upcoming, Completed)
statusLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        statusLinks.forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentStatus = e.currentTarget.dataset.status;
        renderEvents();
    });
});

// Category filtering (All Sports, Football, Cricket etc.)
catLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        catLinks.forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentFilter = e.currentTarget.dataset.filter;
        renderEvents();
    });
});

// Rendering Updates
function renderEvents() {
    eventsGrid.innerHTML = '';

    // Toggle UI for Live TV
    const topNav = document.querySelector('.top-nav');
    const catLinksUl = document.querySelector('.cat-links');
    if (currentProvider === 'm3u' || currentProvider === 'jiohot') {
        if (topNav) topNav.style.display = 'none';
        if (catLinksUl) catLinksUl.style.display = 'none';
        eventsGrid.classList.add('tv-grid');
    } else {
        if (topNav) topNav.style.display = 'flex';
        if (catLinksUl) catLinksUl.style.display = 'flex';
        eventsGrid.classList.remove('tv-grid');
    }

    let filtered = allEvents;

    // Apply Provider Sidebar Filter
    if (currentProvider !== 'all') {
        filtered = filtered.filter(e => e.sourceFilter === currentProvider);
    }

    // Apply Status Filter only if not in M3U
    if (currentProvider !== 'm3u' && currentProvider !== 'jiohot' && currentStatus !== 'all') {
        filtered = filtered.filter(e => {
            if (currentStatus === 'LIVE') return e.status === 'LIVE';
            if (currentStatus === 'UPCOMING') return e.status === 'UPCOMING';
            if (currentStatus === 'COMPLETED') return e.status === 'COMPLETED';
            return true;
        });
    }

    // Apply Category Filter only if not in M3U
    if (currentProvider !== 'm3u' && currentProvider !== 'jiohot' && currentFilter !== 'all') {
        filtered = filtered.filter(e => e.category && e.category.toLowerCase().includes(currentFilter.toLowerCase()));
    }

    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(e => e.title.toLowerCase().includes(searchTerm) || (e.category && e.category.toLowerCase().includes(searchTerm)));
    }

    if (filtered.length === 0) {
        eventsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No events found for the selected filters.</p>`;
        return;
    }

    filtered.forEach(event => {
        const card = document.createElement('div');

        if (currentProvider === 'm3u' || currentProvider === 'jiohot') {
            card.className = 'tv-card';
            card.onclick = () => openPlayer(event);
            card.innerHTML = `
                <div class="tv-logo-container">
                    <img src="${event.image}" alt="${event.title}" onerror="this.src='https://via.placeholder.com/150/1F2833/FFFFFF?text=TV'">
                </div>
                <h3 class="tv-title">${event.title}</h3>
                <span class="tv-category">${event.category}</span>
            `;
        } else {
            card.className = 'event-card';
            card.onclick = () => openPlayer(event);

            const isLiveBadge = event.status === 'LIVE' ? `<div class="live-badge">LIVE</div>` : `<div class="live-badge" style="background:#f59e0b; box-shadow:none;">UPCOMING</div>`;

            card.innerHTML = `
                <div class="card-image-wrap">
                    ${isLiveBadge}
                    <img src="${event.image}" alt="${event.title}" onerror="this.src='https://via.placeholder.com/640x360/1F2833/66FCF1?text=OMNIX'">
                    <div class="play-overlay">
                        <i class="fa-solid fa-circle-play"></i>
                    </div>
                </div>
                <div class="card-content">
                    <span class="card-source">${event.source} | ${event.category}</span>
                    <h3 class="card-title">${event.title}</h3>
                    <div class="card-meta">
                        <span class="card-time"><i class="fa-regular fa-clock"></i> ${event.startTime}</span>
                    </div>
                </div>
            `;
        }
        eventsGrid.appendChild(card);
    });
}

// Player Logic (Navigate to Separate HTML Page)
function openPlayer(event) {
    if (!event.streamUrl) {
        alert("No stream URL found for this event.");
        return;
    }

    const playerUrl = new URL('player.html', window.location.origin + window.location.pathname);
    playerUrl.searchParams.append('streamUrl', event.streamUrl);
    playerUrl.searchParams.append('title', event.title);
    playerUrl.searchParams.append('source', event.source);
    playerUrl.searchParams.append('category', event.category);
    playerUrl.searchParams.append('back', 'Sports.html');

    // Standardized DRM info
    if (event.drm) {
        if (event.drm.licenseUrl) playerUrl.searchParams.append('drmLicenseUrl', event.drm.licenseUrl);
        if (event.drm.type) playerUrl.searchParams.append('drmType', event.drm.type);
    }

    // Standardized Header passing
    if (event.headers && Object.keys(event.headers).length > 0) {
        playerUrl.searchParams.append('headers', JSON.stringify(event.headers));
    }

    window.location.href = playerUrl.toString();
}

// Search
searchInput.addEventListener('input', renderEvents);
