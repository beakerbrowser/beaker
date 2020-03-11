import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import { toNiceDomain } from '../../../app-stdlib/js/strings.js'
import css from '../../css/com/drive-forks.css.js'

class DriveForks extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      origin: {type: String},
      info: {type: Object},
      forks: {type: Array}
    }
  }

  static get styles () {
    return [css]
  }

  constructor () {
    super()
    this.url = ''
    this.origin = ''
    this.info = undefined
    this.forks = []
  }

  // rendering
  // =

  render () {
    var currentFork = this.forks.find(f => f.url === this.origin)
    if (this.info && this.info.forkOf && this.forks.length <= 1) {
      return html`This drive is a fork of <a href=${this.info.forkOf}>${toNiceDomain(this.info.forkOf)}</a>`
    }
    if (!currentFork) {
      return html``
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.forks.length > 1 ? html`
        <div class="list">
          ${repeat(this.forks, fork => {
            var isCurrent = fork.url === this.origin
            return html`
              <a class="fork ${isCurrent ? 'current' : ''}" href=${fork.url} @click=${this.onClickFork}>
                <div>
                  ${isCurrent ? html`<span class="fas fa-fw fa-caret-right"></span>` : ''}
                  <span class="fork-label">${fork.forkOf ? fork.forkOf.label : 'Original'}</span>
                </div>
                <div>
                  ${fork.forkOf ? html`
                    <button class="transparent" @click=${e => this.onClickDelete(e, fork)}><span class="far fa-trash-alt"></span></button>
                  ` : ''}
                </div>
              </a>
            `
          })}
        </div>
      ` : ''}
      <div>
        <button class="transparent" @click=${this.onClickNewFork}>+ New Fork</button>
        ${currentFork.forkOf ? html`
          <button class="transparent" @click=${e => this.onClickDiff(e, currentFork)}><span class="diff-merge-icon">◨</span> Diff / Merge Original</button>
        ` : html`
          <button class="transparent" disabled><span class="diff-merge-icon">◨</span> Diff / Merge Original</button>
        `}
      </div>
    `
  }

  // events
  // =

  async onClickNewFork (e) {
    e.preventDefault()
    e.stopPropagation()
    var drive = await beaker.hyperdrive.forkDrive(this.origin)
    emit(this, 'change-url', {detail: {url: this.url.replace(this.origin, drive.url)}})
  }

  onClickFork (e) {
    e.preventDefault()
    e.stopPropagation()
    emit(this, 'change-url', {detail: {url: this.url.replace(this.origin, e.currentTarget.getAttribute('href'))}})
  }

  onClickDiff (e, fork) {
    e.preventDefault()
    e.stopPropagation()
    beaker.browser.openUrl(`beaker://diff/?base=${fork.url}&target=${this.forks[0].url}`, {setActive: true})
    beaker.browser.toggleSiteInfo(false)
  }

  async onClickDelete (e, fork) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${fork.forkOf.label}"?`)) {
      return
    }
    await beaker.drives.remove(fork.url)
    this.forks.splice(this.forks.indexOf(fork), 1)
    this.requestUpdate()
  }
}

customElements.define('drive-forks', DriveForks)
