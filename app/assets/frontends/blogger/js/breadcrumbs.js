import { h } from './util.js'

export class DriveBreadcrumbs extends HTMLElement {
  constructor () {
    super()
    this.render()
  }

  render () {
    var pathname = location.pathname
    var parts = pathname.split('/')
    if (parts.length > 1 && !parts[parts.length - 1]) {
      parts.pop()
    }

    let acc = []
    for (let part of parts) {
      let href = acc.concat([part]).join('/') || '/'
      this.append(h('a', {href}, part || 'Home'))
      acc.push(part)
      if (acc.length !== parts.length) {
        this.append(h('span', {}, '❯'))
      }
    }
  }

}
customElements.define('drive-breadcrumbs', DriveBreadcrumbs)