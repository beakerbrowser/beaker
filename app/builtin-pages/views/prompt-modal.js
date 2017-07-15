/* globals messageDiv promptInput mainForm cancelBtn beakerBrowser */

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
  mainForm.addEventListener('submit', onSubmit)
  cancelBtn.addEventListener('click', e => beakerBrowser.closeModal())
}

// event handlers
// =

window.addEventListener('keyup', e => {
  if (e.which === 27) {
    beakerBrowser.closeModal()
  }
})

function onSubmit (e) {
  e.preventDefault()
  beakerBrowser.closeModal(null, {value: promptInput.value})
}
