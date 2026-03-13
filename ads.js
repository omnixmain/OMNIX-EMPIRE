const AD_URL = 'https://omg10.com/4/10377180';
let firstClickDone = false;
let idleAdTriggered = false;
let pageLoadedTime = Date.now();

// Function to trigger ad
function pushAd() {
    if (window.adsPaused) return;
    window.open(AD_URL, '_blank');
}

// 1. First Click Trigger
document.addEventListener('click', () => {
    if (!firstClickDone) {
        pushAd();
        firstClickDone = true;
    }
}, { once: false }); // We'll manage state manually to allow other triggers

// 2. 6 Second Idle Trigger
// If user clicks after 6 seconds of page load
document.addEventListener('click', () => {
    const currentTime = Date.now();
    const secondsPassed = (currentTime - pageLoadedTime) / 1000;

    if (secondsPassed >= 6 && !idleAdTriggered) {
        pushAd();
        idleAdTriggered = true;
    }
});

// 3. Auto Push every 15 minutes
setInterval(() => {
    pushAd();
}, 15 * 60 * 1000);

// 4. Page Change Trigger
// We intercept all link clicks to push ad before navigation
document.addEventListener('click', (e) => {
    const target = e.target.closest('a');
    if (target && target.href && !target.href.startsWith('javascript:')) {
        // We open ad and then let the default navigation happen
        pushAd();
    }
});

// Also handle back/forward if possible (limited by browser)
window.addEventListener('popstate', () => {
    pushAd();
});
