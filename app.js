/* OMNIX SPORTS HUB - JSON ONLY APP.JS */

const PROVIDERS = [
    { id: 'fcin', name: 'FANCODE', logo: 'https://images.fancode.com/skillup-uploads/fc-web-logo/fc_logo_white_bg.svg', url: 'https://raw.githubusercontent.com/jitendra-unatti/fancode/fe98437cfea2582b6c6153f990b112467ad1ec63/data/fancode.json', type: 'json_fc' },
    { id: 'fcin2', name: 'FANCODE-V2', logo: 'https://images.fancode.com/skillup-uploads/fc-web-logo/fc_logo_white_bg.svg', url: '', type: 'json_fc' },
    { id: 'sonyliv1', name: 'Sony Liv Event Main', logo: 'https://images.slivcdn.com/UI_icons/sonyliv_new_revised_header_logo.png', url: 'https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json', type: 'json' },
    { id: 'sonypro', name: 'SONY Liv PRO', logo: 'https://images.slivcdn.com/UI_icons/sonyliv_new_revised_header_logo.png', url: 'https://raw.githubusercontent.com/doctor-8trange/zyphora/refs/heads/main/data/sony.json', type: 'json_pro' },
    { id: 'jiohot', name: 'JIO-HOT', logo: 'https://img.hotstar.com/image/upload/v1737554969/web-assets/prod/images/rebrand/logo.png', url: 'https://voot.vodep39240327.workers.dev?voot.m3u', type: 'm3u' },
    { id: 'omnixv1', name: 'OMNIX LIVE V1', logo: 'https://img10.hotstar.com/image/upload/f_auto,q_90/sources/r1/web-assets/live_badge', url: 'https://dl.dropbox.com/scl/fi/d9n6xrp813zx4o7wc56w9/tv-prueba.txt?rlkey=x7c45o26fr8x7bqqa42uv470m&st=8aic1pey&.m3u', type: 'm3u' },
    { id: 'omnixv2', name: 'OMNIX LIVE V2', logo: 'https://img10.hotstar.com/image/upload/f_auto,q_90/sources/r1/web-assets/live_badge', url: 'https://raw.githubusercontent.com/BuddyChewChew/sports/refs/heads/main/liveeventsfilter.m3u8', type: 'm3u' },
    { id: 'icc', name: 'ICC', logo: 'https://play-lh.googleusercontent.com/LD3LA29f1QUuTsmpCatwmXfV3_PQqMgV5wX36KFuFu1G7HVz0Flu87X-H5bu9_FVyKU=w240-h480-rw', url: 'https://sportsbd.top/demo/liveevent.php', type: 'm3u' },
    { id: 'freetv', name: 'FREE-TV', logo: 'https://i.ibb.co/VcJHGM5F/omnix-iptv.png', url: '', type: 'freetv' },
    { id: 'live-omnix', name: 'LIVE-OMNIX', logo: 'https://raw.githubusercontent.com/omnixmain/OMNIX-LOGO/main/OMNIX%20SPORTS.png', url: 'https://raw.githubusercontent.com/wasimud/simud/refs/heads/main/sportsonline.txt', type: 'omnix_live' }
];

let allData = [];
let curStatus = 'all';
let isTV = false;

document.addEventListener('DOMContentLoaded', () => {
    const pg = document.getElementById('providerGrid');
    PROVIDERS.forEach(p => {
        const d = document.createElement('div');
        d.className = 'provider-card';
        d.onclick = () => loadProvider(p);
        d.innerHTML = `<div class="provider-logo-bg"><img src="${p.logo}"></div>
            <h3 class="provider-title">${p.name}</h3>
            <p class="provider-subtitle">(Worldwide)</p>
            <button class="explore-btn">Explore</button>`;
        pg.appendChild(d);
    });

    document.getElementById('searchInput')?.addEventListener('input', applyFilters);
    document.querySelectorAll('.status-links li').forEach(el => {
        el.addEventListener('click', (e) => {
            document.querySelectorAll('.status-links li').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            curStatus = e.target.dataset.status;
            applyFilters();
        });
    });

    // Handle back button and normal navigation via hash
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash;
        if (hash.startsWith('#provider=')) {
            const pId = hash.replace('#provider=', '');
            const p = PROVIDERS.find(x => x.id === pId);
            if (p) {
                loadProvider(p, false); // false = don't set hash again
            }
        } else {
            goHome(false);
        }
    });

    // Initial load: check hash
    if (window.location.hash.startsWith('#provider=')) {
        const pId = window.location.hash.replace('#provider=', '');
        const p = PROVIDERS.find(x => x.id === pId);
        if (p) loadProvider(p, false);
    }
});

