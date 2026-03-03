// OMNIX SPORTS HUB - Main Logic v2
// API Endpoints — all sources
const API_ENDPOINTS = {
    fancodemain: 'https://raw.githubusercontent.com/jitendra-unatti/fancode/refs/heads/main/data/fancode.m3u',
    sonyliv1: 'https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json',
    jiohot: 'https://voot.vodep39240327.workers.dev?voot.m3u',
    liveTv: 'https://dl.dropbox.com/scl/fi/d9n6xrp813zx4o7wc56w9/tv-prueba.txt?rlkey=x7c45o26fr8x7bqqa42uv470m&st=8aic1pey&.m3u',
    liveSports: 'https://raw.githubusercontent.com/BuddyChewChew/sports/refs/heads/main/liveeventsfilter.m3u8'
};

// State
let allEvents = [];
let currentFilter = 'all';
let currentStatus = 'all';
let currentProvider = 'fancodemain';

// DOM
const eventsGrid = document.getElementById('eventsGrid');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('searchInput');
const navLinks = document.querySelectorAll('.nav-links li');
const statusLinks = document.querySelectorAll('.status-links li');
const catLinks = document.querySelectorAll('.cat-links li');

/* =========================================================
   BOOT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const p = urlParams.get('provider');
    if (p && API_ENDPOINTS[p]) {
        currentProvider = p;
    }

    fetchAllData();
    setupNavigation();
});

/* =========================================================
   FETCH ALL DATA
   ========================================================= */
async function fetchAllData() {
    loader.classList.remove('hidden');
    eventsGrid.innerHTML = '';

    const results = await Promise.allSettled([
        safeFetch(API_ENDPOINTS.fancodemain, 'text'),
        safeFetch(API_ENDPOINTS.sonyliv1, 'json'),
        safeFetch(API_ENDPOINTS.jiohot, 'text'),
        safeFetch(API_ENDPOINTS.liveTv, 'text'),
        safeFetch(API_ENDPOINTS.liveSports, 'text'),
    ]);

    const [fcMain, sl1, jiohot, liveTv, liveSports] = results;

    let parsed = [];

    // Fancode Main M3U
    if (fcMain.status === 'fulfilled' && fcMain.value) {
        parsed.push(...parseM3U(fcMain.value, 'Fancode Main', 'fancodemain'));
    } else {
        console.warn('[API] Fancode Main failed:', fcMain.reason);
    }

    // Sony Liv Main
    if (sl1.status === 'fulfilled' && sl1.value) {
        parsed.push(...parseSonyLiv(sl1.value, 'Sony Liv Main', 'sonyliv1'));
    } else {
        console.warn('[API] Sony Liv Main failed:', sl1.reason);
    }

    // JIO-HOT M3U
    if (jiohot.status === 'fulfilled' && jiohot.value) {
        parsed.push(...parseJioHot(jiohot.value));
    } else {
        console.warn('[API] JIO-HOT failed:', jiohot.reason);
    }

    // Live TV M3U
    if (liveTv.status === 'fulfilled' && liveTv.value) {
        parsed.push(...parseM3U(liveTv.value, 'Live TV', 'liveTv'));
    } else {
        console.warn('[API] Live TV failed:', liveTv.reason);
    }

    // Live Sports M3U
    if (liveSports.status === 'fulfilled' && liveSports.value) {
        parsed.push(...parseM3U(liveSports.value, 'Live Sports', 'liveSports'));
    } else {
        console.warn('[API] Live Sports failed:', liveSports.reason);
    }

    allEvents = dedupEvents(parsed);
    console.log(`[OMNIX] Loaded ${allEvents.length} total events.`);

    loader.classList.add('hidden');
    renderEvents();
}

// Safe fetch wrapper
async function safeFetch(url, type = 'json') {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return type === 'json' ? res.json() : res.text();
}

/* =========================================================
   PARSERS
   ========================================================= */

// Fancode JSON Parsing is now deprecated in favor of M3U parsing in parseM3U.
// parseFancode and extractBestM3U8StreamUrl have been removed.

