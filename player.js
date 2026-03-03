// OMNIX PREMIUM PLAYER - Dual Engine (HLS.js + Shaka)
// HLS.js  → plain HLS/M3U8 streams (Fancode, Live TV, JIO-HOT) — same as allinonereborn.online/fcww/
// Shaka   → DRM-protected DASH/MPD streams only
// This matches the reference player_india.html approach exactly.

(async function () {
    'use strict';

    // -------------------------------------------------------------------
    // 1. Parse URL Parameters
    // -------------------------------------------------------------------
    const params = new URLSearchParams(window.location.search);
    const streamUrl = params.get('streamUrl');
    const title = params.get('title') || 'PREMIUM STREAM';
    const source = params.get('source') || 'OMNIX NETWORK';
    const category = params.get('category') || '';
    const backPage = params.get('back') || 'Sports.html';

    // Support both new and legacy param names
    const drmLicense = params.get('drmLicenseUrl') || params.get('drmLicense') || null;
    const drmType = params.get('drmType') || 'com.widevine.alpha';
    const drmHeaders = (params.get('drmHeaders') ? tryParseJSON(params.get('drmHeaders')) : null) || {};

    let requestHeaders = {};
    const headersRaw = params.get('headers') || params.get('requestHeaders');
    if (headersRaw) {
        requestHeaders = tryParseJSON(headersRaw) || {};
    }

    // -------------------------------------------------------------------
    // 2. DOM References
    // -------------------------------------------------------------------
    const loader = document.getElementById('player-loader');
    const videoEl = document.getElementById('omnix-video');
    const topBar = document.getElementById('playerUIHead');
    const displayTitle = document.getElementById('displayTitle');
    const displaySrc = document.getElementById('displaySource');
    const backBtn = document.getElementById('backBtn');
    const errorLayer = document.getElementById('errorLayer');
    const errorHeading = document.getElementById('errorHeading');
    const errorMsg = document.getElementById('errorMessage');

    // -------------------------------------------------------------------
    // 3. Fill UI Info
    // -------------------------------------------------------------------
    displayTitle.textContent = title;
    displaySrc.textContent = source + (category ? ' · ' + category : '');
    document.title = title + ' — OMNIX PLAY';

    // Back navigation
    let hlsInstance = null;
    let shakaPlayer = null;

    backBtn.addEventListener('click', () => {
        if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
        if (shakaPlayer) {
            shakaPlayer.destroy().finally(() => { window.location.href = backPage; });
            return;
        }
        window.location.href = backPage;
    });


    // Auto-hide top bar on mouse idle
    let hideTimer;
    const showTopBar = () => {
        topBar.style.opacity = '1';
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { topBar.style.opacity = '0'; }, 4000);
    };
    document.addEventListener('mousemove', showTopBar);
    document.addEventListener('touchstart', showTopBar);
    showTopBar();

    // -------------------------------------------------------------------
    // 4. Guard: No stream URL
    // -------------------------------------------------------------------
    if (!streamUrl) {
        showError('No Stream URL', 'No stream URL was passed to the player. Please return to the Sports Hub and try again.');
        return;
    }

    // -------------------------------------------------------------------
    // 5. Detect Stream Type
    // -------------------------------------------------------------------
    const lcUrl = streamUrl.toLowerCase();
    const lcUrlBase = lcUrl.split('?')[0];
    const isBlobUrl = lcUrl.startsWith('blob:') || streamUrl.startsWith('session:');

    // If it's a blob url generated from session for Fancode, we know it's M3U8.
    // Ensure we check both the base URL and the full URL for HLS indicators
    const isM3u8 = isBlobUrl || (
        lcUrlBase.endsWith('.m3u8') || lcUrlBase.endsWith('.m3u') ||
        lcUrl.includes('.m3u8') || lcUrl.includes('.m3u') ||
        lcUrl.includes('playlist') || lcUrl.includes('/hls/') ||
        lcUrl.includes('dai.google.com') // SSAI HLS
    );
    const isMpd = !isM3u8 && (lcUrlBase.endsWith('.mpd') || lcUrl.includes('.mpd') || lcUrl.includes('/dash/') || lcUrl.includes('format=mpd'));

    const isHotstar = streamUrl.toLowerCase().includes('hotstar.com') || streamUrl.toLowerCase().includes('jcevents') || (source && source.toLowerCase().includes('jio-hot'));

    // Use Shaka ONLY when DRM is required (MPD or has a licenseUrl or is Hotstar)
    // For Sony, only use Shaka if DRM is explicitly present to avoid Error 4036 (Restriction block)
    let finalDrmLicense = drmLicense;
    if (!finalDrmLicense && isHotstar) {
        finalDrmLicense = 'https://pallycon.allinonereborn.workers.dev/api/license/widevine';
    }

    const useShakaForDRM = !!finalDrmLicense || isMpd;

    // -------------------------------------------------------------------
    // 6. Proxy and Session (Blob) Support
    // -------------------------------------------------------------------
    const isFileOrigin = window.location.protocol === 'file:';
    const isProxyUrl = streamUrl.includes('allinonereborn.online') || streamUrl.includes('corsproxy.io');
    const needsProxy = Object.keys(requestHeaders).length > 0 && isFileOrigin && !streamUrl.startsWith('blob:') && !streamUrl.startsWith('data:') && !streamUrl.startsWith('session:') && !isProxyUrl;
    const CORS_PROXY = needsProxy ? 'https://corsproxy.io/?' : '';

    let finalStreamUrl = streamUrl;

    // Resolve DAI URLs to final Akamai destination to prevent relative path issues
    if (streamUrl.includes('dai.google.com')) {
        console.log('[OMNIX PLAYER] Resolving DAI URL...');
        try {
            const isAlreadyProxied = streamUrl.startsWith('https://allinonereborn.online') || streamUrl.includes('corsproxy.io');
            const resolveUrl = isAlreadyProxied ? streamUrl : (CORS_PROXY + encodeURIComponent(streamUrl));

            const resp = await fetch(resolveUrl, { method: 'GET', redirect: 'follow' });
            if (resp.ok && resp.url && !resp.url.includes('dai.google.com')) {
                finalStreamUrl = resp.url;
                console.log('[OMNIX PLAYER] Resolved DAI to:', finalStreamUrl);
            }
        } catch (e) {
            console.warn('[OMNIX PLAYER] DAI Resolution failed, using original:', e);
        }
    }

    // Resolve session stored M3U8 strings (mainly for Fancode auto_streams)
    if (finalStreamUrl.startsWith('session:')) {
        const sid = finalStreamUrl.replace('session:', '');
        const autoStr = sessionStorage.getItem(sid);
        if (autoStr) {
            try {
                // Fancode's "auto" contains the M3U8 string. We encode it as a Local Blob URI inside the player!
                const blob = new Blob([autoStr], { type: 'application/vnd.apple.mpegurl' });
                finalStreamUrl = URL.createObjectURL(blob);
                console.log(`[OMNIX PLAYER] Loaded Virtual M3U8 from Session Storage (${sid})`);
            } catch (e) {
                console.error('[OMNIX PLAYER] Failed to convert session text to blob:', e);
                showError('Stream Initialization Failed', 'Could not parse virtual playlist.');
                return;
            }
        } else {
            console.error(`[OMNIX PLAYER] Session key ${sid} not found.`);
            showError('Stream Expired', 'The stream context has expired. Please go back and open the match again.');
            return;
        }
    } else {
        // Only apply CORS proxy if not already absolute/proxied and is cross-origin
        const isAlreadyProxied = finalStreamUrl.startsWith('https://allinonereborn.online') || finalStreamUrl.includes('corsproxy.io');
        const isSameOrigin = finalStreamUrl.startsWith(window.location.origin) || finalStreamUrl.startsWith('/');
        if (!isAlreadyProxied && !isSameOrigin && !finalStreamUrl.startsWith('blob:')) {
            finalStreamUrl = CORS_PROXY ? (CORS_PROXY + encodeURIComponent(finalStreamUrl)) : finalStreamUrl;
        }
    }


    console.log(`[OMNIX PLAYER] Engine: ${useShakaForDRM ? 'Shaka (DRM/DASH)' : 'HLS.js (plain HLS)'}`);
    console.log(`[OMNIX PLAYER] Stream: ${finalStreamUrl}`);
    console.log(`[OMNIX PLAYER] CORS Proxy: ${CORS_PROXY ? 'YES (corsproxy.io)' : 'NO'}`);

    // -------------------------------------------------------------------
    // 6A. ENGINE: HLS.js — for all plain M3U8 / HLS streams
    // -------------------------------------------------------------------
    if (!useShakaForDRM) {
        if (Hls.isSupported()) {
            hlsInstance = new Hls({
                maxLoadingRetry: 6,
                fragLoadingMaxRetry: 6,
                enableWorker: true,
                lowLatencyMode: false,
                xhrSetup: function (xhr, url) {
                    // Inject custom request headers for HLS.js
                    if (requestHeaders && Object.keys(requestHeaders).length > 0) {
                        Object.entries(requestHeaders).forEach(([k, v]) => {
                            // SKIP forbidden headers that browsers block
                            if (['origin', 'referer', 'user-agent'].includes(k.toLowerCase())) return;
                            try {
                                xhr.setRequestHeader(k, v);
                            } catch (e) {
                                console.warn('[OMNIX PLAYER] Header set failed:', k);
                            }
                        });
                    }
                    // Blob URLs might fail XHR if originating from file:// - avoid setting credentials
                    if (!url.startsWith('blob:')) {
                        // xhr.withCredentials = true; // Disabled for broad CORS
                    }
                }
            });

            hlsInstance.loadSource(finalStreamUrl);
            hlsInstance.attachMedia(videoEl);

            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                videoEl.play().catch(e => console.warn('[OMNIX PLAYER] Autoplay blocked:', e));
            });

            videoEl.addEventListener('loadeddata', hideLoader, { once: true });
            setTimeout(hideLoader, 6000);

            hlsInstance.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn('[OMNIX PLAYER] Network error, retrying...');

                            // If Blob URL fails, it might be due to relative paths inside the M3U8. 
                            // Try to recover by reloading.
                            if (finalStreamUrl.startsWith('blob:') && data.details === 'manifestLoadError') {
                                showError('Manifest Error', 'Failed to load the virtual stream. It may contain invalid or relative paths.');
                                hlsInstance.destroy();
                                return;
                            }

                            hlsInstance.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hlsInstance.recoverMediaError();
                            break;
                        default:
                            showError('Playback Error', `Stream failed: ${data.details}. The CDN may have blocked this stream.`);
                            break;
                    }
                }
            });

        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS
            videoEl.src = finalStreamUrl;
            videoEl.addEventListener('loadedmetadata', () => videoEl.play());
            videoEl.addEventListener('loadeddata', hideLoader, { once: true });
            setTimeout(hideLoader, 6000);
        }
        return;
    }

    // -------------------------------------------------------------------
    // 6B. ENGINE: Shaka Player — for DRM/DASH streams
    // -------------------------------------------------------------------
    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
        showError('Browser Not Supported', 'DRM APIs not supported.');
        return;
    }

    videoEl.setAttribute('crossorigin', 'anonymous');
    shakaPlayer = new shaka.Player(videoEl);
    const container = document.getElementById('videoContainer');
    const ui = new shaka.ui.Overlay(shakaPlayer, container, videoEl);

    ui.configure({
        addBigPlayButton: true,
        controlPanelElements: ['play_pause', 'time_and_duration', 'spacer', 'mute', 'volume', 'fullscreen', 'overflow_menu']
    });

    shakaPlayer.addEventListener('error', (event) => {
        const err = event.detail;
        console.error('[OMNIX PLAYER] Shaka Error:', err);
        showError('Playback Error', `Shaka Error Code: ${err.code}. (CORS or DRM issue)`);
    });

    const shakaConfig = {
        streaming: { bufferingGoal: 30, rebufferingGoal: 2, retryParameters: { maxAttempts: 5 } },
        drm: {
            servers: finalDrmLicense ? { [drmType]: finalDrmLicense } : {},
            retryParameters: { maxAttempts: 5 }
        }
    };

    shakaPlayer.getNetworkingEngine().registerRequestFilter((type, request) => {
        // Apply headers to ALL requests (Manifest, Segment, License)
        Object.entries(requestHeaders).forEach(([k, v]) => {
            if (['origin', 'referer', 'user-agent'].includes(k.toLowerCase())) return;
            request.headers[k] = v;
        });

        // If it's a license request and we have specific DRM headers
        if (type === shaka.net.NetworkingEngine.RequestType.LICENSE && drmHeaders) {
            Object.entries(drmHeaders).forEach(([k, v]) => {
                request.headers[k] = v;
            });
        }
    });

    shakaPlayer.configure(shakaConfig);

    try {
        await shakaPlayer.load(streamUrl);
        videoEl.addEventListener('loadeddata', hideLoader, { once: true });
        setTimeout(hideLoader, 5000);
        await videoEl.play();
    } catch (loadErr) {
        console.error('[OMNIX PLAYER] Shaka load error:', loadErr);
        showError('Stream Load Failed', `Error: ${loadErr.code}. (CORS/DRM restriction)`);
    }

    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------
    function showError(heading, message) {
        errorHeading.textContent = heading;
        errorMsg.textContent = message;
        errorLayer.style.display = 'flex';
        hideLoader();
    }

    function hideLoader() {
        if (loader) loader.classList.add('hidden');
    }

    function tryParseJSON(str) {
        try { return JSON.parse(str); } catch (e) { return null; }
    }

})();