async function loadProvider(p, push = true) {
    // ── Fancode → open dedicated fancode.html page ──
    if (p.id === 'freetv') {
        window.location.href = 'Omnix_freetv.html';
        return;
    }
    if (p.id === 'fcin') {
        window.location.href = 'fancode.html';
        return;
    }
    if (p.id === 'fcin2') {
        window.location.href = 'Fancode-2.html';
        return;
    }
    if (p.id === 'sonypro') {
        window.location.href = encodeURI('SonyLiv Live Events.html');
        return;
    }

    if (push) {
        window.location.hash = 'provider=' + p.id;
        return; // The hashchange event will trigger the actual load immediately
    }

    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('eventsView').classList.remove('hidden');
    document.getElementById('eventsGrid').innerHTML = '';

    isTV = p.type === 'm3u';
    document.getElementById('statusFilters').style.display = isTV ? 'none' : 'flex';

    try {
        let fetchUrl = p.url;
        if (p.id === 'icc' || p.url.includes('sportsbd')) {
            fetchUrl = 'https://corsproxy.io/?' + encodeURIComponent(p.url);
        }
        const f = await fetch(fetchUrl);
        if (!f.ok) throw new Error("Network response was not ok");
        const t = await f.text();
        allData = p.type === 'omnix_live' ? prsOmnixLive(t, p)
            : p.type === 'm3u' ? prsM3u(t, p)
                : p.type === 'json_fc' ? prsFC(JSON.parse(t), p)
                    : p.type === 'json' ? prsSl(JSON.parse(t), p)
                        : prsSp(JSON.parse(t), p);
        applyFilters();
    } catch (e) { console.error(e); }
}

function goHome(push = true) {
    if (push) {
        if (window.location.hash.startsWith('#provider=')) {
            window.history.back();
            return;
        } else {
            window.location.hash = '';
            // If hash was already empty, hashchange might not fire
            if (window.location.hash === '') {
                // fallthrough to manual hide/show just in case
            } else {
                return;
            }
        }
    }

    document.getElementById('dashboardView').classList.remove('hidden');
    document.getElementById('eventsView').classList.add('hidden');
}

