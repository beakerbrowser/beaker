/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'

class ToolbarMenu extends LitElement {
  static get properties () {
    return {
      menu: {type: String},
      menuItems: {type: Object}
    }
  }

  constructor () {
    super()
    this.menu = undefined
    this.url = undefined
    this.bookmarks = []
    this.isDarwin = false
    this.menuItems = {}
  }

  async fetchBrowserInfo () {
    // REMOVEME
    var browserInfo = await bg.beakerBrowser.getInfo()
    const isDarwin = browserInfo.platform === 'darwin'
    const c = isDarwin ? '⌘' : '^'
    const ctrl = '^'
    const s = '⇧'
    const opt = '⌥'

    this.menuItems = {
      file: [
        [
          {id: 'newTab', label: 'New Tab', accel: `${c}T`},
          {id: 'newWindow', label: 'New Window', accel: `${c}N`},
          {id: 'reopenClosedTab', label: 'Re-open Closed Tab', accel: `${s}${c}T`}
        ],
        [
          {id: 'openFile', label: 'Open File...', accel: `${c}O`}
        ],
        [
          {id: 'savePage', label: 'Save Page As...', accel: `${c}S`},
          {id: 'print', /*icon: 'fas fa-print',*/ label: 'Print', accel: `${c}P`}
        ],
        [
          {id: 'closeTab', label: 'Close Tab', accel: `${c}W`},
          {id: 'closeWindow', label: 'Close Window', accel: `${s}${c}W`}
        ]
      ],
      edit: [
        [
          {id: 'undo', label: 'Undo', accel: `${c}Z`},
          {id: 'redo', label: 'Redo', accel: `${s}${c}Z`}
        ],
        [
          {id: 'cut', label: 'Cut', accel: `${c}X`},
          {id: 'copy', label: 'Copy', accel: `${c}C`},
          {id: 'paste', label: 'Paste', accel: `${c}V`},
          {id: 'selectAll', label: 'Select All', accel: `${c}A`},
        ],
        [
          {id: 'findInPage', label: 'Find in Page', accel: `${c}F`},
          {id: 'findNext', label: 'Find Next', accel: `${c}G`},
          {id: 'findPrev', label: 'Find Previous', accel: `${s}${c}G`},
        ]
      ],
      view: [
        [
          {id: 'reload', label: 'Reload', accel: `${c}R`},
          {id: 'hardReload', label: 'Hard Reload', accel: `${s}${c}R`},
        ],
        [
          {id: 'toggleSiteInfo', label: 'Site Information', icon: 'fas fa-info-circle'},
          {id: 'toggleEditor', label: 'Editor', icon: 'fas fa-edit'},
          {id: 'toggleFilesExplorer', label: 'Files Explorer', icon: 'far fa-folder', hyperOnly: true},
          {id: 'toggleTerminal', label: 'Terminal', icon: 'fas fa-terminal'},
        ],
        [
          {id: 'toggleBrowserUi', label: 'Toggle Browser UI', accel: `${s}${c}H`},
          {id: 'popOutTab', label: 'Pop Out Tab', accel: `${s}${c}P`},
          {id: 'fullScreen', label: 'Full Screen', accel: `${ctrl}${c}F`},
        ],
        [
          {id: 'zoomIn', label: 'Zoom In', accel: `${c}+`},
          {id: 'zoomOut', label: 'Zoom Out', accel: `${c}-`},
          {id: 'actualSize', label: 'Actual Size', accel: `${c}0`},
        ]
      ],
      drive: [
        [
          {id: 'newDrive', label: 'New Hyperdrive'},
          {id: 'newDriveFromFolder', label: 'New Drive from Folder...'},
        ],
        [
          {id: 'cloneDrive', label: 'Clone Drive', hyperOnly: true},
          {id: 'forkDrive', label: 'Fork Drive', hyperOnly: true},
        ],
        [
          {id: 'diffMerge', label: 'Diff / Merge', hyperOnly: true},
        ],
        [
          {id: 'driveProperties', label: 'Drive Properties', hyperOnly: true},
        ]
      ],
      developer: [
        [
          {id: 'toggleDevTools', label: 'Toggle Dev Tools', accel: `${opt}${c}I`},
          {id: 'toggleLiveReloading', label: 'Toggle Live Reloading', hyperOnly: true}
        ]
      ],
      help: [
        [
          {id: 'help', label: 'Beaker Help', icon: 'fas fa-question-circle'},
          {id: 'devPortal', label: 'Developer\'s Portal', icon: 'fas fa-code'},
          {id: 'githubRepo', label: 'GitHub Repo', icon: 'fab fa-github'},
        ]
      ]
    }
  }

