/* globals beaker */

import yo from 'yo-yo'
import {Archive as LibraryDatArchive} from 'builtin-pages-lib'
import {diffLines} from '@beaker/dat-archive-file-diff'
import renderArchiveComparison from '../com/archive-comparison'
import * as toast from '../com/toast'

// globals
// =

var base
var target
var compareDiff

// main
// =

setup({firstRun: true})
async function setup ({firstRun} = {}) {
  var urlp = new URL(window.location)
  await loadBase(urlp.searchParams.get('base'))
  await loadTarget(urlp.searchParams.get('target'))
  await loadCompareDiff()
  if (firstRun) {
    window.addEventListener('popstate', e => setup())
  }
  render()
}

async function loadBase (url) {
  base = url ? new LibraryDatArchive(url) : null
  if (base) await base.setup()
}

async function loadTarget (url) {
  target = url ? new LibraryDatArchive(url) : null
  if (target) await target.setup()
}

var loadNextFileDiffTimeout
async function loadCompareDiff () {
  // cancel any existing file-diff loads
  clearTimeout(loadNextFileDiffTimeout)

  // load diff
  if (base && target) {
    compareDiff = await DatArchive.diff(base.url, target.url, {compareContent: true, shallow: true})
    compareDiff.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
    render()
  } else {
    compareDiff = null
    render()
    return
  }

  // TEMP
  // diff the dat.json so that we can render it in a grayed-out interface
  // this should be replaced with a semantically-aware dat.json diff tool
  // -prf
  // diffLines(target, '/dat.json', base, '/dat.json').then(diff => {
  //   var d = {diff, path: 'dat.json', debug_isManifest: true, debug_shouldIgnoreChange: false}
  //   d.diffDeletions = d.diff.reduce((sum, el) => sum + (el.removed ? el.count : 0), 0)
  //   d.diffAdditions = d.diff.reduce((sum, el) => sum + (el.added ? el.count : 0), 0)
  //   if      ( d.diffAdditions && !d.diffDeletions) d.change ='add'
  //   else if (!d.diffAdditions &&  d.diffDeletions) d.change ='del'
  //   else if ( d.diffAdditions &&  d.diffDeletions) d.change ='mod'
  //   else return // no changes

  //   var re = /"(title|url)"/
  //   const hasImportantChange = v => v.split(',').filter(v => !re.test(v)).length > 0
  //   var numImportantChanges = d.diff.filter(d => ((d.added || d.removed) && hasImportantChange(d.value))).length
  //   d.debug_shouldIgnoreChange = numImportantChanges === 0
  //   compareDiff.push(d)
  //   render()
  // })

  // automatically & iteratively load the file diffs
  loadNextFileDiffTimeout = setTimeout(loadNextFileDiff, 0)
  async function loadNextFileDiff () {
    if (!compareDiff) return

    // find the next empty diff
    var d = compareDiff.find(d => !d.diff)
    if (!d) return // done!

    // run the diff
    try {
      d.diff = await diffLines(target, d.path, base, d.path)
      d.diffDeletions = d.diff.reduce((sum, el) => sum + (el.removed ? el.count : 0), 0)
      d.diffAdditions = d.diff.reduce((sum, el) => sum + (el.added ? el.count : 0), 0)
    } catch (e) {
      if (e.invalidEncoding) {
        d.diff = {invalidEncoding: true}
      } else if (e.sourceTooLarge) {
        d.diff = {sourceTooLarge: true}
      } else {
        console.error('Error running diff', e)
      }
    }

    // raw
    render()

    // queue the next load
    loadNextFileDiffTimeout = setTimeout(loadNextFileDiff, 0)
  }
}

// rendering
//

function render () {
  yo.update(document.querySelector('.compare-builtin-page-wrapper'), yo`
    <div id="el-content" class="compare-builtin-page-wrapper builtin-wrapper">
      ${renderArchiveComparison({
        base,
        target,
        labels: {
          desc: 'Comparing',
          base: 'base',
          target: 'target',
          copyAll: 'Merge all',
          copy: 'Merge',
          count: 'different file'
        },
        revisions: compareDiff,
        onMerge,
        onChangeCompareBase,
        onChangeCompareTarget,
        onToggleRevisionCollapsed
      })}
    </div>`
  )
}

function updateUrl () {
  var urlp = new URL(window.location)
  urlp.searchParams.set('base', base.url)
  urlp.searchParams.set('target', target.url)
  window.history.pushState('', {}, urlp.search)
}

// events
// =

async function onChangeCompareBase (url) {
  await loadBase(url)
  updateUrl()
  render()
  loadCompareDiff()
}

async function onChangeCompareTarget (url) {
  await loadTarget(url)
  updateUrl()
  render()
  loadCompareDiff()
}

async function onMerge (base, target, opts) {
  try {
    await DatArchive.merge(base, target, opts)
    toast.create('Files updated')
  } catch (e) {
    console.error(e)
    toast.create(e.message || 'There was an issue writing the files', 'error')
  }
  loadCompareDiff()
}

function onToggleRevisionCollapsed (rev) {
  rev.isOpen = !rev.isOpen
  render()
}