function applyFilters() {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
    let f = allData;
    if (!isTV && curStatus !== 'all') f = f.filter(x => x.s === curStatus.toUpperCase());
    if (q) f = f.filter(x => (x.t || '').toLowerCase().includes(q) || (x.c || '').toLowerCase().includes(q));

    const g = document.getElementById('eventsGrid');
    g.className = isTV ? 'tv-grid' : 'events-grid';
    g.innerHTML = '';
    f.forEach(ev => {
        const c = document.createElement('div');
        const isPremium = ['fcin', 'sonyliv1', 'sonypro'].includes(ev.src_id || ev.src); // Check source or provider ID

        c.onclick = () => {
            if (ev.streams && ev.streams.length > 0) {
                showStreamOptions(ev);
                return;
            }

            if (!ev.u) return alert('No stream');

            // [NEW] Redirect PHP/Web links DIRECTLY
            const isWebPlayer = ev.u.toLowerCase().includes('.php') || ev.u.toLowerCase().includes('embed') || ev.u.toLowerCase().includes('player.html');
            if (isWebPlayer) {
                window.location.href = ev.u;
                return;
            }

            const backUrl = 'Sports.html' + window.location.hash;
            if (typeof window.startOmnixPlayer === 'function') {
                window.startOmnixPlayer(ev.u, ev.t, ev.src, ev.d, ev.h);
            } else {
                let url = `player.html?streamUrl=${encodeURIComponent(ev.u)}&title=${encodeURIComponent(ev.t)}&source=${encodeURIComponent(ev.src)}&back=${encodeURIComponent(backUrl)}`;
                if (ev.d) url += `&drmType=${ev.d.t}&drmLicenseUrl=${encodeURIComponent(ev.d.l)}`;
                if (ev.h && Object.keys(ev.h).length > 0) url += `&headers=${encodeURIComponent(JSON.stringify(ev.h))}`;
                window.location.href = url;
            }
        };

        if (isTV) {
            c.className = 'tv-card';
            c.innerHTML = `<div class="tv-logo-container"><img src="${ev.i}"></div><h3 class="tv-title">${ev.t}</h3>`;
        } else if (isPremium) {
            c.className = 'premium-card';
            c.innerHTML = `
                <div class="premium-image-wrap">
                    ${ev.s === 'LIVE' ? '<div class="status-badge-premium">LIVE NOW</div>' : `<div class="status-badge-premium" style="background:#666;">${ev.s}</div>`}
                    <img src="${ev.i}" loading="lazy">
                </div>
                <div class="premium-content">
                    <h3 class="premium-title">${ev.t}</h3>
                    <div class="premium-subtitle">
                        <span>${ev.ch || ev.src}</span>
                        ${ev.lang ? `<span>${ev.lang}</span>` : ''}
                    </div>
                    <div class="premium-footer">
                        <span class="premium-category">${ev.cat || 'Sports'}</span>
                        <button class="watch-btn-premium">Watch</button>
                    </div>
                </div>
            `;
        } else {
            c.className = 'event-card';
            c.innerHTML = `
                <div class="card-image-wrap">
                    <div class="live-badge" style="background:${ev.s === 'LIVE' ? 'red' : 'gray'};">${ev.s}</div>
                    <img src="${ev.i}" loading="lazy">
                    <div class="play-overlay"><i class="fa-solid fa-play"></i></div>
                </div>
                <div class="card-content">
                    <h3>${ev.t}</h3>
                </div>
            `;
        }
        g.appendChild(c);
    });
}

