import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditFilePopup } from './com/edit-file-popup.js'
import { AddLinkPopup } from './com/add-link-popup.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
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
      ${this.renderFiles()}
      <div class="dock-wrapper">
        <div class="dock">
          <a class="dock-item" href="beaker://settings">
            Settings
          </a>
          <a class="dock-item" href="beaker://history">
            History
          </a>
          <a class="dock-item" href="${navigator.filesystem.url}/library/bookmarks">
            Bookmarks
          </a>
          <a class="dock-item" href="beaker://downloads">
            Downloads
          </a>
          <span class="dock-separator">|</span>
          <a class="dock-item" @click=${this.onClickNew}>
            New +
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
            <div class="favicon-wrapper">
              <img src=${'asset:favicon:' + getHref(file) + '?cache_buster=' + Date.now()} class="favicon"/>
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

  onClickNew (e) {
    e.preventDefault()
    e.stopPropagation()

    contextMenu.create({
      x: e.clientX,
      y: e.clientY - 20,
      render: () => {
        return html`
          <link rel="stylesheet" href="beaker://assets/font-awesome.css">
          <style>
            .dropdown-items {
              padding: 6px 0 4px;
            }
            .dropdown-item {
              padding-top: 14px !important;
              padding-bottom: 10px !important;
            }
            .fa-fw {
              margin-left: 2px !important;
              margin-right: 10px !important;
            }
            .description {
              margin-left: 35px !important;
            }
          </style>
          <div class="dropdown-items center top roomy no-border">
            <div class="dropdown-item" @click=${() => this.onCreateDrive()}>
              <div class="label">
                <i class="far fa-fw fa-hdd"></i>
                Files drive
              </div>
              <p class="description">
                Create an empty hyperdrive
              </p>
            </div>
            <div class="dropdown-item" @click=${() => this.onCreateDrive('website')}>
              <div class="label">
                <i class="fa fa-fw fa-code"></i>
                Website
              </div>
              <p class="description">
                Create a new website 
              </p>
            </div>
            <hr>
            <div class="dropdown-item" @click=${this.onCreateDriveFromFolder}>
              <div class="label">
                <i class="far fa-fw fa-folder"></i>
                From folder
              </div>
              <p class="description">
                Create from a folder on your computer
              </p>
            </div>
          </div>
        `
      }
    })
  }

  async onCreateDrive (type) {
    contextMenu.destroy()
    var drive = await DatArchive.create({type})
    window.location = drive.url
  }

  async onCreateDriveFromFolder () {
    contextMenu.destroy()
    var folder = await beaker.browser.showOpenDialog({
      title: 'Select folder',
      buttonLabel: 'Use folder',
      properties: ['openDirectory']
    })
    if (!folder || !folder.length) return

    var drive = await DatArchive.create({
      title: folder[0].split('/').pop(),
      prompt: false
    })
    toast.create('Importing...')
    await DatArchive.importFromFilesystem({src: folder[0], dst: drive.url})
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