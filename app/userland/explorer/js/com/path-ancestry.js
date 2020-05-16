import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { handleDragDrop } from '../lib/drag-drop.js'
import { emit } from '../lib/dom.js'
import { joinPath } from '../lib/strings.js'

export class PathAncestry extends LitElement {
  static get properties () {
    return {
      driveTitle: {type: String, attribute: 'drive-title'},
      driveInfo: {type: Object},
      pathAncestry: {type: Array}
    }
  }

  constructor () {
    super()
    this.driveTitle = undefined
    this.driveInfo = undefined
    this.pathAncestry = []
  }

  createRenderRoot () {
    return this // no shadow dom
  }

  // rendering
  // =

  render () {
    if (!this.driveInfo) return html``
    return html`
      <a
        class="author"
        href=${this.driveInfo.url}
        @click=${this.onClickParentFolder}
        @dragenter=${this.onDragenter}
        @dragleave=${this.onDragleave}
        @dragover=${this.onDragOver}
        @drop=${e => this.onDrop(e, undefined)}
      >
        <span class="fas fa-fw fa-hdd"></span> ${this.driveTitle}
      </a>
      ${this.renderPathAncestry()}
    `
  }
  
  renderPathAncestry () {
    return this.pathAncestry.map(item => {
      const icon = item.mount ? 'fas fa-external-link-square-alt' : item.stat.isDirectory() ? 'far fa-folder' : 'far fa-file'
      return html`
        <span class="fas fa-fw fa-angle-right"></span>
        <a
          class="name"
          href=${joinPath(this.driveInfo.url, item.path)}
          @click=${this.onClickParentFolder}
          @dragenter=${this.onDragenter}
          @dragleave=${this.onDragleave}
          @dragover=${this.onDragOver}
          @drop=${e => this.onDrop(e, item)}
        >
          <span class="fa-fw ${icon}"></span>
          ${item.mount ? item.mount.title : item.name}
        </a>
      `
    })
  }

  // events
  // =

  onClickParentFolder (e) {
    e.preventDefault()
    emit(this, 'goto', {detail: {item: e.currentTarget.getAttribute('href')}})
  }

  onDragenter (e) {
    e.preventDefault()
    e.target.classList.add('drag-hover')
    return false
  }

  onDragleave (e) {
    e.target.classList.remove('drag-hover')
  }

  onDragOver (e) {
    e.preventDefault()
    return false
  }

  onDrop (e, item) {
    Array.from(this.querySelectorAll('.drag-hover'), el => el.classList.remove('drag-hover'))
    var targetPath = item ? item.path : '/'
    handleDragDrop(e.currentTarget, e.clientX, e.clientY, targetPath, e.dataTransfer)
  }

}

customElements.define('path-ancestry', PathAncestry)