function prsM3u(txt, src) {
    let out = [], cur = null;
    txt.split('\n').forEach(l => {
        l = l.trim();
        if (l.startsWith('#EXTINF:')) {
            const logoMatch = l.match(/tvg-logo="([^"]*)"/);
            const groupMatch = l.match(/group-title="([^"]*)"/);
            const titleMatch = l.match(/,(.+)$/);
            if (!cur) cur = { id: Math.random(), src: src.name, src_id: src.id, h: {} };
            cur.t = titleMatch ? titleMatch[1].trim() : 'Unknown Channel';
            cur.c = groupMatch ? groupMatch[1].trim() : '';
            cur.i = logoMatch ? logoMatch[1].trim() : '';
        } else if (l.startsWith('#EXTVLCOPT:')) {
            if (!cur) cur = { id: Math.random(), src: src.name, t: 'Channel', i: '', h: {} };
            if (!cur.h) cur.h = {};
            const opt = l.substring(11).trim();
            if (opt.startsWith('http-user-agent=')) cur.h['User-Agent'] = opt.substring(16);
            if (opt.startsWith('http-referrer=')) cur.h['Referer'] = opt.substring(14);
            if (opt.startsWith('http-origin=')) cur.h['Origin'] = opt.substring(12);
            if (opt.startsWith('http-cookie=')) cur.h['Cookie'] = opt.substring(12);
        } else if (l.startsWith('#EXTHTTP:')) {
            if (!cur) cur = { id: Math.random(), src: src.name, t: 'Channel', i: '', h: {} };
            if (!cur.h) cur.h = {};
            try {
                const hdrs = JSON.parse(l.substring(9).trim());
                Object.assign(cur.h, hdrs);
            } catch (e) { }
        } else if (l.startsWith('#KODIPROP:')) {
            if (!cur) cur = { id: Math.random(), src: src.name, t: 'Channel', i: '' };
            if (!cur.d) cur.d = { t: 'com.widevine.alpha', l: '' };
            if (l.startsWith('#KODIPROP:license_url=')) {
                cur.d.t = 'com.widevine.alpha';
                cur.d.l = l.split('=').slice(1).join('=');
            } else if (l.startsWith('#KODIPROP:inputstream.adaptive.license_type=')) {
                cur.d.t = l.split('=').slice(1).join('=').trim();
            } else if (l.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
                cur.d.l = l.split('=').slice(1).join('=').trim();
            }
        } else if (l.startsWith('http')) {
            if (!cur) cur = { id: Math.random(), src: src.name, t: 'Channel', i: '' };
            // Split on first pipe: URL|Header-Key=value&Header-Key2=value2
            const pipeIdx = l.indexOf('|');
            if (pipeIdx !== -1) {
                cur.u = l.substring(0, pipeIdx).trim();
                const headerStr = l.substring(pipeIdx + 1).trim();
                if (!cur.h) cur.h = {};
                headerStr.split('&').forEach(part => {
                    const eqIdx = part.indexOf('=');
                    if (eqIdx !== -1) {
                        const key = part.substring(0, eqIdx).trim();
                        const val = part.substring(eqIdx + 1).trim();
                        cur.h[key] = val;
                    }
                });
            } else {
                cur.u = l.trim();
            }

            if (!cur.d && l.includes('hotstar') && l.includes('.mpd')) {
                cur.d = { t: 'com.widevine.alpha', l: 'https://pallycon.allinonereborn.workers.dev/api/license/widevine' };
            }

            // [NEW] Check for restricted hosts or custom headers (ICC / sportsbd / webiptv)
            const needsSpecialProxy = cur.h && (cur.h['User-Agent'] || cur.h['Cookie'] || cur.h['Referer']);
            const isRestrictedHost = cur.u.includes('sportsbd') || cur.u.includes('webiptv.site') || cur.u.includes('ta.bia-cf.live.pv-cdn.net');

            // Note: We no longer wrap cur.u here to let player.js handle it internally,
            // which fixes relative segment path resolution in Shaka Player.
            if (needsSpecialProxy || isRestrictedHost) {
                // Ensure headers are preserved for player.js
                if (!cur.h) cur.h = {};
            }

            out.push({ ...cur }); cur = null;
        }
    });
    return out;
}

function prsSl(d, src) {
    let arr = d.matches || d.data || d;
    if (!Array.isArray(arr)) return [];
    let out = [];
    arr.forEach(i => {
        (i.matches || [i]).forEach(m => {
            const streamUrl = m.video_url || m.src_url || m.streamUrl;
            const title = m.match_name || m.event_name || m.title;
            const logo = m.src || m.image || m.logo;
            const isLive = m.isLive === true || m.isLive === "true";
            out.push({
                id: m.contentId || m.id,
                t: title,
                i: logo,
                s: isLive ? 'LIVE' : 'UPCOMING',
                u: streamUrl,
                src: src.name,
                src_id: src.id,
                cat: m.event_category || "",
                ch: m.broadcast_channel || "",
                lang: m.audioLanguageName || ""
            });
        });
    });
    return out;
}

