import { LitElement, html } from '../vendor/lit-element.js'; 

class Following extends LitElement {
  static get properties () {
    return { siteInfo: Object, users: Array }
  }

  render() {
    return html`
      <link rel="stylesheet" href="/theme/vendor/bulma.min.css">
      <link rel="stylesheet" href="/theme/vendor/font-awesome.min.css">
      <style>
        .row {
          display: flex;
          height: 50px;
        }
        .col {
          display: inline-block;
          width: 50px;
        }
      </style>
      <h3 class="title is-3">Following</h3>
      ${this.userRows.map(userRow => html`
        <div class="row">
          ${userRow.map(user => user ? html`
            <div class="col">
              <div class="dropdown is-hoverable is-right">
                <div class="dropdown-trigger">
                  <a href=${user.url} class="image is-48x48">
                    <img src="${user.thumbUrl}">
                  </a>
                </div>
                <div class="dropdown-menu" id="dropdown-menu4" role="menu">
                  <div class="dropdown-content">
                    <div class="dropdown-item">
                      <p><strong>${user.displayName}</strong></p>
                      <p>${user.bio}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ` : html`<div class="col"></div>`)}
        </div>
      `)}
    `
  }

  get userRows () {
    var userRows = []
    for (let i = 0; i < this.users.length; i += 4) {
      userRows.push([
        this.users[i + 0],
        this.users[i + 1],
        this.users[i + 2],
        this.users[i + 3]
      ])
    }
    return userRows
  }
}

customElements.define('x-following', Following)
