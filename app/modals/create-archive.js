/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

class CreateArchiveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String}
    }
  }

  constructor () {
    super()
    this.cbs = null
    this.title = ''
    this.description = ''
    this.type = null
    this.links = null
    this.networked = true
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.title = params.title || ''
    this.description = params.description || ''
    this.type = params.type
    this.links = params.links
    this.networked = ('networked' in params) ? params.networked : true
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <div class="wrapper">
        <h1 class="title">New archive</h1>

        <p class="help-text">
          Create a new archive and add it to your Library.
        </p>

        <form @submit=${this.onSubmit}>
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Title" @change=${this.onChangeTitle} />

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" placeholder="Description (optional)" @change=${this.onChangeDescription}>${this.description || ''}</textarea>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn success" tabindex="5">Create archive</button>
          </div>
        </form>
      </div>
    `
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
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()
    try {
      var url = await bg.datArchive.createArchive({
        title: this.title,
        description: this.description,
        type: this.type,
        networked: this.networked,
        links: this.links,
        prompt: false
      })
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}
CreateArchiveModal.styles = [commonCSS, inputsCSS, buttonsCSS]

customElements.define('create-archive-modal', CreateArchiveModal)