function prsSp(d, src) {
    let arr = [...(d.data || []), ...(d.upcoming || [])];
    if (arr.length === 0 && Array.isArray(d)) arr = d;
    if (arr.length === 0) return [];

    const out = [];
    const now = new Date();
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const headers = {
        'Origin': 'https://www.sonyliv.com',
        'Referer': 'https://www.sonyliv.com/',
        'User-Agent': ua
    };

    arr.forEach(i => {
        const baseTitle = i.video_info?.episodeTitle || i.title || i.video_info?.title || "Sony Liv PRO";
        const image = i.image_cdn?.landscape_thumb || i.image_cdn?.thumbnail || "";
        const contentId = i.contentId;
        const genres = i.video_info?.genres?.[0] || "";
        const broadcastChannel = i.stream_info?.broadcast_channel || "";

        let status = 'UPCOMING';
        if (i.air_dates) {
            try {
                const startStr = i.air_dates.contractStartDate ? i.air_dates.contractStartDate.replace(/,/g, '') : null;
                const endStr = i.air_dates.contractEndDate ? i.air_dates.contractEndDate.replace(/,/g, '') : null;
                const start = startStr ? new Date(startStr) : null;
                const end = endStr ? new Date(endStr) : null;
                if (start && now < start) status = 'UPCOMING';
                else if (end && now > end) status = 'COMPLETED';
                else if (start && now >= start) status = 'LIVE';
            } catch (e) { }
        }

        const streams = [];

        const addStream = (url, drm, suffix) => {
            if (!url || url === "NA" || url === "Unavailable") return;
            let finalUrl = url;
            // Let player.js/Sports.html handle proxying internally to support relative URLs correctly
            streams.push({
                name: suffix,
                u: finalUrl,
                d: drm,
                h: headers
            });
        };

        const mal = i.MULTIPLE_AUDIO_LINKS || i.multiple_audio_links;
        if (mal && mal.length > 0) {
            mal.forEach(linkEntry => {
                const lang = linkEntry.LANGUAGE || linkEntry.language || "Unknown";
                const dataObj = linkEntry.DATA || linkEntry.data;
                if (dataObj) {
                    for (const providerKey in dataObj) {
                        const entry = dataObj[providerKey];
                        if (!entry) continue;

                        let pbUrl = null;
                        let wvUrl = null;

                        if (typeof entry === 'string') {
                            const autoMatch = entry.match(/auto_streams=([\s\S]*?)(?:;\s*[a-zA-Z0-9_]+=|}$)/);
                            if (autoMatch && autoMatch[1].includes('#EXTM3U')) {
                                const sid = 'sony_auto_' + Math.random().toString(36).substr(2, 9);
                                sessionStorage.setItem(sid, autoMatch[1].trim());
                                pbUrl = "session:" + sid;
                            } else {
                                const pbMatch = entry.match(/Playback_videoURL=([^;\}]+)/);
                                if (pbMatch) pbUrl = pbMatch[1].trim();

                                const wvMatch = entry.match(/WIDEVINE=([^;\}]*)/);
                                if (wvMatch) wvUrl = wvMatch[1].trim();

                                if (!pbUrl || pbUrl === "NA") {
                                    const daiMatch = entry.match(/dai_asset_key=([^;\}]+)/);
                                    if (daiMatch) pbUrl = daiMatch[1].trim();
                                }
                            }
                        } else if (typeof entry === 'object') {
                            if (entry.auto_streams && entry.auto_streams.includes('#EXTM3U')) {
                                const sid = 'sony_auto_' + Math.random().toString(36).substr(2, 9);
                                sessionStorage.setItem(sid, entry.auto_streams);
                                pbUrl = "session:" + sid;
                            } else {
                                pbUrl = entry.Playback_videoURL;
                                wvUrl = entry.WIDEVINE || entry.widevine;
                            }
                        }

                        if (pbUrl && pbUrl !== "NA") {
                            let drm = null;
                            if (wvUrl && wvUrl !== "NA" && wvUrl !== "") {
                                drm = { t: 'com.widevine.alpha', l: wvUrl };
                            }
                            const streamName = providerKey.includes('JITENDRA') ? lang : `${providerKey} ${lang}`;
                            addStream(pbUrl, drm, streamName);
                        }
                    }
                }
            });
        }

        if (i.stream_info?.dai_asset_key && i.stream_info.dai_asset_key !== "NA") {
            addStream(i.stream_info.dai_asset_key, null, "SSAI Channel");
        }

        // 3. Fallback to platformVariants if nothing else found
        let u = i.stream_info?.platformVariants?.videoUrl;
        if (!u || u === "NA") u = i.stream_info?.platformVariants?.trailerUrl;
        if (u && u !== "NA") {
            if (!streams.find(s => s.u === u)) {
                addStream(u, null, "Main");
            }
        }

        const actualStatus = streams.length > 0 ? (status === 'UPCOMING' ? 'LIVE' : status) : 'UPCOMING';

        out.push({
            id: contentId,
            t: baseTitle,
            i: image,
            s: actualStatus,
            u: streams.length > 0 ? streams[0].u : null,
            d: streams.length > 0 ? streams[0].d : null,
            h: headers,
            src: src.name,
            src_id: src.id,
            cat: genres,
            ch: broadcastChannel,
            streams: streams
        });
    });
    return out;
}