// ---- SONY LIV ----
function parseSonyLiv(data, source, sourceFilter) {
    let items = [];
    if (Array.isArray(data)) items = data;
    else if (Array.isArray(data.data)) items = data.data;
    else if (Array.isArray(data.matches)) items = data.matches;
    else if (Array.isArray(data.upcoming)) items = data.upcoming;

    const results = [];
    items.forEach(item => {
        // Sony Liv JSON can nest matches inside category objects
        if (item.matches && Array.isArray(item.matches)) {
            item.matches.forEach(m => results.push(buildSonyEvent(m, source, sourceFilter)));
        } else {
            results.push(buildSonyEvent(item, source, sourceFilter));
        }
    });
    return results.filter(Boolean);
}

function buildSonyEvent(m, source, sourceFilter) {
    if (!m) return null;
    const streamUrl = m.src_url || m.streamUrl || m.stream_url || m.playback_url || null;
    return {
        id: m.contentId || m.id || Math.random().toString(36),
        title: m.event_name || m.title || m.name || 'Sony Liv Event',
        category: m.event_category || m.sport || m.category || 'Sports',
        image: m.src || m.image || m.thumbnail || 'https://via.placeholder.com/640x360/1F2833/45A29E?text=SonyLiv',
        status: m.isLive ? 'LIVE' : 'UPCOMING',
        startTime: m.startTime || m.start_time || 'Upcoming',
        source,
        sourceFilter,
        streamUrl,
        headers: {},
        drm: null
    };
}

// ---- M3U HELPER ----
function extractAttr(line, attr) {
    const m = line.match(new RegExp(attr + '="([^"]*)"', 'i'));
    return m ? m[1] : null;
}

// ---- STANDARD M3U ----
function parseM3U(text, source, sourceFilter = 'm3u') {
    const lines = text.split('\n');
    const events = [];
    let cur = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
            const groupTitle = extractAttr(line, 'group-title');
            const tvgLogo = extractAttr(line, 'tvg-logo');
            const tvgName = extractAttr(line, 'tvg-name');
            const httpReferer = extractAttr(line, 'http-referrer') || extractAttr(line, 'http-referer');
            const httpUA = extractAttr(line, 'http-user-agent');

            const rawTitle = line.split(',').pop().trim() || tvgName || 'Live Channel';

            cur = {
                id: Math.random().toString(36).slice(2),
                status: 'LIVE',
                source,
                sourceFilter,
                startTime: '24/7 Channel',
                streamUrl: null,
                drm: null,
                headers: {},
                image: tvgLogo || 'https://via.placeholder.com/150x150/0B0C10/FFFFFF?text=TV',
                category: groupTitle || 'TV Channel',
                title: rawTitle
            };

            if (httpReferer) cur.headers['Referer'] = httpReferer;
            if (httpUA) cur.headers['User-Agent'] = httpUA;

            continue;
        }

        if (!cur) continue;

        // Extract metadata from tags between #EXTINF and URL
        if (line.startsWith('#EXTHTTP:')) {
            try {
                const h = JSON.parse(line.replace('#EXTHTTP:', '').trim());
                Object.assign(cur.headers, h);
            } catch (_) { }
            continue;
        }

        if (line.startsWith('#EXTVLCOPT:')) {
            const opt = line.replace('#EXTVLCOPT:', '').trim();
            if (opt.startsWith('http-user-agent=')) cur.headers['User-Agent'] = opt.replace('http-user-agent=', '');
            if (opt.startsWith('http-referrer=') || opt.startsWith('http-referer=')) {
                cur.headers['Referer'] = opt.split('=')[1];
            }
            if (opt.startsWith('http-origin=')) cur.headers['Origin'] = opt.replace('http-origin=', '');
            continue;
        }

        if (line.startsWith('#KODIPROP:')) {
            const kv = line.replace('#KODIPROP:', '');
            const eqIdx = kv.indexOf('=');
            if (eqIdx !== -1) {
                const key = kv.slice(0, eqIdx).trim();
                const val = kv.slice(eqIdx + 1).trim();
                if (!cur.drm) cur.drm = { type: 'com.widevine.alpha' };
                if (key.includes('license_type')) cur.drm.type = val;
                if (key.includes('license_key') || key.includes('license_url')) cur.drm.licenseUrl = val;
            }
            continue;
        }

        if (line.startsWith('#WV_LICENSE_URL:') || line.startsWith('#DRM-LICENSE-URL:')) {
            if (!cur.drm) cur.drm = { type: 'com.widevine.alpha' };
            cur.drm.licenseUrl = line.split(':').slice(1).join(':').trim();
            continue;
        }

        if (line.startsWith('http')) {
            // Check for piped headers (e.g. url|User-Agent=...&Referer=...)
            const parts = line.split('|');
            cur.streamUrl = parts[0].trim();
            if (parts.length > 1) {
                const headerStr = parts[1];
                const kvPairs = headerStr.split('&');
                kvPairs.forEach(pair => {
                    const [k, v] = pair.split('=');
                    if (k && v) {
                        const cleanK = k.trim();
                        // Normalize common header names
                        const headerMap = { 'user-agent': 'User-Agent', 'referer': 'Referer', 'origin': 'Origin' };
                        const finalK = headerMap[cleanK.toLowerCase()] || cleanK;
                        cur.headers[finalK] = decodeURIComponent(v.trim());
                    }
                });
            }

            // FILTER: Cleanup titles for specific sources
            if (sourceFilter.includes('fancode')) {
                // Remove quality suffixes for better dedup
                cur.title = cur.title.replace(/,\s*\d+p\s*\|\s*\w+/i, '').trim();
            }

            events.push(cur);
            cur = null;
        }
    }
    return events;
}

