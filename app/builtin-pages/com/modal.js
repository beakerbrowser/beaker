import * as yo from 'yo-yo'

export function create (render) {
  // render the modal
  var wrapperEl = yo`<div class="modal-wrapper">
    <div class="modal">
      <div class="modal-close-btn" onclick=${close}><span class="icon icon-cancel"></span></div>
      ${render({ close })}
    </div>
  </div>`
  document.body.appendChild(wrapperEl)

  // animate intro
  wrapperEl.querySelector('.modal').animate({opacity: [0,1]}, 150)

  // event handlers
  document.body.addEventListener('keydown', onBodyKeydown)
  function onBodyKeydown (e) {
    if (e.which == 27)
      close()
  }

  // methods
  function close (e) {
    if (e)
      e.preventDefault()

    document.body.removeChild(wrapperEl)
    document.body.removeEventListener('keydown', onBodyKeydown)
    wrapperEl = null
  }

  return wrapperEl
}