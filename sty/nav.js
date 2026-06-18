// Mobile navigation toggle
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var navbar = document.querySelector('.navbar');
    var hamburger = document.querySelector('.hamburger');

    if (!hamburger || !navbar) return;

    // Toggle main menu
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      navbar.classList.toggle('open');
    });

    // Toggle dropdowns on mobile (click instead of hover)
    var dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(function (dropdown) {
      var btn = dropdown.querySelector('.dropbtn');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        // Only intercept on mobile
        if (window.innerWidth <= 768) {
          e.stopPropagation();
          dropdown.classList.toggle('open');
        }
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function () {
      navbar.classList.remove('open');
      dropdowns.forEach(function (d) { d.classList.remove('open'); });
    });
  });
})();
