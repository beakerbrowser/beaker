import { LitElement, html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'

class DriveView extends LitElement {
  static get styles () {
    return css`
    :host {
      --sans-serif: -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
      --monospace: Consolas, 'Lucida Console', Monaco, monospace;

      display: block;
      max-width: 800px;
      margin: 0 auto;
      padding: 0 30px;
      min-height: calc(100vh - 20px);
      font-family: var(--sans-serif);
    }

    a {
      text-decoration: none;
      color: #2864dc;
    }

    a:hover {
      text-decoration: underline;
    }

    hr {
      border: 0;
      border-top: 1px solid #dde;
    }

    header {
      padding: 20px 0 20px;
    }

    header h1,
    header p {
      margin: 0 0 10px;
      line-height: 1;
    }

    header h1 {
      letter-spacing: 0.75px;
    }

    header p {
      font-size: 16px;
      letter-spacing: 0.25px;
      color: #556;
    }

    header img {
      object-fit: cover;
      border-radius: 4px;
      height: 25px;
      width: 26px;
      position: relative;
      top: 1px;
    }

    header .ctrls {
      float: right;
      font-size: 14px;
    }

    header .type {
      color: green;
    }

    main h4 {
      font-family: var(--monospace);
      margin: 0;
      font-size: 13px;
      letter-spacing: 0.75px;
      background: #f3f3f8;
      border-radius: 4px;
      padding: 4px 8px;
    }

    .entries {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      grid-gap: 20px;
      margin: 20px 0;
      font-size: 14px;
      letter-spacing: 0.75px;
    }

    .entries > div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .entries .fa-fw {
      color: #556;
    }

    .prompt {
      margin: 30px 0;
      font-size: 13px;
      border: 1px solid #dde;
      padding: 10px;
      border-radius: 4px;
    }
    `
  }

  constructor () {
    super()
    this.drive = new Hyperdrive(location)
    this.info = undefined
    this.entries = []
    this.load()
  }

  async load () {
    this.info = await this.drive.getInfo()
    var entries = await this.drive.readdir(location.pathname, {includeStats: true})
    entries.sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
    this.directories = entries.filter(entry => entry.stat.isDirectory())
    this.files = entries.filter(entry => !entry.stat.isDirectory())
    this.requestUpdate()
  }

  render () {
    if (!this.info) return html``
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <header>
        <div class="ctrls">
          <span class="fas fa-fw fa-folder"></span>
          <a href="http://hyperdrive.network/${location.hostname}${location.pathname}" target="_blank">Open in files explorer</a>
          &nbsp;
          <span class="fas fa-fw fa-list-alt"></span>
          <a href="#" @click=${this.onClickEditProperties}>Properties</a>
        </div>
        <h1>
          <img src="/thumb" @error=${e => {e.currentTarget.style.display = 'none'}}>
          ${this.info.title}
        </h1>
        <p><span class="type">${this.info.type || 'files drive'}</span> ${this.info.description || ''}</p>
      </header>
      <main>
        <h4>${location.pathname}</h4>
        <div class="entries">
          ${location.pathname !== '/' ? html`
            <div>
              <span class="fa-fw far fa-folder"></span>
              <a href=".." title="Go up a directory">..</a>
            </div>
          ` : ''}
          ${repeat(this.directories, entry => this.renderEntry(entry))}
          ${repeat(this.files, entry => this.renderEntry(entry))}
        </div>
        ${this.info.writable ? html`
          <div class="prompt">
            <strong>Advanced:</strong> Create an <a @click=${e => this.onCreateIndex(e, 'md')} href="#">index.md</a>
            or <a @click=${e => this.onCreateIndex(e, 'html')} href="#">index.html</a> in this directory.
          </div>
        ` : ''}
      </main>
    `
  }

  renderEntry (entry) {
    if (entry.stat.mount && entry.stat.mount.key) {
      return html`
        <div>
          <span class="fa-fw fas fa-external-link-square-alt"></span>
          <a href="hd://${entry.stat.mount.key}" title=${entry.name}>
            ${entry.name}
          </a>
        </div>
      `
    }
    return html`
      <div>
        <span class="fa-fw far fa-${entry.stat.isDirectory() ? 'folder' : 'file-alt'}"></span>
        <a href="./${entry.name}${entry.stat.isDirectory() ? '/' : ''}" title=${entry.name}>
          ${entry.name}
        </a>
      </div>
    `
  }

  async onClickEditProperties (e) {
    e.preventDefault()
    await navigator.drivePropertiesDialog(location.origin)
    this.load()
  }

  async onCreateIndex (e, ext) {
    e.preventDefault()
    var title = location.pathname === '/' ? this.info.title : location.pathname.split('/').filter(Boolean).pop()
    if (ext === 'md') {
      await this.drive.writeFile(location.pathname + 'index.md', `# ${title}`)
    } else {
      await this.drive.writeFile(location.pathname + 'index.html', `<!doctype html>
<html>
  <head>
    <title>${title}</title>
  </head>
  <body>
  </body>
</html>`)
    }
    // TEMPORARY API please do not depend on this in your applications
    window.__beakerOpenEditor()
    location.reload()
  }
}

customElements.define('drive-view', DriveView)
document.body.append(new DriveView())