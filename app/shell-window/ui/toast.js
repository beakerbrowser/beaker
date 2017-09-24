import yo from 'yo-yo'

function render (message) {
  return yo`<div class="toast">${message}</div>`
}

export function create (message, howLong=2500) {
  // render toast
  document.getElementById('toasts').appendChild(render(message))
  setTimeout(destroy, howLong)
}

function destroy () {
  var toast = document.querySelector('#toasts .toast')

  // fadeout before removing element
  toast.classList.add('invisible')
  setTimeout(() => document.getElementById('toasts').removeChild(toast), 500)
}
