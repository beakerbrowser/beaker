import { h } from './util.js'

export class DriveHeader extends HTMLElement {
  constructor () {
    super()
    this.self = new Hyperdrive(location)
    this.load()
  }

  async load () {
    this.info = await this.self.getInfo()
    this.render()
  }

  render () {
    var img = h('img', {src: '/thumb'})
    img.addEventListener('error', e => img.style.display = 'none')
    this.append(img)

    var details = h('div', {className: 'details'})
    details.append(h('h1', {}, this.info.title))
    if (this.info.description) {
      details.append(h('p', {className: 'description'}, this.info.description))
    }
    this.append(details)

    var links = h('div', {className: 'links'})
    var key = (/[0-9a-f]{64}/i).exec(this.self.url)[0]
    links.append(h('a', {className: 'btn', href: `https://beaker.network/${key}`}, 'View on Beaker.Network'))
    if (this.info.writable) {
      let editProfile = h('a', {className: 'btn', href: `https://beaker.network/${key}`}, 'Edit Profile')
      editProfile.addEventListener('click', this.onClickEditProfile.bind(this))
      links.append(editProfile)
    }
    this.append(links)
  }

  async onClickEditProfile (e) {
    e.preventDefault()
    await navigator.drivePropertiesDialog(location.origin)
    location.reload()
  }
}
customElements.define('drive-header', DriveHeader)