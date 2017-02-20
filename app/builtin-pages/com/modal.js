import * as yo from 'yo-yo'

export function create (render) {
  // render the modal
  var wrapperEl = yo`<div class="modal-wrapper">
    <div class="modal">
      <div class="modal-close-btn" onclick=${close}><span class="icon icon-cancel"></span></div>
      <div class="modal-inner">${render({ close })}</div>
    </div>
  </div>`
  document.body.appendChild(wrapperEl)

  // attach re-render method
  wrapperEl.rerender = createRerender(render, close).bind(wrapperEl)

  // animate intro
  wrapperEl.querySelector('.modal').animate({opacity: [0,1]}, 150)

  // event handlers
  document.body.addEventListener('keydown', onBodyKeydown)
  function onBodyKeydown (e) {
    if (e.which === 27) {
      close()
    }
  }

  // methods
  function close (e) {
    if (e)
      e.preventDefault()

    document.body.removeChild(wrapperEl)
    document.body.removeEventListener('keydown', onBodyKeydown)
    wrapperEl.dispatchEvent(new CustomEvent('close'))
    wrapperEl = null
  }

  return wrapperEl
}

function createRerender (render, close) {
  return function () {
    yo.update(this.querySelector('.modal-inner').firstChild, render({ close }))
  }
}