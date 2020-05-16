import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import * as loc from '../../lib/location.js'
import '../file/file-display.js'

export class ViewfileInfo extends LitElement {
  static get properties () {
    return {
      currentDriveInfo: {type: Object},
      pathInfo: {type: Object},
      viewfileObj: {type: Object}
    }
  }

  constructor () {
    super()
    this.currentDriveInfo = undefined
    this.pathInfo = undefined
    this.viewfileObj = undefined
  }

  createRenderRoot () {
    return this // no shadow dom
  }

  get mergeMode () {
    return this.viewfileObj['unwalled.garden/explorer-view'] && this.viewfileObj['unwalled.garden/explorer-view'].merge
  }

  // rendering
  // =

  render () {
    if (!this.viewfileObj) return ''
    return html`
      <link rel="stylesheet" href="/css/font-awesome.css">
      <section>
        <h3><a href=${loc.getUrl()}>${loc.getPath().split('/').pop()}</a></h3>
        <p class="facts">
          ${this.renderDrive()}
        </p>
      </section>
      <section>
        <h4><span class="fas fa-fw fa-layer-group"></span> View query:</h4>
        ${this.mergeMode ? html`
          <div class="label" style="margin-top: 5px">
            <span class="fas fa-fw fa-compress-arrows-alt"></span> Merging folders by ${this.mergeMode}
          </div>
        ` : ''}
        <pre style="margin-top: 5px">${JSON.stringify(this.viewfileObj.query, null, 2)}</pre>
      </section>
    `
  }

  renderDrive () {
    var drive = this.currentDriveInfo
    return html`<span><small>Drive:</small> <a href=${drive.url} title=${drive.title}>${drive.title}</a>`
  }

  // events
  // =

}

customElements.define('viewfile-info', ViewfileInfo)