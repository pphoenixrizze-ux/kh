document.addEventListener('DOMContentLoaded', function() {
    // Highlight active navigation link
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (currentPage === linkHref) {
            link.classList.add('active');
        }
        
        link.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Language switcher functionality
    const languageSwitcher = document.getElementById('languageSwitcher');
    
    languageSwitcher.addEventListener('change', function() {
        const selectedLanguage = this.value;
        
        // In a real implementation, you would:
        // 1. Load translations for the selected language
        // 2. Update all text content on the page
        // 3. Change text direction for RTL languages like Arabic
        
        // For now, we'll just show an alert
        alert(`Language changed to: ${selectedLanguage}. This would load ${selectedLanguage} translations in a real implementation.`);
        
        // Example of RTL handling for Arabic
        if (selectedLanguage === 'ar') {
            document.body.style.direction = 'rtl';
        } else {
            document.body.style.direction = 'ltr';
        }
    });
    
    // You would also need to add translation files and logic for actual multilingual support
});