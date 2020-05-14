import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import postCSS from '../../../css/com/posts/post.css.js'
import { timeDifference } from '../../lib/time.js'
import { emit } from '../../lib/dom.js'
import { writeToClipboard } from '../../lib/clipboard.js'
import { toNiceDomain, toNiceDriveType, pluralize } from '../../lib/strings.js'
import MarkdownIt from '../../../vendor/markdown-it.js'
import * as uwg from '../../lib/uwg.js'
import * as isreadDb from '../../lib/isread-db.js'
import * as contextMenu from '../context-menu.js'
import * as toast from '../toast.js'

const md = MarkdownIt({
  html: false, // Enable HTML tags in source
  xhtmlOut: false, // Use '/' to close single tags (<br />)
  breaks: true, // Convert '\n' in paragraphs into <br>
  langPrefix: 'language-', // CSS language prefix for fenced blocks
  linkify: false, // Autoconvert URL-like text to links

  // Enable some language-neutral replacement + quotes beautification
  typographer: true,

  // Double + single quotes replacement pairs, when typographer enabled,
  // and smartquotes on. Set doubles to '«»' for Russian, '„“' for German.
  quotes: '“”‘’',

  // Highlighter function. Should return escaped HTML,
  // or '' if the source string is not changed
  highlight: undefined
})

export class Post extends LitElement {
  static get properties () {
    return {
      post: {type: Object},
      userUrl: {type: String, attribute: 'user-url'}
    }
  }

  static get styles () {
    return postCSS
  }

  constructor () {
    super()
    this.post = null
    this.userUrl = ''
  }

  getDriveTypeIcon (dt) {
    switch (dt) {
      case 'user': return 'fas fa-user'
      case 'module': return 'fas fa-cube'
      case 'frontend': return 'fas fa-drafting-compass'
      case 'webterm.sh/cmd-pkg': return 'fas fa-terminal'
      default: return 'far fa-hdd'
    }
  }

