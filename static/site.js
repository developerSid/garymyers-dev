'use strict';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('pre').forEach((pre) => {
    const icon = document.createElement("span");

    icon.classList.add('icon');
    icon.addEventListener('mouseup', async (e) => {
      const text = pre.textContent.trim();

      if (text.length > 0) {
        await navigator.clipboard.writeText(text);
      }
    });

    pre.appendChild(icon);
  });
});
