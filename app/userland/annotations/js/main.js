import { LitElement, html, TemplateResult } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import css from '../css/main.css.js'
import './com/create-box.js'

class AnnotationsApp extends LitElement {
  static get styles () {
    return [css]
  }

  static get properties () {
    return {
      isLoading: {type: Boolean}
    }
  }

  constructor () {
    super()
    beaker.panes.setAttachable()
    this.isLoading = true
    this.url = undefined
    this.annotations = []

    beaker.panes.addEventListener('pane-attached', e => {
      this.load(beaker.panes.getAttachedPane().url)
    })
    beaker.panes.addEventListener('pane-detached', e => {
    })
    beaker.panes.addEventListener('pane-navigated', e => {
      this.load(e.detail.url)
    })
    
    this.addEventListener('click', e => {
      let anchor = findParent(e.path[0], el => el.tagName === 'A')
      if (anchor) {
        e.stopPropagation()
        e.preventDefault()
        if (e.metaKey || anchor.getAttribute('target') === '_blank') {
          window.open(anchor.getAttribute('href'))
        } else {
          let pane = beaker.panes.getAttachedPane()
          if (pane) {
            beaker.panes.navigate(pane.id, anchor.getAttribute('href'))
          } else {
            window.location = anchor.getAttribute('href')
          }
        }
        return
      }
    })

    ;(async () => {
      var attachedPane = await beaker.panes.attachToLastActivePane()
      if (attachedPane) this.load(attachedPane.url)
    })()
  }

  async load (url) {
    this.isLoading = true
    this.url = url
    this.annotations = []
    this.requestUpdate()

    if (url) {
      await this.loadAnnotations()
    }
    
    this.isLoading = false
    this.requestUpdate()
  }

  async loadAnnotations () {
    var addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
    var sources = addressBook.profiles.map(item => item.key).concat(addressBook.contacts.map(item => item.key))
    var files = await beaker.hyperdrive.query({
      path: '/comments/*.md',
      metadata: {href: normalizeUrl(this.url)},
      drive: sources,
      sort: 'ctime',
      reverse: true
    })

    var annotations = []
    for (let file of files) {
      let content = await beaker.hyperdrive.readFile(file.url).catch(e => undefined)
      if (!content) continue
      annotations.push({
        class: 'beaker/comment',
        content,
        url: file.url,
        ctime: file.stat.ctime,
        author: {
          title: await getDriveTitle(file.drive),
          url: file.drive
        }
      })
    }
    this.annotations = annotations
  }

  // rendering
  // =

  render () {
    if (!this.url) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        ${this.renderLoading()}
        todo: detached mode
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <create-box @create-comment=${this.onCreateComment}></create-box>
      ${this.renderLoading()}
      ${this.renderAnnotations()}
    `
  }

  renderAnnotations () {
    return html`
      <div class="annotations">
        ${repeat(this.annotations, a => a.url, annotation => html`
          <div class="annotation">
            <div class="header">
              <a class="thumb" href=${annotation.author.url} title=${annotation.author.title}><img src="${annotation.author.url}thumb"></a>
              <a class="author" href=${annotation.author.url} title=${annotation.author.title}>${annotation.author.title}</a>
              <a class="date" href=${annotation.url} title=${annotation.ctime.toLocaleString()}>
                ${annotation.ctime.toLocaleString('default', {dateStyle: 'medium', timeStyle: 'short'})}
              </a>
            </div>
            <div class="content">
              ${unsafeHTML(beaker.markdown.toHTML(annotation.content))}
            </div>
          </div>
        `)}
      </div>
    `
  }

  renderLoading () {
    if (this.isLoading) {
      return html`
        <div class="loading">
          <span class="spinner"></span>
        </div>
      `
    }
    return ''
  }

  // events
  // =

  async onCreateComment (e) {
    this.isLoading = true
    var addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
    var drive = beaker.hyperdrive.drive(addressBook.profiles[0].key)
    await drive.mkdir('/comments').catch(e => undefined)
    await drive.writeFile(`/comments/${Date.now()}.md`, e.detail.text, {
      metadata: {
        href: normalizeUrl(this.url)
      }
    })
    this.load(this.url)
  }
}

customElements.define('annotations-app', AnnotationsApp)

// helpers
// =

let _driveTitleCache = {}
async function getDriveTitle (url) {
  if (_driveTitleCache[url]) return _driveTitleCache[url]
  _driveTitleCache[url] = beaker.hyperdrive.getInfo(url).then(info => info.title)
  return _driveTitleCache[url]
}

function normalizeUrl (originURL) {
  try {
    var urlp = new URL(originURL)
    return (urlp.protocol + '//' + urlp.hostname + (urlp.port ? `:${urlp.port}` : '') + urlp.pathname).replace(/([/]$)/g, '')
  } catch (e) {}
  return originURL
}