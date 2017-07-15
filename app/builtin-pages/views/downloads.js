const yo = require('yo-yo')
const co = require('co')
const {DownloadsList} = require('builtin-pages-lib')
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

function render () {
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="downloads">
      <h1 class="ll-heading">Downloads</h1>
      ${renderDownloadsList(downloadsList)}
    </div>
  </div>`)
}
