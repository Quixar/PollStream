document.addEventListener('DOMContentLoaded', function () {
    const button = document.getElementById('user-menu-button');
    const dropdown = document.getElementById('user-dropdown');

    if (!button || !dropdown) return;

    let hoverTimeout;

    function openDropdown() {
        clearTimeout(hoverTimeout);
        dropdown.classList.remove('hidden');
    }

    function closeDropdown() {
        hoverTimeout = setTimeout(() => {
            dropdown.classList.add('hidden');
        }, 150); 
    }

    button.addEventListener('mouseenter', openDropdown);
    dropdown.addEventListener('mouseenter', openDropdown);

    button.addEventListener('mouseleave', closeDropdown);
    dropdown.addEventListener('mouseleave', closeDropdown);

    // --- Click ---
    button.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    // --- Click outside ---
    document.addEventListener('click', function (e) {
        if (!button.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
});