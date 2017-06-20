import * as yo from 'yo-yo'
import * as pages from '../../pages'
import * as sidebar from '../sidebar'

export class DatSidebarBtn {
  constructor () {
  }

  render () {
    const pressed = sidebar.getIsOpen() ? 'pressed' : ''
    return yo`
      <button title="Toggle sidebar" class="toolbar-btn dat-sidebar btn ${pressed}" onclick=${e => this.onClickBtn(e)} title="Menu">
        <i class="fa fa-columns"></i>
      </button>
    `
  }

  onClickBtn (e) {
    if (sidebar.getIsOpen()) {
      sidebar.close()
    } else {
      sidebar.open(pages.getActive())
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