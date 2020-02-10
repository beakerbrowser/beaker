import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { toNiceDriveType, getDriveTypeIcon, pluralize } from 'beaker://app-stdlib/js/strings.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import mainCSS from '../css/main.css.js'

const EXPLORER_URL = drive => `https://hyperdrive.network/${drive.url.slice('hyper://'.length)}`
const BEAKER_NETWORK_URL = drive => `https://beaker.network/${(new URL(drive.url)).hostname}`

export class DrivesApp extends LitElement {
  static get properties () {
    return {
      drives: {type: Array},
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
    var drives = await beaker.drives.list({includeSystem: true})

    if (this.category === 'files') {
      drives = drives.filter(drive => !drive.info.type)
    } else if (this.category === 'websites') {
      drives = drives.filter(drive => drive.info.type === 'website')
    } else if (this.category === 'modules') {
      drives = drives.filter(drive => drive.info.type === 'module')
    } else if (this.category === 'wikis') {
      drives = drives.filter(drive => drive.info.type === 'wiki')
    } else if (this.category === 'webterm-cmds') {
      drives = drives.filter(drive => drive.info.type === 'webterm.sh/cmd-pkg')
    } else if (this.category === 'other') {
      drives = drives.filter(drive => !['', 'website', 'module', 'wiki', 'webterm.sh/cmd-pkg'].includes(drive.info.type || ''))
    } else if (this.category === 'system') {
      drives = drives.filter(drive => drive.ident.system)
    }

    drives.sort((a, b) => (a.info.type || '').localeCompare(b.info.type || '') || (a.info.title).localeCompare(b.info.title))

    this.drives = drives
  }

  setCategory (cat) {
    this.category = cat
    this.load()
  }

  newDriveMenu (x, y, right = false) {
    contextMenu.create({
      x,
      y,
      right: right || (x > document.body.scrollWidth - 300),
      top: (y > window.innerHeight / 2),
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
          icon: 'far fa-fw fa-file-word',
          label: 'Wiki Site',
          click: () => this.newDrive('wiki')
        },
        {
          icon: 'fas fa-fw fa-cube',
          label: 'Module',
          click: () => this.newDrive('module')
        },
        {
          icon: 'fas fa-fw fa-code',
          label: 'Code Snippet',
          click: () => this.newDrive('code-snippet')
        },
        {
          icon: 'fas fa-fw fa-users',
          label: 'User Group',
          click: () => this.newDrive('group')
        }
      ]
    })
  }

  driveMenu (drive, x, y, right = false) {
    return contextMenu.create({
      x,
      y,
      right: right || (x > document.body.scrollWidth - 300),
      top: (y > window.innerHeight / 2),
      roomy: false,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items: [
        {
          icon: 'fas fa-fw fa-external-link-alt',
          label: 'Open in a New Tab',
          click: () => window.open(drive.url)
        },
        {
          icon: html`
            <i class="fa-stack" style="font-size: 6px">
              <span class="far fa-fw fa-folder-open fa-stack-2x" style="opacity: 0.4"></span>
              <span class="fas fa-fw fa-search fa-stack-1x" style="margin-left: -1px; margin-top: -2px; font-size: 9px"></span>
            </i>
          `,
          label: 'Open with Files Explorer',
          click: () => window.open(EXPLORER_URL(drive))
        },
        {
          icon: html`<i><img src="/img/beaker-network-icon.svg" style="width: 14px"></i>`,
          label: 'Open with Beaker.Network',
          click: () => window.open(BEAKER_NETWORK_URL(drive))
        },
        '-',
        {
          icon: html`
            <i class="fa-stack" style="font-size: 6px">
              <span class="far fa-fw fa-hdd fa-stack-2x"></span>
              <span class="fas fa-fw fa-share fa-stack-1x" style="margin-left: -10px; margin-top: -5px; font-size: 7px"></span>
            </i>
          `,
          label: 'Copy Drive Link',
          click: () => {
            writeToClipboard(drive.url)
            toast.create('Copied to clipboard')
          }
        },
        '-',
        {
          icon: 'far fa-fw fa-clone',
          label: 'Clone this Drive',
          click: () => this.cloneDrive(drive)
        },
        {
          icon: html`<i style="padding-left: 2px; font-size: 16px; box-sizing: border-box">◨</i>`,
          label: 'Diff / Merge',
          click: () => this.compareDrive(drive)
        },
        '-',
        {
          icon: 'far fa-fw fa-list-alt',
          label: 'Drive Properties',
          click: () => this.driveProps(drive)
        },
        {
          icon: 'fas fa-fw fa-trash-alt',
          label: 'Remove from My Library',
          disabled: drive.ident.system,
          click: () => this.removeDrive(drive)
        }
      ]
    })
  }

  async newDrive (type) {
    var drive = await Hyperdrive.create({type})
    toast.create('Drive created')
    window.location = drive.url
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
    await beaker.drives.remove(drive.url)
    const undo = async () => {
      await beaker.drives.configure(drive.url, {seeding: drive.seeding})
      this.drives.push(drive)
      this.requestUpdate()
    }
    toast.create('Drive removed', '', 10e3, {label: 'Undo', click: undo})
    this.load()
  }

  // rendering
  // =

  render () {
    const navItem = (id, label) => html`
      <a
        class=${classMap({selected: id === this.category})}
        @click=${e => { this.setCategory(id) }}
      >${label}</a>
    `
    var drives = this.drives
    // if (drives && this.category !== 'all') {
    //   drives = drives.filter(drive => drive.type === this.category)
    // }
    if (drives && this.filter) {
      drives = drives.filter(drive => drive.info.title.toLowerCase().includes(this.filter))
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <nav>
        <div class="top-ctrl">
          <input placeholder="Filter" @keyup=${e => {this.filter = e.currentTarget.value.toLowerCase()}}>
          <button class="primary" @click=${this.onClickNew}>New +</button>
        </div>
        <div class="categories">
          <hr>
          ${navItem('all', 'All drives')}
          <hr>
          ${navItem('files', 'Files drives')}
          ${navItem('websites', 'Websites')}
          ${navItem('modules', 'Modules')}
          ${navItem('wikis', 'Wikis')}
          ${navItem('other', 'Other')}
          <hr>
          ${navItem('webterm-cmds', 'Webterm commands')}
          ${navItem('system', 'System')}
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
                @contextmenu=${e => this.onContextmenuDrive(e, drive)}
              >
                <div class="ctrls btn-group">
                  <button ?disabled=${drive.ident.system} @click=${e => this.onToggleHosting(e, drive)}>
                    ${drive.url === navigator.filesystem.url ? html`
                      <span class="fas fa-fw fa-lock"></span> Private
                    ` : drive.seeding ? html`
                      <span class="fas fa-circle"></span> ${drive.info.writable ? 'Hosting' : 'Co-hosting'}: ${drive.info.peers} ${pluralize(drive.info.peers, 'peer')}
                    ` : html`
                      Not hosting
                    `}
                  </button>
                  <button @click=${e => this.onClickDriveMenuBtn(e, drive)}><span class="fas fa-fw fa-caret-down"></span></button>
                </div>
                <div class="title">
                  <a href=${drive.url} title=${drive.info.title || 'Untitled'}>
                    <span class="fa-fw ${getDriveTypeIcon(drive.info.type)}"></span> ${drive.info.title || html`<em>Untitled</em>`}
                  </a>
                </div>
                <div class="details">
                  <div class="type">${toNiceDriveType(drive.info.type)}</div>
                  <div class="description">${drive.info.description}</div>
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
      <section>
        ${this.renderHelp()}
      </section>
    `
  }

  renderHelp () {
    if (this.category === 'all') {
      return html`
        <div class="help">
          <h3><span class="fas fa-fw fa-share-alt"></span> Hyperdrive</h3>
          <p><em>Hyperdrive</em> is a peer-to-peer files network. Each "hyperdrive" (or just "drive") is a networked folder which can be accessed like a website.</p>
          <p>You can create additional hyperdrives to share on the network, and you can also <em>co-host</em> other people's drives to help keep them online.</p>
        </div>
      `
    }
    if (this.category === 'files') {
      return html`
        <div class="help">
          <h3><span class="far fa-fw fa-folder-open"></span> Files drives</h3>
          <p><em>Files drives</em> are folders containing files. They're like .zip archives that live on the network.</p>
        </div>
      `
    }
    if (this.category === 'websites') {
      return html`
        <div class="help">
          <h3><span class="fas fa-fw fa-desktop"></span> Websites</h3>
          <p><em>Websites</em> are hyperdrives that contain web pages and applications.</p>
        </div>
      `
    }
    if (this.category === 'modules') {
      return html`
        <div class="help">
          <h3><span class="fas fa-fw fa-cube"></span> Modules</h3>
          <p><em>Modules</em> are drives that contain code, styles, and other software assets. They can be imported by other drives to provide reusable components.</p>
        </div>
      `
    }
    if (this.category === 'themes') {
      return html`
        <div class="help">
          <h3><span class="fas fa-fw fa-drafting-compass"></span> Themes</h3>
          <p><em>Themes</em> are swappable user-interfaces for drives. You can use a theme in your drive to change the visuals and even generate UIs automatically.</p>
        </div>
      `
    }
    if (this.category === 'webterm-cmds') {
      return html`
        <div class="help">
          <h3><span class="fas fa-fw fa-terminal"></span> Webterm commands</h3>
          <p><em>Webterm</em> is an advanced terminal for interacting with the Hyperdrive ecosystem. You can open it in any tab by pressing <kbd>Ctrl + ~</kbd>.</p>
          <p>Webterm commands are user-created programs which you can execute from Webterm. Install webterm command-packages to add them to your terminal environment.</p>
        </div>
      `
    }
    if (this.category === 'system') {
      return html`
        <div class="help">
          <h3><span class="fas fa-fw fa-cog"></span> System</h3>
          <p>These drives are created by Beaker. Your "Home Drive" is the root of your personal filesystem. Your "Profile" represents you publicly on the network.</p>
        </div>
      `
    }
  }

  // events
  // =

  async onContextmenuDrive (e, drive) {
    e.preventDefault()
    e.stopPropagation()
    var el = e.currentTarget
    el.style.background = '#fafafd'
    await this.driveMenu(drive, e.clientX, e.clientY)
    el.style.background = 'none'
  }

  onClickDriveMenuBtn (e, drive) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    this.driveMenu(drive, rect.right, rect.bottom, true)
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

  async onToggleHosting (e, drive) {
    drive.seeding = !drive.seeding
    await beaker.drives.configure(drive.url, {seeding: drive.seeding})
    if (drive.seeding) {
      toast.create('Now hosting on the network')
    } else {
      toast.create('No longer hosting on the network')
    }
    this.requestUpdate()
  }
}

customElements.define('app-main', DrivesApp)