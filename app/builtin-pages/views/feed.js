/* globals beaker */

const yo = require('yo-yo')
import renderBuiltinPagesHeader from '../com/builtin-pages-header'

// globals
//

var currentUserSession = null

// main
// =

setup()
async function setup () {
  currentUserSession = await beaker.browser.getUserSession()
  update()
}

// rendering
// =

function update () {
  yo.update(document.querySelector('.feed-wrapper'), yo`
    <div class="feed-wrapper builtin-wrapper">
      ${renderBuiltinPagesHeader('Feed', currentUserSession)}

      <div class="builtin-main">
        TODO
      </div>
    </div>`
  )
}


// event handlers
// =
