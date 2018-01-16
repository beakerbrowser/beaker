/* globals DatArchive beaker */

import yo from 'yo-yo'
import _get from 'lodash.get'
import {FSArchive} from 'beaker-virtual-fs'
import FilesBrowser from '../com/files-browser2'

// globals
// =

var archive
var archiveInfo
var archiveFs
var filesBrowser
var error

// main
// =

setup()
async function setup () {
  // try {
    let url = window.location.pathname.slice(1)
    archive = new DatArchive(url)
    archiveInfo = await archive.getInfo()
    archiveFs = new FSArchive(null, archiveInfo)
    await archiveFs.readData()
    filesBrowser = new FilesBrowser(archiveFs)
    filesBrowser.onSetCurrentSource = console.log
  // } catch (e) {
  //   error = e
  // }

  renderToPage()
}

// rendering
// =

function render () {
  yo.update(
    document.querySelector('.library-wrapper'), yo`
      <div class="library-wrapper builtin-wrapper">
        <div class="builtin-main" style="margin-left: 0; width: 100%">
          <div class="builtin-header">
            ${_get(archiveInfo, 'title', '')}
          </div>

          ${error ? error.toString() : ''}
          ${filesBrowser ? filesBrowser.render() : ''}
        </div>
      </div>
    `
  )
}
