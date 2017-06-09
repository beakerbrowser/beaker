import * as yo from 'yo-yo'
import * as pages from '../../pages'

export class DatSidebarBtn {
  constructor () {
    this.isSidebarOpen = false
  }

  render () {
    return yo`
      <button title="Show info" class="toolbar-btn dat-sidebar btn ${this.isSidebarOpen?'pressed':''}" onclick=${e => this.onClickBtn(e)} title="Menu">
        <i class="fa fa-info-circle"></i>
      </button>
    `
  }

  openSidebar() {
    var page = pages.getActive()
    if (!page) return

    // are we on a dat site?
    if (!page.siteInfo) {
      return
    }

    var {key} = page.siteInfo
    this.webview = pages.createWebviewEl('dat-sidebar-webview', `beaker://dat-sidebar/${key}`)
    this.webview.id = 'dat-sidebar-webview'
    document.querySelector('#dat-sidebar').appendChild(this.webview)
  }

  closeSidebar() {
    document.querySelector('#dat-sidebar').innerHTML = ''
  }

  onClickBtn (e) {
    this.isSidebarOpen = !this.isSidebarOpen
    this.render()
    if (this.isSidebarOpen) {
      this.openSidebar()
    } else {
      this.closeSidebar()
    }
  }
}