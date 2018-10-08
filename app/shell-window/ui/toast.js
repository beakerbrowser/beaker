import yo from 'yo-yo'

function render (message) {
  return yo`<div class="toast">${message}</div>`
}

export function create (message, howLong=2500) {
  // remove any existing toast
  Array.from(document.querySelectorAll('#toasts .toast'), el => {
    el.parentNode.removeChild(el)
  })

  // render toast
  document.getElementById('toasts').appendChild(render(message))
  setTimeout(destroy, howLong)
}

function destroy () {
  try {
    var toast = document.querySelector('#toasts .toast')

    // fadeout before removing element
    toast.classList.add('invisible')
    setTimeout(() => document.getElementById('toasts').removeChild(toast), 500)
  } catch (e) {
    // ignore
  }
}
