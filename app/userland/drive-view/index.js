import { LitElement, html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'

class DriveView extends LitElement {
  static get styles () {
    return css`
    :host {
      --sans-serif: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
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
      margin: 20px 0;
      font-size: 14px;
      letter-spacing: 0.75px;
    }

    .entries > div {
      display: flex;
      justify-content: space-between;
      line-height: 30px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .entries > div:hover {
      background: #fafafd;
    }

    .entries .size {
      color: #556;
    }

    .entries .fa-fw {
      color: #556;
    }

    .prompt {
      margin: 30px 0;
      font-size: 14px;
      letter-spacing: 0.5px;
      padding: 20px 10px;
      background: #fff;
      border-top: 1px solid #dde;
      border-radius: 0;
      color: #778;
    }
    `
  }

  constructor () {
    super()
    this.drive = beaker.hyperdrive.drive(location)
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
        <h1>
          <img src="/thumb" @error=${e => {e.currentTarget.style.display = 'none'}}>
          ${this.info.title}
        </h1>
        <p>${this.info.description || ''}</p>
      </header>
      <main>
        <h4>${location.pathname}</h4>
        <div class="entries">
          ${location.pathname !== '/' ? html`
            <div>
              <a href=".." title="Go up a directory"><span class="fa-fw fas fa-level-up-alt"></span> ..</a>
            </div>
          ` : ''}
          ${repeat(this.directories, entry => this.renderEntry(entry))}
          ${repeat(this.files, entry => this.renderEntry(entry))}
        </div>
        ${this.info.writable ? html`
          <div class="prompt">
            Create an <a @click=${e => this.onCreateIndex(e, 'md')} href="#">index.md</a>
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
          <a href="hyper://${entry.stat.mount.key}/" title=${entry.name}>
            <span class="fa-fw fas fa-external-link-square-alt"></span>
            ${entry.name}
          </a>
        </div>
      `
    }
    var icon = `far fa-${entry.stat.isDirectory() ? 'folder' : 'file-alt'}`
    var href = `./${entry.name}${entry.stat.isDirectory() ? '/' : ''}`
    if (entry.name.endsWith('.goto') && entry.stat.metadata.href) {
      icon = 'fas fa-link'
      href = entry.stat.metadata.href
    }
    return html`
      <div>
        <a href=${href} title=${entry.name}>
          <span class="fa-fw ${icon}"></span>
          ${entry.name}
        </a>
        ${entry.stat.size ? html`
          <span class="size">${bytes(entry.stat.size)}</span>
        ` : ''}
      </div>
    `
  }

  async onClickEditProperties (e) {
    e.preventDefault()
    await beaker.shell.drivePropertiesDialog(location.origin)
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
    window.location = `beaker://editor/?url=${location.origin}${location.pathname}index.${ext}`
  }
}

customElements.define('drive-view', DriveView)
document.body.append(new DriveView())