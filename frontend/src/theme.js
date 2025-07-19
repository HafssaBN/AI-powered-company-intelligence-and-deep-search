const checkbox = document.getElementById('themeCheckbox');
const body = document.body;

// Load saved theme from localStorage (if any)
if (localStorage.getItem('theme') === 'light') {
  body.classList.add('light-theme');
  checkbox.checked = true;
}

checkbox.addEventListener('change', () => {
  if (checkbox.checked) {
    body.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  } else {
    body.classList.remove('light-theme');
    localStorage.setItem('theme', 'dark');
  }
});
