import yo from 'yo-yo'

function render (message) {
  return yo`
    <div id="toast-wrapper" class="toast-wrapper">
      <p class="toast">${message}</p>
    </div>
  `
}

export function create (message) {
  // render toast
  var toast = render(message)
  document.body.appendChild(toast)
  setTimeout(destroy, 1500)
}

function destroy () {
  var toast = document.getElementById('toast-wrapper')

  // fadeout before removing element
  toast.classList.add('hidden')
  setTimeout(() => document.body.removeChild(toast), 500)
}
