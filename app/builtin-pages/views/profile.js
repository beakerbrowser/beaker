const yo = require('yo-yo')
const co = require('co')
import renderSidebar from '../com/sidebar'

// globals
// =

// main
// =

co(function * () {
  // render
  render()
})

// rendering
// =

function render () {
  yo.update(document.querySelector('.profile-wrapper'), yo`
    <div class="profile-wrapper builtin-wrapper">
      ${renderSidebar('profile')}

      <div>
        <div class="builtin-sidebar">
          <h1>Your profile</h1>
        </div>

        <div class="builtin-main">
        </div>
      </div>
    </div>
  </div>`)
}
