const yo = require('yo-yo')
const {DownloadsList} = require('builtin-pages-lib')
import {render as renderDownloadsList} from '../com/downloads-list'

// globals
// =

var downloadsList

// main
// =

setup()
async function setup () {
  // fetch downloads
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
      <div class="builtin-main">
        ${renderDownloadsList(downloadsList)}
      </div>
    </div>
  </div>`)
}
