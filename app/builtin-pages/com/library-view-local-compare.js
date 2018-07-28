/* globals beaker */

import yo from 'yo-yo'
import {Archive as LibraryDatArchive} from 'builtin-pages-lib'
import renderArchiveComparison from './archive-comparison'
import * as toast from './toast'

export default class LibraryViewLocalCompare {
  constructor (opts) {
    this.target = null
    this.compareDiff = null
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
    // cancel any existing file-diff loads
    clearTimeout(this.loadNextFileDiffTimeout)

    // load diff
    if (this.target) {
      this.compareDiff = await beaker.archives.diffLocalSyncPathListing(this.target.url, {compareContent: true, shallow: true})
      this.compareDiff.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
      this.updatePage()
    } else {
      this.compareDiff = null
      this.updatePage()
      return
    }

    // automatically & iteratively load the file diffs
    const loadNextFileDiff = async () => {
      if (!this.compareDiff) return

      // find the next empty diff
      var d = this.compareDiff.find(d => !d.diff)
      if (!d) return // done!

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

      this.updatePage()

      // queue the next load
      this.loadNextFileDiffTimeout = setTimeout(loadNextFileDiff, 0)
    }
    this.loadNextFileDiffTimeout = setTimeout(loadNextFileDiff, 0)
  }

  render () {
    return yo`
      <div id="library-view-local-compare">
        ${renderArchiveComparison({
          isLocalSyncPath: true,
          target: this.target,
          revisions: this.compareDiff,
          labels: {
            desc: 'Reviewing',
            target: 'published dat',
            copyAll: 'Publish all',
            copy: 'Publish',
            count: 'unpublished change'
          },
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

  async onMerge (base, target, opts = {}) {
    var isPublish = !base
    opts.paths = opts.paths || this.compareDiff.map(d => d.path)
    try {
      if (isPublish) {
        await beaker.archives.publishLocalSyncPathListing(this.target.url, opts)
      } else {
        await beaker.archives.revertLocalSyncPathListing(this.target.url, opts)
      }
      document.body.dispatchEvent(new CustomEvent('custom-local-diff-changed'))
      toast.create('Files updated')
    } catch (e) {
      console.error(e)
      toast.create(e.message || 'There was an issue writing the files', 'error')
    }
    this.loadCompareDiff()
  }

  onToggleRevisionCollapsed (rev) {
    rev.isOpen = !rev.isOpen
    this.updatePage()
  }
}
