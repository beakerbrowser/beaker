import { h } from './util.js'

export class DriveHeader extends HTMLElement {
  constructor () {
    super()
    this.load()
  }

  async load () {
    this.info = await hyperdrive.self.getInfo()
    this.render()
  }

  render () {
    var details = h('div', {className: 'details'})
    details.append(h('h1', {}, this.info.title))
    if (this.info.description) {
      details.append(h('p', {className: 'description'}, this.info.description))
    }
    this.append(details)
    
    var img = h('img', {src: '/thumb'})
    img.addEventListener('error', e => img.style.display = 'none')
    this.append(img)
  }

  async onClickEditProfile (e) {
    e.preventDefault()
    await navigator.drivePropertiesDialog(location.origin)
    location.reload()
  }
}
customElements.define('drive-header', DriveHeader)