function prsFC(d, src) {
    const headers = d.headers || {};
    const arr = d.matches || [];
    const out = [];

    const uaTokenized = 'ReactNativeVideo/9.3.0 (Linux;Android 13) AndroidXMedia3/1.6.1';
    const refererFancode = 'https://fancode.com/';
    const uaNormal = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    arr.forEach(m => {
        const baseTitle = m.title;
        const img = m.image || m.image_cdn?.APP || m.image_cdn?.PLAYBACK || m.image_cdn?.TATAPLAY || '';

        const rawStatus = (m.status || m.streamingStatus || '').toUpperCase();
        let s = 'UPCOMING';
        if (rawStatus === 'LIVE' || rawStatus === 'STARTED') s = 'LIVE';
        else if (rawStatus === 'COMPLETED' || rawStatus === 'FINISHED') s = 'COMPLETED';

        let autoHasHdntl = false;
        let autoSessionUrl = null;
        if (m.auto_streams && m.auto_streams.length > 0 && m.auto_streams[0].auto) {
            try {
                const autoStr = m.auto_streams[0].auto;
                if (autoStr.includes('hdntl=')) {
                    autoHasHdntl = true;
                }
                const sid = 'fc_auto_' + (m.match_id || Math.random().toString(36).substr(2, 9));
                sessionStorage.setItem(sid, autoStr);
                autoSessionUrl = "session:" + sid;
            } catch (e) { console.error(e); }
        }

        const streams = [];

        const addStream = (url, suffix, isAutoStream = false) => {
            if (!url || url === "Unavailable" || url === "NA") return;

            let finalUrl = url;
            let finalHeaders = { ...headers };

            const hasToken = isAutoStream ? autoHasHdntl : url.includes('hdntl=');

            if (hasToken) {
                finalHeaders['User-Agent'] = uaTokenized;
                finalHeaders['Referer'] = refererFancode;

                if (!url.startsWith('blob:') && !url.startsWith('session:') && !url.includes('corsproxy.io') && !url.includes('allinonereborn')) {
                    finalUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
                }
            } else {
                finalHeaders['User-Agent'] = uaNormal;
                finalHeaders['Referer'] = refererFancode;

                // Pass the raw URL to allow internal proxying to work correctly
                // with relative paths.
                finalUrl = url;
            }

            streams.push({
                name: suffix,
                u: finalUrl,
                h: finalHeaders
            });
        };

        if (autoSessionUrl) {
            addStream(autoSessionUrl, "Auto", true);
        }

        if (m.STREAMING_CDN) {
            const scdn = m.STREAMING_CDN;
            addStream(scdn.Primary_Playback_URL, "Main");
            addStream(scdn.fancode_cdn, "CDN 1");
            addStream(scdn.fancode_bd_cdn, "CDN BD");
            addStream(scdn.dai_google_cdn, "Google DAI");
            addStream(scdn.cloudfront_cdn, "Cloudfront");
        }

        if (streams.length > 0 || Object.keys(m).length > 0) {
            out.push({
                id: m.match_id,
                t: baseTitle,
                c: m.category || '',
                i: img,
                s,
                src: src.name,
                src_id: src.id,
                streams: streams,
                u: streams.length > 0 ? streams[0].u : null,
                h: streams.length > 0 ? streams[0].h : null
            });
        }
    });
    return out;
}

