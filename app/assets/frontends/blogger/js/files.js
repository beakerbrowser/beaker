import { h } from './util.js'

export class DriveFiles extends HTMLElement {
  constructor () {
    super()
    this.load()
  }

  async load () {
    this.info = await hyperdrive.self.getInfo()
    this.entries = await hyperdrive.self.readdir(location.pathname, {includeStats: true})
    this.entries.sort((a, b) => a.name.localeCompare(b.name))
    this.render()
  }

  render () {
    this.append(h('h2', {}, 'Files'))
    var grid = h('div', {className: 'grid'})
    for (let entry of this.entries) {
      let href = entry.stat.mount ? `hyper://${entry.stat.mount.key}` : `./${entry.name}${entry.stat.isDirectory() ? '/' : ''}`
      grid.append(h('div', {className: 'entry'}, h('a', {href}, entry.name)))
    }
    this.append(grid)
  }

}
customElements.define('drive-files', DriveFiles)