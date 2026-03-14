// Sticky Navbar effect
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Reveal animations on scroll
function reveal() {
    var reveals = document.querySelectorAll(".reveal");
    for (var i = 0; i < reveals.length; i++) {
        var windowHeight = window.innerHeight;
        var elementTop = reveals[i].getBoundingClientRect().top;
        var elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("visible");
        }
    }
}

window.addEventListener("scroll", reveal);

// Initial call to reveal elements already in view
reveal();

// Year update in footer (though currently hardcoded in HTML as 2026, keeping for robustness)
const yearSpan = document.getElementById('year');
if (yearSpan) {
    yearSpan.innerText = new Date().getFullYear();
}
