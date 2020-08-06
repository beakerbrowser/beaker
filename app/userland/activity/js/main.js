import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import { toNiceUrl } from 'beaker://app-stdlib/js/strings.js'
import css from '../css/main.css.js'
import './com/res-summary.js'
import './com/action-item.js'
import './com/comment-box.js'

class ActivityApp extends LitElement {
  static get styles () {
    return [css]
  }

  static get properties () {
    return {
      isLoading: {type: Boolean},
      currentView: {type: String}
    }
  }

  constructor () {
    super()
    beaker.panes.setAttachable()
    this.isLoading = true
    this.currentView = 'summary'
    this.url = undefined
    this.profileUrl = undefined
    this.siteInfo = undefined
    this.fileInfo = undefined
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
      if (anchor && anchor.getAttribute('href')) {
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

    var url = new URLSearchParams(location.search).get('url')
    if (url) {
      this.load(url)
    } else {
      ;(async () => {
        var attachedPane = await beaker.panes.attachToLastActivePane()
        if (attachedPane) this.load(attachedPane.url)
      })()
    }
  }

  get pathname () {
    try {
      return (new URL(this.url)).pathname
    } catch (e) {
      return this.url
    }
  }

  get isRoot () {
    return ['', '/', '/index.md', '/index.html', '/index.htm'].includes(this.pathname)
  }

  get typeLabel () {
    if (!this.fileInfo) return undefined
    if (this.fileInfo.isDirectory()) return undefined
    switch (this.fileInfo.metadata.type) {
      case 'beaker/blogpost': return 'blog post'
      case 'beaker/comment': return 'comment'
      case 'beaker/page': return 'webpage'
      case 'beaker/microblogpost': return 'microblog post'
      default: return 'file'
    }
  }

  get typeIcon () {
    if (!this.fileInfo) return undefined
    if (this.fileInfo.isDirectory()) return undefined
    switch (this.fileInfo.metadata.type) {
      case 'beaker/blogpost': return 'fas fa-blog'
      case 'beaker/comment': return 'far fa-comment-alt'
      case 'beaker/page': return 'far fa-file-alt'
      case 'beaker/microblogpost': return 'fas fa-stream'
      default: return 'far fa-file'
    }
  }

  async load (url) {
    this.isLoading = true
    this.url = url
    this.siteInfo = undefined
    this.annotations = []
    this.requestUpdate()

    if (url) {
      await Promise.all([
        this.loadResourceInfo(),
        this.loadAnnotations()
      ])
    }
    
    this.isLoading = false
    this.requestUpdate()
  }

  async loadResourceInfo () {
    if (this.url.startsWith('hyper://')) {
      this.siteInfo = await beaker.hyperdrive.getInfo(this.url).catch(e => undefined)
      this.fileInfo = await beaker.hyperdrive.stat(this.url).catch(e => undefined)
    } else {
      this.siteInfo = {
        url: (new URL(this.url)).origin,
        title: (new URL(this.url)).hostname
      }
    }
  }

  async loadAnnotations () {
    var addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
    this.profileUrl = `hyper://${addressBook.profiles[0].key}/`
    this.annotations = await beaker.indexer.list({filter: {linksTo: this.url}, reverse: false})
    console.log(this.annotations)
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
    var isRoot = this.isRoot
    const navItem = (id, label) => html`
      <a
        class=${this.currentView === id ? 'current' : ''}
        @click=${e => { this.currentView = id }}
      >${label}</a>
    `
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <header>
        <a class="close" @click=${this.onClickClose}><span class="fas fa-times"></span></a>
        <span class="title">Thread: <a href=${this.url} target="_blank">${this.renderFileTitle()}</a></span>
      </header>
      ${this.renderLoading()}
      ${''/*TODO<nav>
        ${navItem('summary', 'Summary')}
        ${navItem('advanced', 'Advanced')}
        <span></span>
      </nav>*/}
      ${this.currentView === 'summary' ? html`
        <div class="activity-feed">
          ${this.fileInfo && this.fileInfo.isFile() ? html`
            <action-item
              author-url=${this.siteInfo?.url}
              author-title=${this.siteInfo?.title}
              icon=${this.typeIcon}
              action="created"
              title=${this.fileInfo?.metadata?.title || `this ${this.typeLabel}`}
              href=${this.url}
              date=${relativeDate(this.fileInfo?.ctime)}
            ></action-item>
          ` : ''}
          ${this.renderAnnotations()}
          <comment-box @create-comment=${this.onCreateComment} profile-url=${this.profileUrl}></comment-box>
      </div>
      ` : ''}
      ${this.currentView === 'advanced' ? html`
        ${isRoot ? html`` : html`
          <file-info url=${this.url} .fileInfo=${this.fileInfo}></file-info>
        `}
      ` : ''}
    `
  }

  renderFileTitle () {
    if (!this.siteInfo) return 'Loading...'
    var site = this.siteInfo?.title || toNiceUrl(this.siteInfo.url)
    switch (this.fileInfo?.metadata?.type) {
      case 'beaker/comment':
        return `Comment by ${site}`
      case 'beaker/page':
        return `Page by ${site}`
      case 'beaker/blogpost':
        return `Blog Post by ${site}`
      case 'beaker/microblogpost':
        return `Microblog post by ${site}`
    }
    return `Page by ${site}`
  }

  renderAnnotations () {
    return html`
      ${repeat(this.annotations, a => a.url, a => this.renderAnnotation(a))}
    `
  }

  renderAnnotation (annotation) {
    var authorTitle = annotation.site.url.startsWith('hyper://system') ? 'I (privately)' : annotation.site.title
    var action = ({
      'beaker/index/bookmarks': 'bookmarked this',
      'beaker/index/blogposts': 'mentioned this in',
      'beaker/index/microblogposts': 'mentioned this in',
      'beaker/index/pages': 'mentioned this in',
      'beaker/index/comments': 'commented'
    })[annotation.index]
    var title = ({
      'beaker/index/bookmarks': annotation.metadata['beaker/title'],
      'beaker/index/blogposts': annotation.metadata['beaker/title'] || 'a blogpost',
      'beaker/index/microblogposts': 'a microblog post',
      'beaker/index/pages': annotation.metadata['beaker/title'] || 'a web page'
    })[annotation.index]

    return html`
      <action-item
        author-url=${annotation.site.url}
        author-title=${authorTitle}
        .action=${action}
        .title=${title}
        href=${annotation.url}
        date=${relativeDate(annotation.ctime)}
        .content=${annotation.content ? beaker.markdown.toHTML(annotation.content) : undefined}
      ></action-item>
    `
  }

  renderLoading () {
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
        type: 'beaker/comment',
        'beaker/subject': normalizeUrl(this.url)
      }
    })
    this.load(this.url)
  }

  onClickClose (e) {
    window.close()
  }
}

customElements.define('activity-app', ActivityApp)

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

const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'})
const today = Date.now()
const MINUTE = 1e3 * 60
const HOUR = 1e3 * 60 * 60
const DAY = HOUR * 24
const MONTH = DAY * 30
function relativeDate (d) {
  var diff = today - d
  if (diff < HOUR) return rtf.format(Math.floor(diff / MINUTE * -1), 'minute')
  if (diff < DAY) return rtf.format(Math.floor(diff / HOUR * -1), 'hour')
  if (diff < MONTH) return rtf.format(Math.floor(diff / DAY * -1), 'day')
  if (diff < MONTH * 3) return rtf.format(Math.floor(diff / (DAY * 7) * -1), 'week')
  if (diff < MONTH * 12) return rtf.format(Math.floor(diff / MONTH * -1), 'month')
  return rtf.format(Math.floor(diff / (MONTH * -12)), 'year')
}