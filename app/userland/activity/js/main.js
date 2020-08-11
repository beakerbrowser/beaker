import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import { toNiceUrl, joinPath } from 'beaker://app-stdlib/js/strings.js'
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
    this.fileContent = undefined
    this.privateMode = false
    this.annotations = []

    var ignoreNextAttachEvent = false
    beaker.panes.addEventListener('pane-attached', e => {
      if (!ignoreNextAttachEvent) {
        this.load(beaker.panes.getAttachedPane().url)
      }
      ignoreNextAttachEvent = false
    })
    beaker.panes.addEventListener('pane-detached', e => {
    })
    beaker.panes.addEventListener('pane-navigated', e => {
      if (e.detail.url.startsWith('beaker://desktop')) {
        // special case- open the original item rather than beaker desktop, if possible
        var url = new URLSearchParams(location.search).get('url')
        if (url) return this.load(url)
      }
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

    ;(async () => {
      var url = new URLSearchParams(location.search).get('url')
      var attachedPane = await beaker.panes.attachToLastActivePane()
      ignoreNextAttachEvent = !!attachedPane
      if (url) {
        this.load(url)
      } else {
        if (attachedPane) this.load(attachedPane.url)
      }
    })()
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

  get fileTitle () {
    return this.fileInfo?.metadata?.title
  }

  get typeLabel () {
    if (!this.fileInfo || this.fileInfo.isDirectory()) {
      if (this.isRoot) return 'site'
      return 'page'
    }
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
    this.fileInfo = undefined
    this.fileContent = undefined
    this.siteInfo = undefined
    this.annotations = []
    this.requestUpdate()

    if (url) {
      await Promise.all([
        this.loadResource(),
        this.loadAnnotations()
      ])
    }
    
    this.isLoading = false
    this.requestUpdate()
  }

  async loadResource () {
    if (this.url.startsWith('hyper://')) {
      this.siteInfo = await beaker.hyperdrive.getInfo(this.url).catch(e => undefined)
      this.fileInfo = await beaker.hyperdrive.stat(this.url).catch(e => undefined)
      if (this.url.endsWith('.md') && !this.fileTitle) {
        this.fileContent = await beaker.hyperdrive.readFile(this.url, 'utf8')
      }
    } else {
      this.siteInfo = {
        url: (new URL(this.url)).origin,
        title: (new URL(this.url)).hostname
      }
    }
  }

  async loadAnnotations () {
    var addressBook = await beaker.hyperdrive.readFile('hyper://private/address-book.json', 'json')
    this.profileUrl = `hyper://${addressBook.profiles[0].key}/`
    this.annotations = await beaker.indexer.list({filter: {linksTo: this.url}, reverse: false})
    console.log(this.annotations)
  }

  setPrivateMode (isPrivate) {
    this.privateMode = isPrivate
    this.requestUpdate()
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
        <span class="title">Discussion: ${this.renderFileTitle()}</span>
      </header>
      ${this.renderLoading()}
      ${this.currentView === 'summary' ? html`
        ${this.fileInfo && this.fileInfo.isFile() ? html`
          <res-summary
            author-url=${this.siteInfo?.url}
            author-title=${this.siteInfo?.title}
            .icon=${this.typeIcon}
            .label=${this.typeLabel}
            .title=${this.fileTitle}
            href=${this.url}
            .date=${this.fileInfo?.ctime}
            .content=${this.fileContent ? beaker.markdown.toHTML(this.fileContent) : undefined}
          ></res-summary>
        ` : ''}
      <nav>
        <a
          class="nav-item ${!this.privateMode ? 'active' : ''}"
          @click=${() => this.setPrivateMode(false)}
        >Public</a>
        <a
          class="nav-item ${this.privateMode ? 'active' : ''}"
          @click=${() => this.setPrivateMode(true)}
        >Private</a>
      </nav>
      <div class="activity-feed">
        ${this.renderAnnotations()}
        <comment-box
          @create-comment=${this.onCreateComment}
          profile-url=${this.privateMode ? 'hyper://private/' : this.profileUrl}
        ></comment-box>
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
    var parts = []
    parts.push(html`<a href=${this.siteInfo.url}>${site}</a>`)
    var acc = ''
    for (let part of this.pathname.split('/').filter(Boolean)) {
      parts.push(' › ')
      acc += part
      parts.push(html`<a href=${joinPath(this.siteInfo.url, acc)}>${part}</a>`)
      acc += '/'
    }
    return parts
  }

  renderAnnotations () {
    const visibleAnnotations = this.annotations.filter(a => {
      const isPrivate = a.site.url.startsWith('hyper://private')
      return (this.privateMode && isPrivate) || (!this.privateMode && !isPrivate)
    })
    if (visibleAnnotations.length === 0) {
      if (this.privateMode) {
        return html`
          <div class="empty"><span class="fas fa-info"></span> Put whatever you want here, it's totally private.</div>
        `
      } else {
        return html`
          <div class="empty"><span class="fas fa-info"></span> Be the first to say something!</div>
        `
      }
    }
    return html`
      ${repeat(visibleAnnotations, a => a.url, a => this.renderAnnotation(a))}
    `
  }

  renderAnnotation (annotation) {
    var authorTitle = annotation.site.url.startsWith('hyper://private') ? 'I (privately)' : annotation.site.title
    var action = ({
      'beaker/index/bookmarks': `bookmarked this ${this.typeLabel}`,
      'beaker/index/blogposts': `mentioned this ${this.typeLabel} in`,
      'beaker/index/microblogposts': `mentioned this ${this.typeLabel} in`,
      'beaker/index/pages': `mentioned this ${this.typeLabel} in`,
      'beaker/index/comments': 'commented'
    })[annotation.index]
    var title = ({
      'beaker/index/bookmarks': annotation.metadata.title,
      'beaker/index/blogposts': annotation.metadata.title || 'a blogpost',
      'beaker/index/microblogposts': 'a microblog post',
      'beaker/index/pages': annotation.metadata.title || 'a web page'
    })[annotation.index]

    return html`
      <action-item
        author-url=${annotation.site.url}
        author-title=${authorTitle}
        .action=${action}
        .title=${title}
        href=${annotation.url}
        .date=${new Date(annotation.ctime)}
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
    var drive = null
    if (this.privateMode) {
      drive = beaker.hyperdrive.drive('hyper://private')
    } else {
      var addressBook = await beaker.hyperdrive.readFile('hyper://private/address-book.json', 'json')
      drive = beaker.hyperdrive.drive(addressBook.profiles[0].key)
    }
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

function normalizeUrl (originURL) {
  try {
    var urlp = new URL(originURL)
    return (urlp.protocol + '//' + urlp.hostname + (urlp.port ? `:${urlp.port}` : '') + urlp.pathname).replace(/([/]$)/g, '')
  } catch (e) {}
  return originURL
}
