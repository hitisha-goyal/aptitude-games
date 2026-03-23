document.addEventListener('DOMContentLoaded', () => {
    console.log("Optimizing performance: Parallax disabled to prevent lag.");

    // Intersection Observer for Game Cards Fade-in
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.game-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`;
        observer.observe(card);
    });

    // Revenue Dashboard Insight (Simulated)
    const revenueBtn = document.querySelector('.ad-link');
    revenueBtn.addEventListener('click', () => {
        alert('Revenue Dashboard Access:\n(Simulation)\n\nEstimated Monthly Traffic: 24,000+ Session\nProjected AdSense CPM: $4.50\nTarget Revenue: $108.00/month');
    });

    console.log("Aptitude Hub Logic Initialized.");
});
