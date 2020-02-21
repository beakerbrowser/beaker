import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditFilePopup } from './com/edit-file-popup.js'
import { AddLinkPopup } from './com/add-link-popup.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as newDriveDropdown from 'beaker://app-stdlib/js/com/new-drive-dropdown.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as desktop from './lib/desktop.js'
import css from '../css/main.css.js'

class DesktopApp extends LitElement {
  static get properties () {
    return {
      files: {type: Array}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.files = []
    this.load()

    window.addEventListener('focus', e => {
      this.load()
    })
  }

  async load () {
    this.files = await desktop.load()
    console.log(this.files)
  }

  // rendering
  // =

  render () {
    if (!this.files) {
      return html`<div></div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="top-right-ctrls">
        <a @click=${this.onClickNew}>New <span class="fas fa-plus"></span></a>
      </div>
      ${this.renderFiles()}
      <div class="dock-wrapper">
        <div class="dock">
          <a class="dock-item" href="beaker://settings">
            Settings
          </a>
          <a class="dock-item" href="beaker://history">
            History
          </a>
          <a class="dock-item" href="beaker://downloads">
            Downloads
          </a>
          <a class="dock-item" href="beaker://library">
            My Library
          </a>
          <a class="dock-item" href="https://hyperdrive.network/${navigator.filesystem.url.slice('hyper://'.length)}">
            My Home Drive
          </a>
        </div>
      </div>
    `
  }

  renderFiles () {
    return html`
      <div class="files">
        ${repeat(this.files, file => html`
          <a
            class="file"
            href=${getHref(file)}
            @contextmenu=${e => this.onContextmenuFile(e, file)}
          >
            <div class="thumb-wrapper">
              <img src=${'asset:screenshot:' + getHref(file) + '?cache_buster=' + Date.now()} class="thumb"/>
            </div>
            <div class="details">
              <div class="title">${getTitle(file)}</div>
            </div>
          </a>
        `)}
        <a class="file add" @click=${this.onClickAdd}>
          <span class="fas fa-fw fa-plus"></span>
        </a>
      </div>
    `
  }

  // events
  // =

  async onClickNew (e) {
    e.preventDefault()
    e.stopPropagation()

    var btn = e.currentTarget
    var rect = btn.getClientRects()[0]
    btn.classList.add('pressed')
    await newDriveDropdown.create({
      x: rect.left - 5,
      y: 8
    })
    btn.classList.remove('pressed')
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
      await EditFilePopup.create(file)
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
  return `${navigator.filesystem.url}/desktop/${file.name}`
}

function getTitle (file) {
  return file.stat.metadata.title || file.name
}