function showStreamOptions(ev) {
    let modal = document.getElementById('streamOptionsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'streamOptionsModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">Select Stream</h3>
                    <button class="close-btn" onclick="document.getElementById('streamOptionsModal').style.display='none'"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div id="modalBody" class="modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const style = document.createElement('style');
        style.innerHTML = `
            .modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.85); z-index: 9999;
                display: none; justify-content: center; align-items: center;
                backdrop-filter: blur(5px);
            }
            .modal-content {
                background: #1f2833; border: 1px solid rgba(102,252,241,0.2);
                border-radius: 16px; width: 90%; max-width: 400px;
                padding: 1.5rem; color: #fff; transform: translateY(0);
                animation: slideUp 0.3s ease;
            }
            @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
            .modal-header h3 { font-family: 'Outfit', sans-serif; font-size: 1.1rem; color: #66fcf1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85%; }
            .close-btn { background: none; border: none; color: #c5c6c7; font-size: 1.4rem; cursor: pointer; transition: color 0.3s; }
            .close-btn:hover { color: #ff3333; }
            .stream-option-btn {
                background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1);
                color: #fff; padding: 1rem; width: 100%; border-radius: 12px;
                margin-bottom: 0.8rem; cursor: pointer; font-family: 'Inter', sans-serif;
                font-weight: 600; font-size: 0.95rem; display: flex; justify-content: space-between;
                align-items: center; transition: all 0.3s ease;
            }
            .stream-option-btn i { color: #66fcf1; transition: transform 0.3s; }
            .stream-option-btn:hover {
                background: rgba(102, 252, 241, 0.15); border-color: rgba(102, 252, 241, 0.4);
                transform: translateX(5px);
            }
            .stream-option-btn:hover i { transform: translateX(3px); }
        `;
        document.head.appendChild(style);
    }

    document.getElementById('modalTitle').textContent = ev.t;
    const body = document.getElementById('modalBody');
    body.innerHTML = '';

    ev.streams.forEach(st => {
        const btn = document.createElement('button');
        btn.className = 'stream-option-btn';
        const stName = typeof st.name === 'string' ? st.name.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Stream';
        btn.innerHTML = `<span>${stName}</span> <i class="fa-solid fa-play"></i>`;

        btn.onclick = () => {
            document.getElementById('streamOptionsModal').style.display = 'none';

            // [NEW] Redirect PHP/Web links DIRECTLY
            const isWebPlayer = st.u.toLowerCase().includes('.php') || st.u.toLowerCase().includes('embed') || st.u.toLowerCase().includes('player.html');
            if (isWebPlayer) {
                window.location.href = st.u;
                return;
            }

            const backUrl = 'Sports.html' + window.location.hash;
            if (typeof window.startOmnixPlayer === 'function') {
                window.startOmnixPlayer(st.u, ev.t + ' (' + st.name + ')', ev.src, st.d, st.h);
            } else {
                let urlStr = `player.html?streamUrl=${encodeURIComponent(st.u)}&title=${encodeURIComponent(ev.t + ' (' + st.name + ')')}&source=${encodeURIComponent(ev.src)}&back=${encodeURIComponent(backUrl)}`;
                if (st.d) urlStr += `&drmType=${st.d.t}&drmLicenseUrl=${encodeURIComponent(st.d.l)}`;
                if (st.h && Object.keys(st.h).length > 0) urlStr += `&headers=${encodeURIComponent(JSON.stringify(st.h))}`;
                window.location.href = urlStr;
            }
        };
        body.appendChild(btn);
    });

    modal.style.display = 'flex';
}

function prsOmnixLive(txt, src) {
    const lines = txt.split('\n');
    const f = [];
    lines.forEach(l => {
        if (!l.includes('|')) return;
        const p = l.split('|').map(s => s.trim());
        if (p.length < 3) return;
        f.push({
            t: p[0],
            tm: p[1],
            u: p[2],
            i: p[3] || 'https://i.ibb.co/VcJHGM5F/omnix-iptv.png',
            src: src.name,
            src_id: src.id,
            s: 'LIVE'
        });
    });
    return f;
}


