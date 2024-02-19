const copyTextFromPreTag = async () => {
  // Get the text content of the <pre> tag
  let preTag = document.querySelector('pre');
  let text = preTag.textContent;

  // Use the Clipboard API to copy the text
  await navigator.clipboard.writeText(text)
    /*.then(() => {
      alert('Text copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
    });*/
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('pre').forEach((pre) => {
    const icon = pre.querySelector('::before');

    pre.addEventListener('mouseup', (e) => {
      // Your event handling code here
      console.log('Icon clicked!');
      console.log(e)
    });
  });
});
