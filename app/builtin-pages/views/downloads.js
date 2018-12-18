const yo = require('yo-yo')
const {DownloadsList} = require('builtin-pages-lib')
import renderBuiltinPagesHeader from '../com/builtin-pages-header'
import {render as renderDownloadsList} from '../com/downloads-list'

// globals
// =

var currentUserSession = null
var downloadsList

// main
// =

setup()
async function setup () {
  // fetch downloads
  currentUserSession = await beaker.browser.getUserSession()
  downloadsList = new DownloadsList()
  await downloadsList.setup()
  downloadsList.on('changed', render)

  // render
  render()
}

// rendering
// =

function render () {
  yo.update(document.querySelector('.downloads-wrapper'), yo`
    <div class="downloads-wrapper builtin-wrapper">
      ${renderBuiltinPagesHeader('Downloads', currentUserSession)}

      <div class="builtin-main">
        ${renderDownloadsList(downloadsList)}
      </div>
    </div>
  </div>`)
}
