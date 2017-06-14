import * as yo from 'yo-yo'
import * as pages from '../../pages'
import * as sidebar from '../sidebar'

export class DatSidebarBtn {
  constructor () {
  }

  render () {
    return yo`
      <button title="Show info" class="toolbar-btn dat-sidebar btn" onclick=${e => this.onClickBtn(e)} title="Menu">
        <i class="fa fa-toggle-${sidebar.getIsOpen()?'right':'left'}"></i>
      </button>
    `
  }

  openSidebar() {
    var page = pages.getActive()
    var key = (page && page.siteInfo) ? page.siteInfo.key : ''
    sidebar.open(`beaker://dat-sidebar/${key}`)
  }

  onClickBtn (e) {
    if (sidebar.getIsOpen()) {
      sidebar.close()
    } else {
      this.openSidebar()
    }
    this.updateActives()
  }

  updateActives() {
    // FIXME
    // calling `this.render` for all active site-infos is definitely wrong
    // there is state captured in `this` that is specific to each instance
    // ...this entire thing is kind of bad
    // -prf
    Array.from(document.querySelectorAll('.dat-sidebar.btn')).forEach(el => yo.update(el, this.render()))
  }
}