  reset () {
    this.menu = undefined
    this.menuItems = {}
    this.bookmarks = []
  }

  async init (params, isUpdate = false) {
    this.menu = params && params.menu ? params.menu : undefined
    if (!isUpdate) {
      let [browserInfo, menuItems] = await Promise.all([
        bg.beakerBrowser.getInfo(),
        bg.shellMenus.getWindowMenu()
      ])
      this.isDarwin = browserInfo.platform === 'darwin'
      this.menuItems = menuItems
    }
    if (this.menu === 'bookmarks') {
      this.bookmarks = await bg.bookmarks.list({sortBy: 'title'})
      this.bookmarks.sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()))
      await this.requestUpdate()
    }
  }

  async updateMenu (params) {
    return this.init(params, true)
  }

  updated () {
    // adjust dimensions based on rendering
    if (!this.menu) return
    try {
      var width = this.shadowRoot.querySelector('div').clientWidth
      var height = this.shadowRoot.querySelector('div').clientHeight
      bg.shellMenus.resizeSelf({width, height})
    } catch (e) {}
  }

  render () {
    if (!this.menu) return html``
    return this[`render_${this.menu}`]()
  }

  renderAccelerator (accel) {
    if (!accel) return
    const command = '⌘'
    const control = '^'
    const commandOrControl = this.isDarwin ? command : control
    return accel
      .replace(/\+/g, '')
      .replace('CmdOrCtrl', commandOrControl)
      .replace('Alt', '⌥')
      .replace('Cmd', command)
      .replace('Ctrl', control)
      .replace('Shift', '⇧')
      .replace('Plus', '+')
      .replace('Left', '←')
      .replace('Right', '→')
  }

  renderMenuItems (menu) {
    var items = this.menuItems[menu]
    if (!items) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="section">
          ${items.map(item => item.separator
            ? html`<hr>`
            : html`
              <div class="menu-item" @click=${this.onClickMenuItem(menu, item.id)} ?disabled=${!item.enabled}>
                <span class="label">${item.label}</span>
                ${item.accelerator ? html`<span class="shortcut">${this.renderAccelerator(item.accelerator)}</span>` : ''}
              </div>
            `
          )}
        </div>
      </div>
    `
  }

  render_file () {
    return this.renderMenuItems('File')
  }

  render_edit () {
    return this.renderMenuItems('Edit')
  }

  render_view () {
    return this.renderMenuItems('View')
  }

  render_history () {
    return this.renderMenuItems('History')
  }

  render_bookmarks () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper wide">
        <div class="section scrollable">
          ${this.bookmarks.map(b => html`
            <div class="menu-item" @click=${e => this.onOpenPage(e, b.href)}>
              <img class="favicon" src="asset:favicon:${b.href}">
              <span class="label">${b.title}</span>
            </div>
          `)}
        </div>
      </div>
    `
  }

  render_drive () {
    return this.renderMenuItems('Drive')
  }

  render_developer () {
    return this.renderMenuItems('Developer')
  }

  render_help () {
    return this.renderMenuItems('Help')
  }

  // events
  // =

  onClickMenuItem (menu, id) {
    return async (e) => {
      bg.shellMenus.triggerWindowMenuItemById(menu, id)
      bg.shellMenus.close()
    }
  }

  onOpenPage (e, url) {
    bg.shellMenus.createTab(url)
    bg.shellMenus.close()
  }
}
ToolbarMenu.styles = [commonCSS, css`
.wrapper {
  width: 200px;
}

.wrapper.wide {
  width: 250px;
}

.wrapper::-webkit-scrollbar {
  display: none;
}

.section:last-child {
  border-bottom: 0;
}

.section.scrollable {
  max-height: 500px;
  overflow-y: auto;
}

.menu-item {
  height: 30px;
}

.menu-item[disabled] {
  color: #99a;
}

.menu-item[disabled]:hover {
  background: none;
}

.menu-item i.right {
  font-size: 11px;
  margin-left: auto;
  padding-right: 0;
  position: relative;
  left: 5px;
}

.menu-item i.more {
  margin-left: auto;
  padding-right: 0;
  text-align: right;
}

.menu-item .more,
.menu-item .shortcut {
  color: #777;
  margin-left: auto;
}

.menu-item .shortcut {
  font-size: 12px;
  -webkit-font-smoothing: antialiased;
}
`]

customElements.define('toolbar-menu', ToolbarMenu)