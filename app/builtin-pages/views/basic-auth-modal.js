/* globals beakerBrowser */

import * as yo from 'yo-yo'

// state
var username = ''
var password = ''
var authInfo = {}

// exported api
// =

window.setup = async function (opts) {
  authInfo = opts
  render()
}

// event handlers
// =

window.addEventListener('keyup', e => {
  if (e.which === 27) {
    beakerBrowser.closeModal(null, {username: false, password: false})
  }
})

function onChangeUsername (e) {
  username = e.target.value
}

function onChangePassword (e) {
  password = e.target.value
}

function onClickCancel (e) {
  e.preventDefault()
  beakerBrowser.closeModal(null, {username: false, password: false})
}

function onSubmit (e) {
  e.preventDefault()
  beakerBrowser.closeModal(null, {username, password})
}

// internal methods
// =

function render () {
  yo.update(document.querySelector('main'), yo`<main>
    <div class="modal">
      <div class="modal-inner">
        <div class="basic-auth-modal">
          <h1 class="title">Login required</h1>

          <p class="help-text">
            ${authInfo.host} requires a username and password
          </p>

          <form onsubmit=${onSubmit}>
            <label for="username">Username</label>
            <input name="username" tabindex="2" value=${username || ''} placeholder="Username" onchange=${onChangeUsername} autofocus />

            <label for="password">Password</label>
            <input name="password" type="password" tabindex="3" value=${password || ''}  placeholder="Password" onchange=${onChangePassword} />

            <div class="form-actions">
              <button type="button" onclick=${onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
              <button type="submit" class="btn primary" tabindex="5">Log In</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>`)
}