// ---- JIO-HOT ----
// ---- JIO-HOT ----
function parseJioHot(text) {
    const events = [];
    const lines = text.split('\n');
    let cur = null;
    let idx = 1;

    const LOGOS = {
        Sports: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Star_Sports_logo.svg/200px-Star_Sports_logo.svg.png',
        Entertainment: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Hotstar_Logo.png/200px-Hotstar_Logo.png',
        News: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/CNBC-TV18_Logo.svg/200px-CNBC-TV18_Logo.svg.png',
        Kids: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Nickelodeon_2009_logo.svg/200px-Nickelodeon_2009_logo.svg.png',
        Music: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/MTV_India_2022_Logo.svg/200px-MTV_India_2022_Logo.svg.png',
        Movies: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Hotstar_Logo.png/200px-Hotstar_Logo.png',
        DEFAULT: 'https://img.hotstar.com/image/upload/v1737554969/web-assets/prod/images/rebrand/logo.png'
    };

    const isHex = s => /^[0-9a-f]{10,}$/i.test(s);
    const SKIP = new Set(['dash', 'live', 'bpk-tv', 'mp1', 'mp2', 'fallback', 'index_7.m3u8', 'master.mpd', 'manifest', 'index.m3u8', 'jchls']);

    function newCur() {
        return {
            id: 'jiohot_' + (idx++),
            status: 'LIVE',
            startTime: '24/7 Live',
            source: 'JIO-HOT',
            sourceFilter: 'jiohot',
            headers: {},
            drm: null,
            image: null,
            category: 'JIO-HOT',
            title: null
        };
    }

    cur = newCur();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
            cur.title = line.split(',').pop().trim() || null;
            cur.image = extractAttr(line, 'tvg-logo') || null;
            cur.category = extractAttr(line, 'group-title') || 'JIO-HOT';
            continue;
        }

        if (line.startsWith('#EXTHTTP:')) {
            try {
                const h = JSON.parse(line.replace('#EXTHTTP:', '').trim());
                Object.assign(cur.headers, h);
            } catch (_) { }
            continue;
        }

        if (line.startsWith('#EXTVLCOPT:')) {
            const opt = line.replace('#EXTVLCOPT:', '').trim();
            if (opt.startsWith('http-user-agent=')) cur.headers['User-Agent'] = opt.replace('http-user-agent=', '');
            if (opt.startsWith('http-referrer=') || opt.startsWith('http-referer=')) {
                cur.headers['Referer'] = opt.split('=')[1];
            }
            if (opt.startsWith('http-origin=')) cur.headers['Origin'] = opt.replace('http-origin=', '');
            continue;
        }

        if (line.startsWith('#KODIPROP:')) {
            const kv = line.replace('#KODIPROP:', '');
            const eqIdx = kv.indexOf('=');
            if (eqIdx !== -1) {
                const key = kv.slice(0, eqIdx).trim();
                const val = kv.slice(eqIdx + 1).trim();
                if (!cur.drm) cur.drm = { type: 'com.widevine.alpha' };
                if (key.includes('license_type')) cur.drm.type = val;
                if (key.includes('license_key') || key.includes('license_url')) cur.drm.licenseUrl = val;
            }
            continue;
        }

        if (line.startsWith('http')) {
            cur.streamUrl = line;

            // Derive title from URL if missing
            if (!cur.title) {
                try {
                    const url = new URL(line);
                    const segments = url.pathname.split('/').filter(s => s && !SKIP.has(s.toLowerCase()) && !isHex(s));
                    if (segments.length > 0) {
                        cur.title = segments[segments.length - 1]
                            .replace(/\.(m3u8?|mpd)$/i, '')
                            .replace(/[-_]/g, ' ')
                            .replace(/\b\w/g, c => c.toUpperCase())
                            .replace(/\s*(Wv|Mob|Hls|Livetvwv|Livetvhls|Hd\d?)$/i, '')
                            .trim();
                    }
                } catch (_) { }
            }
            cur.title = cur.title || ('JIO-HOT Ch ' + (idx - 1));

            // Category inference
            const lc = (cur.title + ' ' + line).toLowerCase();
            if (lc.includes('sport') || lc.includes('sshd') || lc.includes('select') || lc.includes('star sport'))
                cur.category = 'Sports';
            else if (lc.includes('news') || lc.includes('cnbc') || lc.includes('news18') || lc.includes('aaj tak'))
                cur.category = 'News';
            else if (lc.includes('color') || lc.includes('star plus') || lc.includes('sony') || lc.includes('zee') || lc.includes('hotstar'))
                cur.category = 'Entertainment';
            else if (lc.includes('nick') || lc.includes('sonic') || lc.includes('pogo') || lc.includes('cartoon'))
                cur.category = 'Kids';
            else if (lc.includes('music') || lc.includes('mtv') || lc.includes('vh1'))
                cur.category = 'Music';
            else if (lc.includes('movie') || lc.includes('cinema') || lc.includes('films'))
                cur.category = 'Movies';

            // Image fallback
            if (!cur.image) cur.image = LOGOS[cur.category] || LOGOS.DEFAULT;

            // HOTSTAR SPECIFIC: Use Shaka + Default License for all hotstar streams if no DRM info
            if (!cur.drm && (line.includes('hotstar.com') || line.includes('jcevents'))) {
                cur.drm = {
                    type: 'com.widevine.alpha',
                    licenseUrl: 'https://pallycon.allinonereborn.workers.dev/api/license/widevine'
                };
            }

            // Normalize drm.type
            if (cur.drm && !cur.drm.type) cur.drm.type = 'com.widevine.alpha';

            events.push(cur);
            cur = newCur();
        }
    }
    return events;
}

