import { LitElement, html } from '../vendor/lit-element.js'

class NewPage extends LitElement {
  static get properties () {
    return {
      errors: Object,
      siteInfo: Object
    }
  }

  constructor() {
    super()
    this.errors = {}
  }

  createRenderRoot() {
    return this // dont use the shadow dom
  }

  render() {
    return html`
      <style>
        textarea {
          min-height: 400px !important;
        }
      </style>
      <h3 class="is-size-3">New page</h3>
      <form @submit=${this.onSubmit}>
        <div class="field">
          <label class="label">Title</label>
          <div class="control">
            <input name="title" class="input${this.errors.title ? ' is-danger': ''}" type="text" autofocus placeholder="The title of the page">
          </div>
          ${this.errors.title ? html`<p class="help is-danger">Required</p>` : ''}
        </div>

        <div class="field">
          <label class="label">Description</label>
          <div class="control">
            <input name="description" class="input" type="text" autofocus placeholder="A very short description (optional)">
          </div>
        </div>

        <div class="field">
          <label class="label">Content</label>
          <div class="control">
            <textarea name="content" class="textarea${this.errors.content ? ' is-danger': ''}" placeholder="Can be Markdown or HTML"></textarea>
          </div>
          ${this.errors.content ? html`<p class="help is-danger">Required</p>` : ''}
        </div>

        <div class="field is-grouped">
          <div class="control">
            <button type="submit" class="button is-link">Publish</button>
          </div>
        </div>
      </form>
    `
  }

  async onSubmit (e) {
    e.preventDefault()
    var title = e.target.title.value.trim()
    var description = e.target.description.value.trim()
    var content = e.target.content.value.trim()
    
    // validate
    this.errors = {
      title: !title,
      content: !content
    }
    if (this.errors.title || this.errors.content) {
      return
    }

    // post
    var createdAt = (new Date()).toISOString()
    var site = new DatArchive(window.location)
    await site.mkdir('/data').catch(err => undefined)
    await site.mkdir('/data/pages').catch(err => undefined)
    await site.writeFile(`/data/pages/${createdAt}.json`, JSON.stringify({
      type: 'unwalled.garden/markdown-page',
      title,
      description,
      content,
      createdAt
    }))

    window.location = '/pages/' + createdAt
  }
}

customElements.define('x-new-page', NewPage)
