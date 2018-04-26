const yo = require('yo-yo')
const co = require('co')
const {DownloadsList} = require('builtin-pages-lib')
import renderBuiltinPagesNav from '../com/builtin-pages-nav'
import {render as renderDownloadsList} from '../com/downloads-list'

// globals
// =

var downloadsList

// main
// =

co(function * () {
  // fetch downloads
  downloadsList = new DownloadsList()
  yield downloadsList.setup()
  downloadsList.on('changed', render)

  // render
  render()
})

// rendering
// =

function renderHeader () {
  return yo`
    <div class="builtin-header fixed">
      ${renderBuiltinPagesNav('Downloads')}
    </div>`
}

function render () {
  yo.update(document.querySelector('.downloads-wrapper'), yo`
    <div class="downloads-wrapper builtin-wrapper">
      ${renderHeader()}

      <div class="builtin-main">
        ${renderDownloadsList(downloadsList)}
      </div>
    </div>
  </div>`)
}
