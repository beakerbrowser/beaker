/* globals DatArchive */

import * as yo from 'yo-yo'
import {BaseModal} from './base'

// exported api
// =

export class CreateArchiveModal extends BaseModal {
  constructor (opts) {
    super(opts)

    this.title = opts.title || ''
    this.description = opts.description || ''
    this.type = opts.type
    this.links = opts.links
    this.networked = ('networked' in opts) ? opts.networked : true
  }

  // rendering
  // =

  render () {
    return yo`
      <div class="create-archive-modal">
        <h1 class="title">New archive</h1>

        <p class="help-text">
          Create a new archive and add it to your Library.
        </p>

        <form onsubmit=${e => this.onSubmit(e)}>
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Title" onchange=${e => this.onChangeTitle(e)} />

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" placeholder="Description (optional)" onchange=${e => this.onChangeDescription(e)}>${this.description || ''}></textarea>

          <div class="form-actions">
            <button type="button" onclick=${e => this.onClickCancel(e)} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn primary" tabindex="5">Create archive</button>
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
      var newArchive = await DatArchive.create({
        title: this.title,
        description: this.description,
        type: this.type,
        networked: this.networked,
        links: this.links,
        prompt: false
      })
      this.close(null, {url: newArchive.url})
    } catch (e) {
      this.close(e.message || e.toString())
    }
  }
}
