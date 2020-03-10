import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditBookmarkPopup } from 'beaker://library/js/com/edit-bookmark-popup.js'
import { AddLinkPopup } from './com/add-link-popup.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as desktop from './lib/desktop.js'
import 'beaker://library/js/views/drives.js'
import 'beaker://library/js/views/bookmarks.js'
import css from '../css/main.css.js'

class DesktopApp extends LitElement {
  static get properties () {
    return {
      files: {type: Array},
      filter: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.files = []
    this.filter = ''
    this.load()

    window.addEventListener('focus', e => {
      this.load()
    })
  }

  async load () {
    this.files = await desktop.load()
    console.log(this.files)
    Array.from(this.shadowRoot.querySelectorAll('[loadable]'), el => el.load())
  }

  // rendering
  // =

  render () {
    if (!this.files) {
      return html`<div></div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <header>
        <div class="search-ctrl">
          <span class="fas fa-search"></span>
          <input placeholder="Search my library" @keyup=${e => {this.filter = e.currentTarget.value.toLowerCase()}}>
        </div>
        <a class="new-btn" @click=${this.onClickNew}>New <span class="fas fa-plus"></span></a>
      </header>
      ${this.renderFiles()}
      <drives-view class="top-border" loadable hide-empty .filter=${this.filter}></drives-view>
      <bookmarks-view class=${!this.filter ? 'hidden' : ''} loadable hide-empty other-only .filter=${this.filter}></bookmarks-view>
      </div>
    `
  }

  renderFiles () {
    var files = this.files
    if (this.filter) {
      files = files.filter(file => (
        getHref(file).toLowerCase().includes(this.filter)
        || getTitle(file).toLowerCase().includes(this.filter)
      ))
    }
    if (this.filter && files.length === 0) {
      return ''
    }
    return html`
      <div class="files">
        ${repeat(files, file => html`
          <a
            class="file"
            href=${getHref(file)}
            @contextmenu=${e => this.onContextmenuFile(e, file)}
          >
            <div class="thumb-wrapper">
              <img src=${'asset:screenshot:' + getHref(file)} class="thumb"/>
            </div>
            <div class="details">
              <div class="title">${getTitle(file)}</div>
            </div>
          </a>
        `)}
        ${!this.filter ? html`
          <a class="file add" @click=${this.onClickAdd}>
            <span class="fas fa-fw fa-plus"></span>
          </a>
        ` : ''}
      </div>
    `
  }

  // events
  // =

  async onClickNew (e) {
    var drive = await hyperdrive.create()
    window.location = drive.url
  }

  async onClickAdd () {
    try {
      await desktop.createLink(await AddLinkPopup.create())
      toast.create('Link added', '', 10e3)
    } catch (e) {
      // ignore
      console.log(e)
    }
    this.load()
  }

  async onContextmenuFile (e, file) {
    e.preventDefault()
    const items = [
      {icon: 'fa fa-external-link-alt', label: 'Open Link in New Tab', click: () => window.open(getHref(file))},
      {icon: 'fa fa-link', label: 'Copy Link Address', click: () => writeToClipboard(getHref(file))},
      (file.isFixed) ? undefined : {icon: 'fa fa-pencil-alt', label: 'Edit', click: () => this.onClickEdit(file)},
      (file.isFixed) ? undefined : {icon: 'fa fa-times', label: 'Delete', click: () => this.onClickRemove(file)}
    ].filter(Boolean)
    await contextMenu.create({x: e.clientX, y: e.clientY, items, fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'})
  }

  async onClickEdit (file) {
    try {
      await EditBookmarkPopup.create(file)
      this.load()
    } catch (e) {
      // ignore
      console.log(e)
    }
  }

  async onClickRemove (file) {
    if (!confirm('Are you sure?')) return
    await desktop.remove(file)
    toast.create('Item removed', '', 10e3)
    this.load()
  }
}

customElements.define('desktop-app', DesktopApp)

// internal
// =

function getHref (file) {
  if (file.name.endsWith('.goto')) return file.stat.metadata.href
  return `${hyperdrive.getSystemDrive().url}/bookmarks/${file.name}`
}

function getTitle (file) {
  return file.stat.metadata.title || file.name
}