import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { toNiceDriveType, getDriveTypeIcon } from 'beaker://app-stdlib/js/strings.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import mainCSS from '../css/main.css.js'

const EXPLORER_APP = 'https://hyperdrive.network/'
const EXPLORER_URL = drive => `${EXPLORER_APP}${drive.url.slice('hd://'.length)}`

export class DrivesApp extends LitElement {
  static get properties () {
    return {
      drives: {type: Array},
      category: {type: String},
      filter: {type: String}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.drives = undefined
    this.category = 'all'
    this.filter = undefined
    this.load()
    this.addEventListener('contextmenu', this.onContextmenu.bind(this))
  }

  async load () {
    var driveEntries = await navigator.filesystem.query({path: '/system/drives/*', type: 'mount'})
    var driveInfos = await Promise.all(driveEntries.map(entry => (new Hyperdrive(entry.mount).getInfo())))

    let profileStat = await navigator.filesystem.stat('/profile')
    let profileInfo = await (new Hyperdrive(profileStat.mount.key)).getInfo()
    driveInfos.unshift(profileInfo)

    driveInfos.unshift({
      url: navigator.filesystem.url,
      title: 'Home drive',
      description: 'Your private filesystem',
      type: ''
    })

    driveInfos.sort((a, b) => (a.type || '').localeCompare(b.type || '') || (a.title).localeCompare(b.title))

    this.drives = driveInfos
  }

  newDriveMenu (x, y, right = false) {
    contextMenu.create({
      x,
      y,
      right: right || (x > document.body.scrollWidth - 300),
      top: (y > document.body.scrollHeight / 2),
      roomy: false,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items: [
        html`<div class="section-header light small">New drive</a>`,
        {
          icon: 'far fa-fw fa-folder-open',
          label: 'Files drive',
          click: () => this.newDrive()
        },
        {
          icon: 'fas fa-fw fa-desktop',
          label: 'Website',
          click: () => this.newDrive('website')
        },
        {
          icon: 'fas fa-fw fa-cube',
          label: 'Module',
          click: () => this.newDrive('module')
        },
        {
          icon: 'fas fa-fw fa-drafting-compass',
          label: 'Template',
          click: () => this.newDrive('unwalled.garden/template')
        }
      ]
    })
  }

  async newDrive (type) {
    var drive = await Hyperdrive.create({type})
    toast.create('Drive created')
    if (type === 'website') {
      window.location = drive.url
    } else {
      window.location = EXPLORER_URL(drive)
    }
  }

  async cloneDrive (drive) {
    var drive = await Hyperdrive.clone(drive.url)
    toast.create('Drive created')
    window.location = drive.url
  }

  async compareDrive (drive) {
    var target = await navigator.selectFileDialog({
      title: 'Select a folder to compare against',
      select: ['folder']
    })
    window.open(`beaker://compare/?base=${drive.url}&target=${target[0].url}`)
  }

  async driveProps (drive) {
    await navigator.drivePropertiesDialog(drive.url)
    this.load()
  }

  async removeDrive (drive) {
    // TODO
  }

  // rendering
  // =

  render () {
    const navItem = (id, label) => html`
      <a
        class=${classMap({selected: id === this.category})}
        @click=${e => { this.category = id }}
      >${label}</a>
    `
    var drives = this.drives
    if (drives && this.category !== 'all') {
      drives = drives.filter(drive => drive.type === this.category)
    }
    if (drives && this.filter) {
      drives = drives.filter(drive => drive.title.toLowerCase().includes(this.filter))
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <nav>
        <div class="top-ctrl">
          <input placeholder="Filter" @keyup=${e => {this.filter = e.currentTarget.value.toLowerCase()}}>
          <button @click=${this.onClickNew}>New +</button>
        </div>
        <div class="categories">
          ${navItem('all', 'All')}
          ${navItem('', 'Files drives')}
          ${navItem('website', 'Websites')}
          ${navItem('module', 'Modules')}
          ${navItem('unwalled.garden/template', 'Templates')}
          ${navItem('unwalled.garden/person', 'Beaker users')}
        </div>
      </nav>
      <main>
        ${drives ? html`
          <div
            class="drives"
          >
            ${repeat(drives, drive => html`
              <div
                class="${classMap({drive: true})}"
                @click=${e => this.onClickDrive(e, drive)}
                @contextmenu=${e => this.onContextmenuDrive(e, drive)}
              >
                <div class="title"><span class="fa-fw ${getDriveTypeIcon(drive.type)}"></span> ${drive.title || html`<em>Untitled</em>`}</div>
                <div class="details">
                  <div class="type">${toNiceDriveType(drive.type)}</div>
                  <div class="description">${drive.description}</div>
                </div>
                <div class="details">
                  <div class="network">
                    ${drive.url === navigator.filesystem.url ? html`
                      <span class="fa-fw fas fa-lock"></span> private
                    ` : html`
                      <span class="fa-fw fas fa-share-alt"></span> 0 peers
                    `}
                  </div>
                </div>
              </div>
            `)}
            ${drives.length === 0 ? html`
              <div class="empty">No drives found</div>
            ` : ''}
            </div>
          ` : html`
            <div class="loading"><span class="spinner"></span></div>
          `
        }
      </main>
    `
  }

  // events
  // =

  onClickDrive (e, drive) {
    e.preventDefault()
    var url = EXPLORER_URL(drive)
    if (e.metaKey) {
      window.open(url)
    } else {
      window.location = url
    }
  }

  onContextmenuDrive (e, drive) {
    e.preventDefault()
    e.stopPropagation()
    var exploreFilesUrl = EXPLORER_URL(drive)
    contextMenu.create({
      x: e.clientX,
      y: e.clientY,
      right: (e.clientX > document.body.scrollWidth - 300),
      top: (e.clientY > document.body.scrollHeight / 2),
      roomy: false,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items: [
        {
          icon: 'fas fa-fw fa-external-link-alt',
          label: 'Explore files in new tab',
          click: () => window.open(exploreFilesUrl)
        },
        {
          icon: 'fas fa-fw fa-desktop',
          label: 'Open as website',
          click: () => window.open(drive.url)
        },
        {
          icon: html`
            <i class="fa-stack" style="font-size: 6px">
              <span class="far fa-fw fa-hdd fa-stack-2x"></span>
              <span class="fas fa-fw fa-share fa-stack-1x" style="margin-left: -10px; margin-top: -5px; font-size: 7px"></span>
            </i>
          `,
          label: 'Copy drive link',
          click: () => {
            writeToClipboard(drive.url)
            toast.create('Copied to clipboard')
          }
        },
        '-',
        {
          icon: 'far fa-fw fa-clone',
          label: 'Clone this drive',
          click: () => this.cloneDrive(drive)
        },
        {
          icon: html`<i style="padding-left: 2px; font-size: 16px; box-sizing: border-box">◨</i>`,
          label: 'Diff / merge',
          click: () => this.compareDrive(drive)
        },
        {
          icon: 'fas fa-fw fa-trash-alt',
          label: 'Remove from my drives',
          click: () => this.removeDrive(drive)
        },
        '-',
        {
          icon: 'far fa-fw fa-list-alt',
          label: 'Drive properties',
          click: () => this.driveProps(drive)
        }
      ]
    })
  }

  onClickNew (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    this.newDriveMenu(rect.right, rect.bottom, true)
  }

  onContextmenu (e) {
    e.preventDefault()
    e.stopPropagation()
    this.newDriveMenu(e.clientX, e.clientY)
  }
}

customElements.define('app-main', DrivesApp)