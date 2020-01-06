import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import postCSS from '../../../css/com/posts/post.css.js'
import { timeDifference } from '../../lib/time.js'
import { emit } from '../../lib/dom.js'
import { writeToClipboard } from '../../lib/clipboard.js'
import { toNiceDomain, toNiceTopic, pluralize } from '../../lib/strings.js'
import MarkdownIt from '../../../vendor/markdown-it.js'
import * as uwg from '../../lib/uwg.js'
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
      userUrl: {type: String, attribute: 'user-url'},
      expanded: {type: Boolean}
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

  getUserVote () {
    var votes = this.post && this.post.votes
    if (!votes) return 0
    if (votes.upvotes.find(u => u.url === this.userUrl)) return 1
    if (votes.downvotes.find(u => u.url === this.userUrl)) return -1
    return 0
  }

  getKarma () {
    var votes = this.post && this.post.votes
    if (!votes) return undefined
    return votes.upvotes.length - votes.downvotes.length
  }

  // getUpvotesTooltip () {
  //   if (this.post.votes && this.post.votes.upvotes.length) {
  //     let upvotesTooltip = 'Upvoted by:\n' + this.post.votes.upvotes.slice(0, 4).map(drive => drive.title).join('\n')
  //     if (this.post.votes.upvotes.length > 4) {
  //       upvotesTooltip += `\nand ${this.post.votes.upvotes.length - 4} more`
  //     }
  //     return upvotesTooltip
  //   }
  //   return ''
  // }

  // getDownvotesTooltip () {
  //   if (this.post.votes && this.post.votes.downvotes.length) {
  //     let downvotesTooltip = 'Downvoted by:\n' + this.post.votes.downvotes.slice(0, 4).map(drive => drive.title).join('\n')
  //     if (this.post.votes.downvotes.length > 4) {
  //       downvotesTooltip += `\nand ${this.post.votes.downvotes.length - 4} more`
  //     }
  //     return downvotesTooltip
  //   }
  //   return ''
  // }

  render () {
    if (!this.post) return

    var isLink = this.post.path.endsWith('.goto')
    var isTextPost = /\.(md|txt)$/.test(this.post.path)
    var isMarkdown = this.post.path.endsWith('.md')
    var isFile = !isLink && !isTextPost

    var postMeta = this.post.stat.metadata
    var viewProfileUrl = '/' + this.post.drive.url.slice('dat://'.length) // TODO
    var viewPostUrl = viewProfileUrl + '/posts/' + this.post.url.split('/').slice(-2).join('/')
    var href = isLink ? postMeta.href : viewPostUrl
    var userVote = this.getUserVote()
    var karma = this.getKarma()
    var author = this.post.drive
    var ctime = this.post.stat.ctime // TODO replace with rtime
    var isExpanded = this.hasAttribute('expanded')

    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <div class="votectrl">
        <a class="upvote ${userVote === 1 ? 'selected' : ''}" @click=${this.onClickUpvote}>
          <span class="fas fa-caret-up"></span>
        </a>
        <div class="karma ${userVote === 1 ? 'upvoted' : userVote === -1 ? 'downvoted' : ''}">${karma}</div>
        <a class="downvote ${userVote === -1 ? 'selected' : ''}" @click=${this.onClickDownvote}>
          <span class="fas fa-caret-down"></span>
        </a>
      </div>
      <div class="content">
        <div>
          <a class="title" href=${href} title=${postMeta.title}>${postMeta.title}</a>
          <span class="domain">
            ${isLink ? html`<span class="fas fa-link"></span> ${toNiceDomain(postMeta.href)}` : ''}
            ${isTextPost ? html`<span class="far fa-comment-alt"></span> text post` : ''}
            ${isFile ? html`<span class="far fa-file"></span> file` : ''}
          </span>
        </div>
        <div>
          <a class="topic" title=${toNiceTopic(this.post.topic)} href="/?topic=${encodeURIComponent(this.post.topic)}">${toNiceTopic(this.post.topic)}</a>
          | by <a class="author" href=${viewProfileUrl} title=${author.title}>${author.title}</a>
          | posted <a href=${viewPostUrl}>${timeDifference(ctime, true, 'ago')}</a>
          | <a class="comments" href=${viewPostUrl}>
            ${this.post.numComments} ${pluralize(this.post.numComments, 'comment')}
          </a>
        </div>
        ${isExpanded && isTextPost ? html`
          <div class="text-post-content">
            ${isMarkdown ? unsafeHTML(md.render(this.post.content)) : this.post.content}
          </div>
        ` : ''}
        ${isExpanded && isFile ? html`
          <div class="file-content">
            <h3><span class="far fa-fw fa-file"></span> <a href=${this.post.url}>${this.post.url.split('/').pop()}</a></h3>
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
  }

  // events
  // =

  async onClickUpvote (e) {
    e.preventDefault()
    e.stopPropagation()
    
    var userVote = this.getUserVote()
    await uwg.votes.put(this.post.url, userVote === 1 ? 0 : 1)
    this.post.votes = await uwg.votes.tabulate(this.post.url)
    this.requestUpdate()
  }

  async onClickDownvote (e) {
    e.preventDefault()
    e.stopPropagation()
    
    var userVote = this.getUserVote()
    await uwg.votes.put(this.post.url, userVote === -1 ? 0 : -1)
    this.post.votes = await uwg.votes.tabulate(this.post.url)
    this.requestUpdate()
  }

  onClickMenu (e) {
    e.preventDefault()
    e.stopPropagation()

    var items = [
      {icon: 'far fa-fw fa-file-alt', label: 'View post file', click: () => window.open(this.post.url) },
      {
        icon: 'fas fa-fw fa-link',
        label: 'Copy post URL',
        click: () => {
          writeToClipboard(this.post.url)
          toast.create('Copied to your clipboard')
        }
      }
    ]

    if (this.userUrl === this.post.drive.url) {
      items.push('-')
      items.push({icon: 'fas fa-fw fa-trash', label: 'Delete post', click: () => this.onClickDelete() })
    }

    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.right + 4,
      y: rect.bottom + 8,
      right: true,
      withTriangle: true,
      roomy: true,
      noBorders: true,
      style: `padding: 4px 0`,
      items
    })
  }

  async onClickDelete () {
    if (!confirm('Are you sure?')) return
    try {
      await uwg.posts.remove(this.post.path)
    } catch (e) {
      console.error(e)
      toast.create(e.toString(), 'error')
      return
    }
    toast.create('Post deleted')
    emit(this, 'deleted', {bubbles: true, composed: true, detail: {post: this.post}})
  }
}

customElements.define('beaker-post', Post)