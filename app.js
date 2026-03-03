/* OMNIX SPORTS HUB - JSON ONLY APP.JS */

const PROVIDERS = [
    { id: 'fcin', name: 'FANCODE', logo: 'https://images.fancode.com/skillup-uploads/fc-web-logo/fc_logo_white_bg.svg', url: 'https://raw.githubusercontent.com/jitendra-unatti/fancode/fe98437cfea2582b6c6153f990b112467ad1ec63/data/fancode.json', type: 'json_fc' },
    { id: 'sonyliv1', name: 'Sony Liv Event Main', logo: 'https://images.slivcdn.com/UI_icons/sonyliv_new_revised_header_logo.png', url: 'https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json', type: 'json' },
    { id: 'sonypro', name: 'SONY Liv PRO', logo: 'https://images.slivcdn.com/UI_icons/sonyliv_new_revised_header_logo.png', url: 'https://raw.githubusercontent.com/doctor-8trange/zyphora/refs/heads/main/data/sony.json', type: 'json_pro' },
    { id: 'jiohot', name: 'JIO-HOT', logo: 'https://img.hotstar.com/image/upload/v1737554969/web-assets/prod/images/rebrand/logo.png', url: 'https://voot.vodep39240327.workers.dev?voot.m3u', type: 'm3u' },
    { id: 'omnixv1', name: 'OMNIX LIVE V1', logo: 'https://img10.hotstar.com/image/upload/f_auto,q_90/sources/r1/web-assets/live_badge', url: 'https://dl.dropbox.com/scl/fi/d9n6xrp813zx4o7wc56w9/tv-prueba.txt?rlkey=x7c45o26fr8x7bqqa42uv470m&st=8aic1pey&.m3u', type: 'm3u' },
    { id: 'omnixv2', name: 'OMNIX LIVE V2', logo: 'https://img10.hotstar.com/image/upload/f_auto,q_90/sources/r1/web-assets/live_badge', url: 'https://raw.githubusercontent.com/BuddyChewChew/sports/refs/heads/main/liveeventsfilter.m3u8', type: 'm3u' }
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
        const f = await fetch(p.url);
        if (!f.ok) throw new Error("Network response was not ok");
        const t = await f.text();
        allData = p.type === 'm3u' ? prsM3u(t, p)
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
            if (!ev.u) return alert('No stream');
            const backUrl = 'Sports.html' + window.location.hash;
            let url = `player.html?streamUrl=${encodeURIComponent(ev.u)}&title=${encodeURIComponent(ev.t)}&source=${encodeURIComponent(ev.src)}&back=${encodeURIComponent(backUrl)}`;
            if (ev.d) url += `&drmType=${ev.d.t}&drmLicenseUrl=${encodeURIComponent(ev.d.l)}`;
            if (ev.h && Object.keys(ev.h).length > 0) url += `&headers=${encodeURIComponent(JSON.stringify(ev.h))}`;
            window.location.href = url;
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
            cur = {
                id: Math.random(), src: src.name, src_id: src.id,
                t: l.split(',').pop().trim(),
                i: (l.match(/tvg-logo="([^"]*)"/) || [])[1] || ''
            };
        } else if (l.startsWith('#EXTVLCOPT:')) {
            // Handle VLC options like # EXTVLCOPT:http-user-agent=...
            if (!cur) cur = { id: Math.random(), src: src.name, t: 'Channel', i: '', h: {} };
            if (!cur.h) cur.h = {};
            const opt = l.substring(11).trim();
            if (opt.startsWith('http-user-agent=')) cur.h['User-Agent'] = opt.substring(16);
            if (opt.startsWith('http-referrer=')) cur.h['Referer'] = opt.substring(14);
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
            if (!cur.d && l.includes('hotstar')) cur.d = { t: 'com.widevine.alpha', l: 'https://pallycon.allinonereborn.workers.dev/api/license/widevine' };
            out.push({ ...cur }); cur = null;
        } else if (cur && l.startsWith('#KODIPROP:license_url=')) {
            cur.d = { t: 'com.widevine.alpha', l: l.split('=').slice(1).join('=') };
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

        // Function to create an event object
        const createEvent = (url, drm, suffix, statusOverride = null) => {
            let s = statusOverride || 'UPCOMING';
            let finalUrl = url;

            if (url) {
                s = statusOverride || 'LIVE';
                if (!url.startsWith('https://allinonereborn.online')) {
                    finalUrl = 'https://allinonereborn.online/fcww/live222.php?url=' + encodeURIComponent(url) + '|Origin=https://www.sonyliv.com|Referer=https://www.sonyliv.com/|User-Agent=' + encodeURIComponent(ua);
                }
            }

            if (i.air_dates && !statusOverride) {
                try {
                    const startStr = i.air_dates.contractStartDate ? i.air_dates.contractStartDate.replace(/,/g, '') : null;
                    const endStr = i.air_dates.contractEndDate ? i.air_dates.contractEndDate.replace(/,/g, '') : null;
                    const start = startStr ? new Date(startStr) : null;
                    const end = endStr ? new Date(endStr) : null;
                    if (start && now < start) s = 'UPCOMING';
                    else if (end && now > end) s = 'COMPLETED';
                } catch (e) { }
            }

            return {
                id: contentId + (suffix ? '_' + suffix : ''),
                t: baseTitle + (suffix ? ` (${suffix})` : ''),
                i: image,
                s,
                u: finalUrl,
                d: drm,
                h: headers,
                src: src.name,
                src_id: src.id,
                cat: genres,
                ch: broadcastChannel
            };
        };

        // 1. Process MULTIPLE_AUDIO_LINKS
        const mal = i.MULTIPLE_AUDIO_LINKS || i.multiple_audio_links;
        if (mal && mal.length > 0) {
            mal.forEach(linkEntry => {
                const lang = linkEntry.LANGUAGE || linkEntry.language || "Unknown";
                const dataObj = linkEntry.DATA || linkEntry.data;
                if (dataObj) {
                    for (const providerKey in dataObj) {
                        const entry = dataObj[providerKey];
                        if (entry?.Playback_videoURL && entry.Playback_videoURL !== "NA") {
                            let drm = null;
                            const lic = entry.WIDEVINE || entry.widevine;
                            if (lic && lic !== "NA") {
                                drm = { t: 'com.widevine.alpha', l: lic };
                            }
                            out.push(createEvent(entry.Playback_videoURL, drm, `${providerKey} - ${lang}`));
                        }
                    }
                }
            });
        }

        // 2. Process DAI Asset Key
        if (i.stream_info?.dai_asset_key && i.stream_info.dai_asset_key !== "NA") {
            out.push(createEvent(i.stream_info.dai_asset_key, null, "Google SSAI"));
        }

        // 3. Fallback to platformVariants if nothing else found
        if (out.filter(e => e.id.toString().startsWith(contentId.toString())).length === 0) {
            let u = i.stream_info?.platformVariants?.videoUrl;
            if (!u || u === "NA") u = i.stream_info?.platformVariants?.trailerUrl;
            if (u && u !== "NA") {
                out.push(createEvent(u, null, "Main"));
            }
        }
    });
    return out;
}

