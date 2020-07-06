import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { pluralize } from 'beaker://app-stdlib/js/strings.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import drivesCSS from '../../css/views/drives.css.js'

const EXPLORER_URL = drive => `beaker://explorer/${drive.url.slice('hyper://'.length)}`

export class DrivesView extends LitElement {
  static get properties () {
    return {
      drives: {type: Array},
      readonly: {type: Boolean},
      filter: {type: String},
      showHeader: {type: Boolean, attribute: 'show-header'},
      hideEmpty: {type: Boolean, attribute: 'hide-empty'}
    }
  }

  static get styles () {
    return drivesCSS
  }

  constructor () {
    super()
    this.drives = undefined
    this.readonly = false
    this.filter = undefined
    this.showHeader = false
    this.hideEmpty = false
  }

  async load () {
    var drives = await beaker.drives.list({includeSystem: false})

    drives = drives.filter(drive => {
      // move forks onto their parents
      if (drive.forkOf) {
        let parent = drives.find(d => d.key === drive.forkOf.key)
        if (parent) {
          parent.forks = parent.forks || []
          parent.forks.push(drive)
          if (drive.info.writable) {
            parent.hasWritableFork = true
          }
          return false
        }
      }
      return true
    })
    drives = drives.filter(drive => {
      if (this.readonly) {
        return !drive.info.writable
      } else {
        return drive.info.writable || drive.hasWritableFork
      }
    })
    drives.sort((a, b) => (a.info.title).localeCompare(b.info.title))
    console.log(drives)

    this.drives = drives
  }

  async driveMenu (drive) {
    var items = [
      {
        label: 'Open in a New Tab',
        click: () => window.open(drive.url)
      },
      {
        label: 'Explore Files',
        click: () => window.open(EXPLORER_URL(drive))
      },
      {type: 'separator'},
      {
        label: 'Copy Drive Link',
        click: () => {
          writeToClipboard(drive.url)
          toast.create('Copied to clipboard')
        }
      },
      {type: 'separator'},
      {
        label: 'Fork this Drive',
        click: () => this.forkDrive(drive)
      },
      {
        label: 'Diff / Merge',
        click: () => this.diffDrive(drive)
      },
      {type: 'separator'},
      {
        label: 'Drive Properties',
        click: () => this.driveProps(drive)
      },
      {
        label: drive.info.writable ? 'Remove from My Library' : 'Stop hosting',
        disabled: drive.ident.internal,
        click: () => this.removeDrive(drive)
      }
    ]
    var fns = {}
    for (let i = 0; i < items.length; i++) {
      if (items[i].id) continue
      let id = `item=${i}`
      items[i].id = id
      fns[id] = items[i].click
      delete items[i].click
    }

    var choice = await beaker.browser.showContextMenu(items)
    if (fns[choice]) fns[choice]()
  }

  async forkDrive (drive) {
    var drive = await beaker.hyperdrive.forkDrive(drive.url)
    toast.create('Drive created')
    window.open(drive.url)
    this.load()
  }

  async diffDrive (drive) {
    window.open(`beaker://diff/?base=${drive.url}`)
  }

  async driveProps (drive) {
    await beaker.shell.drivePropertiesDialog(drive.url)
    this.load()
  }

  async removeDrive (drive) {
    await beaker.drives.remove(drive.url)
    const undo = async () => {
      await beaker.drives.configure(drive.url)
      this.drives.push(drive)
      this.requestUpdate()
    }
    toast.create('Drive removed', '', 10e3, {label: 'Undo', click: undo})
    this.load()
  }

  // rendering
  // =

  render () {
    var drives = this.drives
    if (drives && this.filter) {
      drives = drives.filter(drive => drive.info.title.toLowerCase().includes(this.filter))
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${drives ? html`
        ${this.showHeader && !(this.hideEmpty && drives.length === 0) ? html`
          <h4>Drives</h4>
        ` : ''}
        <div class="drives">
          ${repeat(drives, drive => this.renderDrive(drive))}
          ${drives.length === 0 && !this.hideEmpty ? html`
            ${this.readonly ? html`
              <div class="empty"><span class="fas fa-share-alt" style="margin-bottom: 30px"></span><div>Not currently hosting any Hyperdrives</div></div>
            ` : html`
              <div class="empty"><span class="fas fa-hdd"></span><div>Click "New Drive" to create a Hyperdrive</div></div>
            `}
          ` : ''}
          ${drives.length === 0 && this.filter ? html`
            <div class="empty"><div>No matches found for "${this.filter}".</div></div>
          ` : ''}
        </div>
      ` : html`
        <div class="loading"><span class="spinner"></span></div>
      `}
    `
  }

  renderDrive (drive) {
    var numForks = drive.forks?.length || 0
    return html`
      <a
        href=${drive.url}
        title=${drive.info.title || 'Untitled'}
        class="${classMap({drive: true})}"
        @contextmenu=${e => this.onContextmenuDrive(e, drive)}
      >
        <img class="favicon" src="asset:favicon:${drive.url}">
        <div class="title">
          ${drive.info.title || html`<em>Untitled</em>`}
        </div>
        <div class="description">
          ${drive.forkOf ? html`
            <span class="fork-label">${drive.forkOf.label || 'no label'}</span></div>
          ` : ''}
          ${!drive.info.writable ? html`<span class="readonly">readonly</span>` : ''}
          ${drive.info.description.slice(0, 50)}
        </div>
        <div class="forks">
          ${numForks > 0 ? html`
            <a @click=${e => this.onClickViewForksOf(e, drive)} href="#">
              ${numForks} ${pluralize(numForks, 'fork')}
              ${drive.showForks ? html`<span class="fas fa-fw fa-caret-down"></span>` : ''} 
            </a>
          ` : html`<a>-</a>`}
        </div>
        <div class="peers">
          ${drive.ident.system ? html`
            <a><span class="fas fa-lock"></span></a>
          ` : typeof drive.info.peers === 'undefined' ? html`
            <a>-</a>
          ` : html`
            <a>${drive.info.peers} ${pluralize(drive.info.peers, 'peer')}</a>
          `}
        </div>
        <div class="ctrls">
          <button class="transparent" @click=${e => this.onClickDriveMenuBtn(e, drive)}><span class="fas fa-fw fa-ellipsis-h"></span></button>
        </div>
      </a>
      ${drive.showForks && numForks > 0 ? html`
        <div class="forks-container">
          ${repeat(drive.forks, fork => this.renderDrive(fork))}
        </div>
      ` : ''}
    `
  }

  // events
  // =

  async onContextmenuDrive (e, drive) {
    e.preventDefault()
    e.stopPropagation()
    await this.driveMenu(drive)
  }

  onClickDriveMenuBtn (e, drive) {
    e.preventDefault()
    e.stopPropagation()
    this.driveMenu(drive)
  }

  onClickViewForksOf (e, drive) {
    e.preventDefault()
    drive.showForks = !drive.showForks
    this.requestUpdate()
  }
}

customElements.define('drives-view', DrivesView)