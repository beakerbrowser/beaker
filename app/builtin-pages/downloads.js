/*
This uses the beakerDownloads API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

const yo = require('yo-yo')
const co = require('co')
const prettyBytes = require('pretty-bytes')
const {DownloadsList} = require('builtin-pages-lib')
import {render as renderDownloadsList} from './com/downloads-list'

// globals
// =

var downloadsList

// main
// =

co(function* () {
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
      <div class="ll-heading">
        File Downloads
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      ${renderDownloadsList(downloadsList)}
    </div>
  </div>`)
}