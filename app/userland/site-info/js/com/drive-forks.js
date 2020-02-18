import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import css from '../../css/com/drive-forks.css.js'

class DriveForks extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      origin: {type: String},
      forkOf: {type: String},
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
    this.forkOf = ''
    this.forks = []
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="list">
        ${repeat(this.forks, fork => {
          var isCurrent = fork.url === this.origin
          return html`
            <a class="fork ${isCurrent ? 'current' : ''}" href=${fork.url} @click=${this.onClickFork}>
              <div>
                ${isCurrent ? html`<span class="fas fa-fw fa-caret-right"></span>` : ''}
                <span>${fork.forkOf ? fork.forkOf.label : 'Master'}</span>
              </div>
                <div>
                ${isCurrent ? html`
                  <small>Currently Viewing</small>
                `: html`
                  ${fork.forkOf ? html`
                    <button @click=${e => this.onClickDelete(e, fork)}><span class="far fa-trash-alt"></span></button>
                  ` : ''}
                  <button @click=${e => this.onClickCompare(e, fork)}>Compare</button>
                `}
              </div>
            </a>
          `
        })}
        <a class="fork" @click=${this.onClickNewFork}>
          <div>+ New Fork</div>
        </a>
      </div>
    `
  }

  // events
  // =

  async onClickNewFork (e) {
    e.preventDefault()
    e.stopPropagation()
    var drive = await Hyperdrive.fork(this.origin)
    emit(this, 'change-url', {detail: {url: this.url.replace(this.origin, drive.url)}})
  }

  onClickFork (e) {
    e.preventDefault()
    e.stopPropagation()
    emit(this, 'change-url', {detail: {url: this.url.replace(this.origin, e.currentTarget.getAttribute('href'))}})
  }

  onClickCompare (e, fork) {
    e.preventDefault()
    e.stopPropagation()
    beaker.browser.openUrl(`beaker://compare/?base=${fork.url}&target=${this.origin}`, {setActive: true})
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
