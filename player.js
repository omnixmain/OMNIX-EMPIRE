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
    const isMpd = lcUrlBase.endsWith('.mpd') || lcUrl.includes('/dash/') || lcUrl.includes('format=mpd');
    const isM3u8 = !isMpd && (
        lcUrlBase.endsWith('.m3u8') || lcUrlBase.endsWith('.m3u') ||
        lcUrl.includes('playlist') || lcUrl.includes('/hls/')
    );

    const isHotstar = streamUrl.toLowerCase().includes('hotstar.com') || streamUrl.toLowerCase().includes('jcevents') || (source && source.toLowerCase().includes('jio-hot'));

    // Use Shaka ONLY when DRM is required (MPD or has a licenseUrl or is Hotstar)
    let finalDrmLicense = drmLicense;
    if (!finalDrmLicense && isHotstar) {
        finalDrmLicense = 'https://pallycon.allinonereborn.workers.dev/api/license/widevine';
    }

    const useShakaForDRM = !!finalDrmLicense || isMpd;

    console.log(`[OMNIX PLAYER] Stream: ${streamUrl}`);
    console.log(`[OMNIX PLAYER] Engine: ${useShakaForDRM ? 'Shaka (DRM/DASH)' : 'HLS.js (plain HLS)'}`);

    // CORS Proxy Support (Optional - if needed for local file testing)
    const CORS_PROXY = ""; // e.g. "https://cors-anywhere.herokuapp.com/" - User can add if needed

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
                    // Set custom headers
                    Object.entries(requestHeaders).forEach(([k, v]) => {
                        try {
                            // Some headers like User-Agent and Referer are restricted by browsers
                            // but we attempt to set them anyway as some environments (like Electron or modified browsers) allow it.
                            xhr.setRequestHeader(k, v);
                        } catch (e) {
                            console.warn(`[PLAYER] Restricted header ${k} skipped.`);
                        }
                    });
                }
            });

            hlsInstance.loadSource(streamUrl);
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
                            hlsInstance.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hlsInstance.recoverMediaError();
                            break;
                        default:
                            showError('Playback Error', `Stream failed: ${data.details}. (Check CORS/Referer)`);
                            break;
                    }
                }
            });

        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = streamUrl;
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
