<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AND TV</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<script src="https://pl28369880.effectivegatecpm.com/a2/72/24/a2722409cc59c77721b2a511e160c7e9.js"></script>

<!-- Shaka core only -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.3.5/shaka-player.compiled.js"></script>

<style>
html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: #000;
    font-family: Arial, sans-serif;
}

/* IMPORTANT: no flex, no overflow hidden */
.player-container {
    position: relative;
    width: 100vw;
    height: 90vh;
    background: #000;
}

/* Video */
video {
    width: 100%;
    height: 100%;
    background: #000;
    object-fit: contain;
}

/* Logo overlay */
.channel-logo {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 90px;
    max-height: 50px;
    object-fit: contain;
    opacity: 0.85;
    z-index: 5;
    pointer-events: none;
}
</style>
</head>

<body>

<div class="player-container">
    <img src="https://dasimages/channel/landscape/360x270/T1CCvaAQ.png" class="channel-logo">

    <video
        id="video"
        controls
        autoplay
        muted
        playsinline
        preload="auto">
    </video>
</div>

<script>
const manifestUri = "https://ottb.live.cf.ww.aiv-cdn.net/lhr-nitro/live/clients/dash/enc/m6sqanvm2m/out/v1/f6beb46c6e9a4132ad739f3ca27df6aa/cenc.mpd";
const keyId = "1444f4235529f183f0a5a486befe9cdb";
const key   = "e5e3fec67a1bb3472a2089c8a0a2557f";

async function initPlayer() {

    if (!shaka.Player.isBrowserSupported()) {
        alert("Browser not supported");
        return;
    }

    const video = document.getElementById('video');
    const player = new shaka.Player(video);

    // DRM (ClearKey)
    if (keyId && key && keyId.length > 10) {
        const clearKeys = {};
        clearKeys[keyId] = key;

        player.configure({
            drm: {
                clearKeys: clearKeys
            }
        });
        console.log("🔒 ClearKey DRM applied");
    } else {
        console.log("🔓 Free stream");
    }

    player.addEventListener('error', function(e) {
        const err = e.detail;
        console.error("Shaka Error", err);

        if (err.code === 6007 || err.code === 6008) {
            alert("License Error: Invalid or expired DRM keys.");
        } else if (err.code === 1002) {
            alert("Network Error.");
        }
    });

    try {
        await player.load(manifestUri);
        video.play().catch(()=>{});
        console.log("✅ Stream loaded");
    } catch (e) {
        console.error("Load failed", e);
    }
}

document.addEventListener('DOMContentLoaded', initPlayer);
</script>

</body>
</html>