function prsFC(d, src) {
    const headers = d.headers || {};
    const arr = d.matches || [];
    const out = [];

    arr.forEach(m => {
        const baseTitle = m.title;
        const img = m.image || m.image_cdn?.APP || m.image_cdn?.PLAYBACK || m.image_cdn?.TATAPLAY || '';

        // Normalise status: LIVE, UPCOMING, COMPLETED
        const rawStatus = (m.status || m.streamingStatus || '').toUpperCase();
        let s = 'UPCOMING';
        if (rawStatus === 'LIVE' || rawStatus === 'STARTED') s = 'LIVE';
        else if (rawStatus === 'COMPLETED' || rawStatus === 'FINISHED') s = 'COMPLETED';

        // Function to process each stream
        const addStream = (url, suffix) => {
            if (!url || url === "Unavailable" || url === "NA") return;

            let finalUrl = url;
            if (url.startsWith('https://in-mc-flive.fancode.com') || (url.includes('fancode.com') && !url.includes('hdntl='))) {
                finalUrl = 'https://allinonereborn.online/fcww/live222.php?url=' + encodeURIComponent(url) + '|Origin=https://allinonereborn.online';
            }

            out.push({
                id: m.match_id + (suffix ? '_' + suffix : ''),
                t: baseTitle + (suffix ? ` (${suffix})` : ''),
                c: m.category || '',
                i: img,
                s,
                u: finalUrl,
                h: {
                    ...headers,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://allinonereborn.online/fcww/player_world.html'
                },
                src: src.name,
                src_id: src.id
            });
        };

        // 1. Process and store auto_streams if present
        let autoSessionUrl = null;
        if (m.auto_streams && m.auto_streams.length > 0 && m.auto_streams[0].auto) {
            try {
                const autoStr = m.auto_streams[0].auto;
                const sid = 'fc_auto_' + (m.match_id || Math.random().toString(36).substr(2, 9));
                sessionStorage.setItem(sid, autoStr);
                autoSessionUrl = "session:" + sid;
                addStream(autoSessionUrl, "Auto");
            } catch (e) { console.error(e); }
        }

        // 2. Process STREAMING_CDN entries
        if (m.STREAMING_CDN) {
            const scdn = m.STREAMING_CDN;
            // Avoid duplication if Auto session is same as Primary
            addStream(scdn.Primary_Playback_URL, "Main");
            addStream(scdn.fancode_cdn, "CDN 1");
            addStream(scdn.fancode_bd_cdn, "CDN BD");
            addStream(scdn.dai_google_cdn, "Google DAI");
            addStream(scdn.cloudfront_cdn, "Cloudfront");
        }
    });
    return out;
}

