import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { until } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/until.js'
import aboutCSS from '../../css/views/about.css.js'

export class AboutView extends LitElement {
  static get styles () {
    return aboutCSS
  }

  // rendering
  // =

  render () {
    return html`
      <div class="content">${until(this.renderCommands(), 'Loading...')}</div>
    `
  }

  async renderCommands () {
    var manifest
    try {
      var archive = new DatArchive(location)
      manifest = JSON.parse(await archive.readFile('/dat.json', 'utf8'))
    } catch (e) {
      return e.toString()
    }

    var commands
    try {
      commands = manifest['unwalled.garden/command-package'].commands
      if (!commands || !commands.length) throw 'empty'
    } catch (e) {
      return undefined
    }

    return html`
      ${repeat(commands, command => html`
        <div class="command">
          <span>
            <strong>${command.name}</strong>
            <small>${command.help}</small>
          </span>
          <code>${command.usage}</code>
        </div>
      `)}
    `
  }
}

customElements.define('about-view', AboutView)