/* globals Event beaker DatArchive history beakerBrowser confirm */

import * as yo from 'yo-yo'
import renderSidebar from '../com/sidebar'
import {FSVirtualRoot} from 'beaker-virtual-fs'
import renderFiles from '../com/files-columns-view'

// globals
// =

var fsRoot = new FSVirtualRoot()

setup()
async function setup () {
  await fsRoot.readData()
  update()
}

// rendering
// =

function update () {
  yo.update(document.querySelector('.library-wrapper'), yo`
    <div class="library-wrapper builtin-wrapper">
      ${renderSidebar('library')}
      <div class="builtin-main">
        ${renderFiles(fsRoot, {filesListView: true})}
      </div>
    </div>
  `)
}
