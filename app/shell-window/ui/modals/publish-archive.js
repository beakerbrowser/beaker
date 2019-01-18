/* globals DatArchive */

import * as yo from 'yo-yo'
import {BaseModal} from './base'

// exported api
// =

export class PublishArchiveModal extends BaseModal {
  constructor (opts) {
    super()

    this.originalOpts = opts
    this.url = opts.url
    this.title = opts.title || ''
    this.description = opts.description || ''
  }

  // rendering
  // =

  render () {
    return yo`
      <div class="publish-archive-modal">
        <h1 class="title">Publish</h1>

        <p class="help-text">
          Publish this site for your followers to discover and visit.
        </p>

        <form onsubmit=${e => this.onSubmit(e)}>
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Title" onchange=${e => this.onChangeTitle(e)} />

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" placeholder="Description (optional)" onchange=${e => this.onChangeDescription(e)}>${this.description || ''}></textarea>

          <div class="form-actions">
            <button type="button" onclick=${e => this.onClickCancel(e)} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn primary" tabindex="5">Publish</button>
          </div>
        </form>
      </div>`
  }

  // event handlers
  // =

  onChangeTitle (e) {
    this.title = e.target.value
  }

  onChangeDescription (e) {
    this.description = e.target.value
  }

  onClickCancel (e) {
    e.preventDefault()
    this.close(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()
    try {
      // update archive if anything changed
      var details = {title: this.title, description: this.description}
      var archive = new DatArchive(this.url)
      if (this.originalOpts.title !== details.title || this.originalOpts.description !== details.description) {
        await archive.configure(details)
      }
      // publish
      await beaker.archives.publish(this.url)
      this.close(null, details)
    } catch (e) {
      this.close(e.message || e.toString())
    }
  }
}
