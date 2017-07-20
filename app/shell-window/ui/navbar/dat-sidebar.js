import * as yo from 'yo-yo'
import * as sidebar from '../sidebar'

export class DatSidebarBtn {
  constructor () {
    sidebar.on('change', this.updateActives.bind(this))
  }

  render () {
    if (!sidebar.getIsAvailable() || !sidebar.getIsOpen()) {
      // hide the button
      return yo`<button class="toolbar-btn dat-sidebar btn hidden"></button>`
    }

    return yo`
      <button title="Toggle sidebar" class="toolbar-btn dat-sidebar btn pressed" onclick=${e => this.onClickBtn(e)}>
        <i class="fa fa-columns"></i>
      </button>
    `
  }

  onClickBtn (e) {
    sidebar.toggle()
    this.updateActives()
  }

  updateActives () {
    Array.from(document.querySelectorAll('.dat-sidebar.btn')).forEach(el => yo.update(el, this.render()))
  }
}
