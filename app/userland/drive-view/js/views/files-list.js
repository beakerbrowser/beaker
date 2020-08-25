import { LitElement, html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'

class FilesList extends LitElement {
  static get properties () {
    return {
      info: {type: Object}
    }

  }
  static get styles () {
    return css`
    :host {
      --sans-serif: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
      --monospace: Consolas, 'Lucida Console', Monaco, monospace;

      font-family: var(--sans-serif);
    }

    a {
      text-decoration: none;
      color: var(--text-color--markdown-link);
    }

    a:hover {
      text-decoration: underline;
    }

    .entries {
      border: 1px solid var(--border-color--light);
      border-radius: 4px;
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
      padding: 5px 10px;
      border-bottom: 1px solid var(--border-color--light);
    }

    .entries > div:hover {
      background: var(--bg-color--light);
    }

    .entries > div:last-child {
      border: 0;
    }

    .entries .size {
      color: var(--text-color--light);
    }

    .entries .fa-fw {
      color: var(--text-color--light);
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
    var entries = await this.drive.readdir(location.pathname, {includeStats: true})
    entries.sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
    this.directories = entries.filter(entry => entry.stat.isDirectory())
    this.files = entries.filter(entry => !entry.stat.isDirectory())
    this.requestUpdate()
  }

  render () {
    if (!this.directories || !this.files) return html``
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <main>
        <div class="entries">
          ${location.pathname !== '/' ? html`
            <div>
              <a href=".." title="Go up a directory"><span class="fa-fw fas fa-level-up-alt"></span> ..</a>
            </div>
          ` : ''}
          ${repeat(this.directories, entry => this.renderEntry(entry))}
          ${repeat(this.files, entry => this.renderEntry(entry))}
        </div>
        ${this.info.writable && !this.files.find(f => f.name === 'index.md') ? html`
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
    window.location = `${location.origin}${location.pathname}index.${ext}`
  }
}

customElements.define('beaker-files-list', FilesList)