  render () {
    if (!this.post) return

    var isLink = this.post.path.endsWith('.goto')
    var isTextPost = /\.(md|txt)$/.test(this.post.path)
    var isMarkdown = this.post.path.endsWith('.md')
    var isFile = !isLink && !isTextPost

    var postMeta = this.post.stat.metadata
    var viewProfileUrl = '/users/' + this.post.drive.id
    var viewPostUrl = viewProfileUrl + '/posts/' + this.post.url.split('/').pop()
    var href = isLink ? postMeta.href : viewPostUrl
    var author = this.post.drive
    var ctime = this.post.stat.ctime // TODO replace with rtime
    var isFullpage = this.hasAttribute('fullpage')
    var icon = isLink ? 'fas fa-link' : isTextPost ? 'far fa-comment-alt' : 'far fa-file'
    if (isFile) {
      if (/\.(png|jpe?g|gif)$/i.test(this.post.path)) {
        icon = 'far fa-image'
      } else if (/\.(mp4|webm|mov)$/i.test(this.post.path)) {
        icon = 'fas fa-film'
      } else if (/\.(mp3|ogg)$/i.test(this.post.path)) {
        icon = 'far fa-play-circle'
      }
    }

    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <div class="icon"><span class=${icon}></span></div>
      <div class="content">
        <div>
          <a class="title" href=${href} title=${postMeta.title}>${postMeta.title}</a>
          ${isFullpage ? '' : html`
            <a @click=${this.onToggleIsread}><span class="far fa${this.post.isRead ? '-check' : ''}-square"></span></a>
          `}
          ${postMeta['drive-type'] ? html`
            <span class="drive-type">
              <span class=${this.getDriveTypeIcon(postMeta['drive-type'])}></span>
              ${toNiceDriveType(postMeta['drive-type'])}
            </span>
          ` : ''}
          <span class="domain">
            ${isLink ? toNiceDomain(postMeta.href) : ''}
          </span>
          <button class="menu transparent" @click=${this.onClickMenu}><span class="fas fa-fw fa-ellipsis-h"></span></button>
        </div>
        <div>
          <a class="author" href=${viewProfileUrl} title=${author.title}>${author.title}</a>
          | <a href=${viewPostUrl}>${timeDifference(ctime, true, 'ago')}</a>
          | <a class="comments" href=${viewPostUrl} @click=${isFullpage ? this.onClickComments : undefined}> ${this.post.numComments} ${pluralize(this.post.numComments, 'comment')}</a>
        </div>
        ${isFullpage && isTextPost ? html`
          <div class="text-post-content">
            ${isMarkdown ? unsafeHTML(md.render(this.post.content)) : html`<pre>${this.post.content}</pre>`}
          </div>
        ` : ''}
        ${isFullpage && isFile ? html`
          <div class="file-content">
            ${this.renderFile()}
          </div>
        ` : undefined}
      </div>
    `
  }

  renderFile () {
    if (/\.(png|jpe?g|gif)$/i.test(this.post.path)) {
      return html`<img src=${this.post.url}>`
    }
    if (/\.(mp4|webm|mov)$/i.test(this.post.path)) {
      return html`<video controls><source src=${this.post.url}></video>`
    }
    if (/\.(mp3|ogg)$/i.test(this.post.path)) {
      return html`<audio controls><source src=${this.post.url}></audio>`
    }
    return html`<h3><a href=${this.post.url}>.${this.post.url.split('.').pop()} Link</a></h3>`
  }

  // events
  // =

  onClickMenu (e) {
    e.preventDefault()
    e.stopPropagation()

    var items = [
      {icon: 'far fa-fw fa-file-alt', label: 'View post file', click: () => window.open(this.post.url) },
      {
        icon: 'fas fa-fw fa-link',
        label: 'Copy post file URL',
        click: () => {
          writeToClipboard(this.post.url)
          toast.create('Copied to your clipboard')
        }
      }
    ]

    if (this.userUrl === this.post.drive.url) {
      items.push('-')
      items.push({icon: 'fas fa-fw fa-paragraph', label: 'Change post title', click: () => this.onClickChangeTitle() })
      items.push({icon: 'fas fa-fw fa-trash', label: 'Delete post', click: () => this.onClickDelete() })
    }

    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.left + 8,
      y: rect.bottom + 4,
      center: true,
      withTriangle: true,
      roomy: true,
      noBorders: true,
      style: `padding: 4px 0`,
      items
    })
  }

  async onToggleIsread () {
    this.post.isRead = !this.post.isRead
    if (this.post.isRead) {
      await isreadDb.put(`${this.post.drive.id}:${this.post.path.split('/').pop()}`)
      this.classList.add('read')
      this.classList.remove('unread')
    } else {
      await isreadDb.remove(`${this.post.drive.id}:${this.post.path.split('/').pop()}`)
      this.classList.remove('read')
      this.classList.add('unread')
    }
    this.requestUpdate()
  }

  async onClickChangeTitle () {
    var newTitle = prompt('New post title', this.post.stat.metadata.title)
    if (!newTitle) return
    newTitle = newTitle.trim()
    if (!newTitle) return
    await uwg.posts.changeTitle(this.post, newTitle)
    this.post.stat.metadata.title = newTitle
    this.requestUpdate()
  }

  async onClickDelete () {
    if (!confirm('Are you sure?')) return
    try {
      await uwg.posts.remove(this.post)
    } catch (e) {
      console.error(e)
      toast.create(e.toString(), 'error')
      return
    }
    toast.create('Post deleted')
    emit(this, 'deleted', {bubbles: true, composed: true, detail: {post: this.post}})
  }

  onClickComments (e) {
    e.preventDefault()
    this.parentNode.querySelector('beaker-comments-thread').scrollIntoView()
  }
}

customElements.define('beaker-post', Post)