// ---- DEDUP ----
function dedupEvents(events) {
    const seen = new Set();
    return events.filter(e => {
        const key = (e.title || '').toLowerCase() + '_' + (e.source || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/* =========================================================
   NAVIGATION SETUP
   ========================================================= */
function setupNavigation() {
    // Initial highlight based on currentProvider (e.g. if loaded from URL)
    navLinks.forEach(l => {
        l.classList.toggle('active', l.dataset.filter === currentProvider);
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentProvider = link.dataset.filter;
            // Update URL without reload to keep state visible
            const url = new URL(window.location);
            url.searchParams.set('provider', currentProvider);
            window.history.replaceState({}, '', url);
            renderEvents();
        });
    });

    statusLinks.forEach(link => {
        link.addEventListener('click', () => {
            statusLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentStatus = link.dataset.status;
            renderEvents();
        });
    });

    catLinks.forEach(link => {
        link.addEventListener('click', () => {
            catLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentFilter = link.dataset.filter;
            renderEvents();
        });
    });

    searchInput.addEventListener('input', renderEvents);
}

/* =========================================================
   RENDER EVENTS
   ========================================================= */
function renderEvents() {
    eventsGrid.innerHTML = '';

    const isLiveTVMode = currentProvider === 'liveTv' || currentProvider === 'liveSports' || currentProvider === 'jiohot' || currentProvider.includes('fancode');
    const topNav = document.querySelector('.top-nav');
    const catUl = document.querySelector('.cat-links');

    topNav?.style.setProperty('display', isLiveTVMode ? 'none' : 'flex');
    catUl?.style.setProperty('display', isLiveTVMode ? 'none' : 'flex');
    eventsGrid.classList.toggle('tv-grid', isLiveTVMode);

    let filtered = allEvents;

    // Provider
    if (currentProvider !== 'all') {
        filtered = filtered.filter(e => e.sourceFilter === currentProvider);
    }

    // Status (not for Live TV)
    if (!isLiveTVMode && currentStatus !== 'all') {
        filtered = filtered.filter(e => e.status === currentStatus.toUpperCase());
    }

    // Category (not for Live TV)
    if (!isLiveTVMode && currentFilter !== 'all') {
        filtered = filtered.filter(e => (e.category || '').toLowerCase().includes(currentFilter.toLowerCase()));
    }

    // Search
    const q = searchInput.value.trim().toLowerCase();
    if (q) {
        filtered = filtered.filter(e =>
            e.title.toLowerCase().includes(q) ||
            (e.category || '').toLowerCase().includes(q) ||
            (e.source || '').toLowerCase().includes(q)
        );
    }

    if (filtered.length === 0) {
        eventsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#C5C6C7;padding:4rem;font-size:1.1rem;">
            <i class="fa-solid fa-satellite-dish" style="margin-right:10px;color:#66FCF1;"></i>
            No events found for the selected filters.
        </p>`;
        return;
    }

    filtered.forEach(event => {
        const card = document.createElement('div');

        if (isLiveTVMode) {
            card.className = 'tv-card';
            card.onclick = () => openPlayer(event);
            card.innerHTML = `
                <div class="tv-logo-container">
                    <img src="${event.image}" alt="${escHtml(event.title)}"
                         onerror="this.src='https://via.placeholder.com/150x150/1F2833/FFFFFF?text=TV'">
                </div>
                <h3 class="tv-title">${escHtml(event.title)}</h3>
                <span class="tv-category">${escHtml(event.category)}</span>
            `;
        } else {
            card.className = 'event-card';
            card.onclick = () => openPlayer(event);

            const badge = event.status === 'LIVE'
                ? `<div class="live-badge">LIVE</div>`
                : event.status === 'COMPLETED'
                    ? `<div class="live-badge" style="background:#4B5563;box-shadow:none;">DONE</div>`
                    : `<div class="live-badge" style="background:#D97706;box-shadow:none;">UPCOMING</div>`;

            const hasStream = !!event.streamUrl;
            card.innerHTML = `
                <div class="card-image-wrap">
                    ${badge}
                    <img src="${event.image}" alt="${escHtml(event.title)}"
                         onerror="this.src='https://via.placeholder.com/640x360/1F2833/66FCF1?text=OMNIX'">
                    <div class="play-overlay">
                        <i class="fa-solid ${hasStream ? 'fa-circle-play' : 'fa-lock'}"
                           title="${hasStream ? 'Play' : 'Stream unavailable'}"></i>
                    </div>
                </div>
                <div class="card-content">
                    <span class="card-source">${escHtml(event.source)} · ${escHtml(event.category)}</span>
                    <h3 class="card-title">${escHtml(event.title)}</h3>
                    <div class="card-meta">
                        <span class="card-time"><i class="fa-regular fa-clock"></i> ${escHtml(event.startTime || '—')}</span>
                        ${event.drm ? '<span style="color:#66FCF1;font-size:0.75rem;"><i class="fa-solid fa-shield-halved"></i> DRM</span>' : ''}
                    </div>
                </div>
            `;
        }
        eventsGrid.appendChild(card);
    });
}

function escHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* =========================================================
   PLAYER NAVIGATION
   ========================================================= */
function openPlayer(event) {
    if (!event.streamUrl) {
        alert(`⚠️ "${event.title}" has no stream URL. The stream may not be available yet.`);
        return;
    }

    const url = new URL('player.html', window.location.href);
    url.searchParams.set('streamUrl', event.streamUrl);
    url.searchParams.set('title', event.title);
    url.searchParams.set('source', event.source);
    url.searchParams.set('category', event.category || '');
    url.searchParams.set('back', `Sports.html?provider=${currentProvider}`);

    if (event.drm) {
        if (event.drm.licenseUrl) url.searchParams.set('drmLicenseUrl', event.drm.licenseUrl);
        if (event.drm.type) url.searchParams.set('drmType', event.drm.type);
    }

    if (event.headers && Object.keys(event.headers).length > 0) {
        url.searchParams.set('headers', JSON.stringify(event.headers));
    }

    window.location.href = url.toString();
}
