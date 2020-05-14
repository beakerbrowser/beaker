/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import buttonsCSS from './buttons.css'
import * as bg from './bg-process-rpc'
import { joinPath } from '../../lib/strings'

class EditProfilePrompt extends LitElement {
  static get properties () {
    return {
      url: {type: String}
    }
  }

  static get styles () {
    return [buttonsCSS, css`
      .wrapper {
        overflow: hidden;
        padding: 10px 16px;
      }
      button {
        margin-left: 10px;
      }
    `]
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
  }

  async init (params) {
    this.url = params.url
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        This is your profile! You can customize it with the editor.
        <button @click=${this.onClickEdit}>Edit Page</button>
      </div>
    `
  }

  // events
  // =

  async onClickEdit () {
    await bg.prompts.executeSidebarCommand('show-panel', 'editor-app')
    await bg.prompts.executeSidebarCommand('set-context', 'editor-app', this.url)
    await bg.prompts.closeEditProfilePromptForever()
  }
}

customElements.define('edit-profile-prompt', EditProfilePrompt)
