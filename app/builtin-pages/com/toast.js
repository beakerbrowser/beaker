import yo from 'yo-yo'

function render (message, type = '', button = null) {
  const onButtonClick = button ? (e) => { destroy(); button.click(e) } : undefined
  return yo`
    <div id="toast-wrapper" class="toast-wrapper">
      <p class="toast ${type}">${message} ${button ? yo`<a class="toast-btn" onclick=${onButtonClick}>${button.label}</a>` : ''}</p>
    </div>
  `
}

export function create (message, type = '', time = 5000, button = null) {
  // destroy existing
  destroy()

  // render toast
  var toast = render(message, type, button)
  document.body.appendChild(toast)
  setTimeout(destroy, time)
}

function destroy () {
  var toast = document.getElementById('toast-wrapper')

  if (toast) {
    // fadeout before removing element
    toast.classList.add('hidden')
    setTimeout(() => document.body.removeChild(toast), 500)
  }
}
