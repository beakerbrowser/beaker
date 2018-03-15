/* globals messageDiv promptInput mainForm cancelBtn beaker */

import {adjustWindowHeight} from '../../lib/fg/event-handlers'

// exported api
// =

window.setup = async function (opts) {
  if (opts.message) {
    messageDiv.textContent = '' + opts.message
  } else {
    messageDiv.textContent = 'Please enter a value'
  }
  if (opts.default) {
    promptInput.value = '' + opts.default
  }
  adjustWindowHeight('html')
  mainForm.addEventListener('submit', onSubmit)
  cancelBtn.addEventListener('click', e => beaker.browser.closeModal())
}

// event handlers
// =

window.addEventListener('keyup', e => {
  if (e.which === 27) {
    beaker.browser.closeModal()
  }
})

function onSubmit (e) {
  e.preventDefault()
  beaker.browser.closeModal(null, {value: promptInput.value})
}
