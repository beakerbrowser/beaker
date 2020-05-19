/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
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
      var width = this.shadowRoot.querySelector('div').clientWidth|0
      var height = this.shadowRoot.querySelector('div').clientHeight|0
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
      .replace('`', '~')
  }

  renderMenuItems (menu) {
    var items = this.menuItems[menu]
    if (!items) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="section">
          ${repeat(items, (item, i) => item.id || i, item => item.separator
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

  render_drive () {
    return this.renderMenuItems('Drive')
  }

  render_bookmarks () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper wide">
        <div class="section scrollable">
          ${repeat(this.bookmarks, b => b.href, b => html`
            <div class="menu-item" @click=${e => this.onOpenPage(e, b.href)}>
              <img class="favicon" src="asset:favicon:${b.href}">
              <span class="label">${b.title}</span>
            </div>
          `)}
        </div>
      </div>
    `
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