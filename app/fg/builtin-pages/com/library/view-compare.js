/* globals beaker DatArchive */

import yo from 'yo-yo'
import {Archive as LibraryDatArchive} from 'builtin-pages-lib'
import {diffLines} from '@beaker/dat-archive-file-diff'
import renderArchiveComparison from '../archive/archive-comparison'
import * as toast from '../toast'

export default class LibraryViewCompare {
  constructor (opts) {
    this.base = null
    this.target = null
    this.compareDiff = null
    this._setup(opts)
  }

  async _setup ({baseUrl, targetUrl}) {
    await this.loadBase(baseUrl)
    await this.loadTarget(targetUrl)
    await this.loadCompareDiff()
  }

  async loadBase (url) {
    this.base = url ? new LibraryDatArchive(url) : null
    if (this.base) await this.base.setup()
  }

  async loadTarget (url) {
    this.target = url ? new LibraryDatArchive(url) : null
    if (this.target) await this.target.setup()
  }

  async loadCompareDiff () {
    // cancel any existing file-diff loads
    clearTimeout(this.loadNextFileDiffTimeout)

    // load diff
    if (this.base && this.target) {
      this.compareDiff = await DatArchive.diff(this.base.url, this.target.url, {compareContent: true, shallow: true})
      this.compareDiff.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
      this.updatePage()
    } else {
      this.compareDiff = null
      this.updatePage()
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
    //   this.compareDiff.push(d)
    //   this.updatePage()
    // })

    // automatically & iteratively load the file diffs
    const loadNextFileDiff = async () => {
      if (!this.compareDiff) return

      // find the next empty diff
      var d = this.compareDiff.find(d => !d.diff)
      if (!d) return // done!

      // run the diff
      try {
        d.diff = await diffLines(this.target, d.path, this.base, d.path)
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
      <div id="library-view-compare">
        ${renderArchiveComparison({
          base: this.base,
          target: this.target,
          revisions: this.compareDiff,
          labels: {
            desc: 'Comparing',
            base: 'base',
            target: 'target',
            copyAll: 'Merge all',
            copy: 'Merge',
            count: 'different file'
          },
          onMerge: this.onMerge.bind(this),
          onChangeCompareBase: this.onChangeCompareBase.bind(this),
          onChangeCompareTarget: this.onChangeCompareTarget.bind(this),
          onToggleRevisionCollapsed: this.onToggleRevisionCollapsed.bind(this)
        })}
      </div>
    `
  }

  updatePage () {
    var el = document.querySelector('#library-view-compare')
    if (el) yo.update(el, this.render())
  }

  async onChangeCompareBase (url) {
    await this.loadBase(url)
    this.updatePage()
    this.loadCompareDiff()
  }

  async onChangeCompareTarget (url) {
    await this.loadTarget(url)
    this.updatePage()
    this.loadCompareDiff()
  }

  async onMerge (base, target, opts) {
    try {
      await DatArchive.merge(base, target, opts)
      toast.create('Files updated', 'success')
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
