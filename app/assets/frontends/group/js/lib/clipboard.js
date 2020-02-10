export function writeToClipboard (str) {
  var textarea = document.createElement('textarea')
  textarea.textContent = str
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}