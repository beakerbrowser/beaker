/* globals beaker CustomEvent */

import yo from 'yo-yo'
import {Archive as LibraryDatArchive} from 'builtin-pages-lib'
import renderArchiveComparison from '../archive/archive-comparison'
import * as toast from '../toast'

export default class LibraryViewLocalCompare {
  constructor (opts) {
    this.target = null
    this.compareDiff = null
    this.revIsOpenMap = {}
    this._setup(opts)
  }

  async _setup ({url}) {
    await this.loadTarget(url)
    await this.loadCompareDiff()
  }

  async loadTarget (url) {
    this.target = url ? new LibraryDatArchive(url) : null
    if (this.target) await this.target.setup()
  }

  async loadCompareDiff () {
    // load diff
    if (this.target) {
      this.compareDiff = await beaker.archives.diffLocalSyncPathListing(this.target.url, {compareContent: true, shallow: true})
      this.compareDiff.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
      /* dont await */ this.loadFileDiffs(this.compareDiff)
      this.updatePage()
    } else {
      this.compareDiff = null
      this.updatePage()
      return
    }
  }

  async setCompareDiff (compareDiff) {
    compareDiff.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
    await this.loadFileDiffs(compareDiff)
    this.compareDiff = compareDiff
    this.updatePage()
  }

  async loadFileDiffs (compareDiff) {
    var resolve
    var p = new Promise(r => { resolve = r })
    // automatically & iteratively load the file diffs
    const loadNextFileDiff = async () => {
      // find the next empty diff
      var d = compareDiff.find(d => !d.diff && this.revIsOpenMap[d.path])
      if (!d) return resolve() // done!

      // run the diff
      try {
        d.diff = await beaker.archives.diffLocalSyncPathFile(this.target.url, d.path)
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

      if (compareDiff === this.compareDiff) {
        // render if this is the active diff
        this.updatePage()
      }

      // queue the next load
      setTimeout(loadNextFileDiff, 0)
    }
    setTimeout(loadNextFileDiff, 0)
    return p
  }

  render () {
    return yo`
      <div id="library-view-local-compare">
        ${renderArchiveComparison({
          isLocalSyncPath: true,
          target: this.target,
          revisions: this.compareDiff,
          labels: {
            desc: 'Reviewing changes',
            target: 'published',
            things: 'changes',
            count: 'unpublished change'
          },
          isRevOpen: this.isRevOpen.bind(this),
          onMerge: this.onMerge.bind(this),
          onToggleRevisionCollapsed: this.onToggleRevisionCollapsed.bind(this)
        })}
      </div>
    `
  }

  updatePage () {
    var el = document.querySelector('#library-view-local-compare')
    if (el) yo.update(el, this.render())
  }

  isRevOpen (rev) {
    return !!this.revIsOpenMap[rev.path]
  }

  async onMerge (base, target, opts = {}) {
    var isPublish = !base
    opts.paths = opts.paths || toPaths(this.compareDiff)
    opts.shallow = false
    document.body.dispatchEvent(new CustomEvent('custom-start-publish'))
    try {
      if (isPublish) {
        await beaker.archives.publishLocalSyncPathListing(this.target.url, opts)
      } else {
        await beaker.archives.revertLocalSyncPathListing(this.target.url, opts)
      }
      toast.create('Files updated', 'success')
    } catch (e) {
      console.error(e)
      toast.create(e.message || 'There was an issue writing the files', 'error')
    }
    document.body.dispatchEvent(new CustomEvent('custom-local-diff-changed'))
    document.body.dispatchEvent(new CustomEvent('custom-finish-publish'))
    this.loadCompareDiff()
  }

  onToggleRevisionCollapsed (rev) {
    this.revIsOpenMap[rev.path] = !this.revIsOpenMap[rev.path]
    this.updatePage()
    this.loadFileDiffs(this.compareDiff)
  }
}

function toPaths (compareDiff) {
  return compareDiff.map(d => {
    if (d.type === 'dir') return d.path + '/' // indicate that this is a folder
    return d.path
  })
}
