import { LitElement, html } from '../../../../app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from '../../../../app-stdlib/js/com/toast.js'
import statusResultCSS from '../../../css/com/search/status-result.css.js'
import '../../../../app-stdlib/js/com/status/status.js'

class SearchStatusResult extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      item: {type: Object},
      highlightNonce: {type: String}
    }
  }

  static get styles () {
    return statusResultCSS
  }

  constructor () {
    super()
    this.user = undefined
    this._item = undefined
    this.highlightNonce = undefined
    this.numComments = 0
    this.reactions = undefined
  }

  get item () {
    return this._item
  }

  set item (v) {
    var isChanged = !this.item || this.item.href !== v.href
    this._item = v
    if (isChanged) this.loadAnnotations()
  }

  async loadAnnotations () {
    console.log('loading')
    var followedUsers = (await uwg.follows.list({author: this.user.url})).map(({topic}) => topic.url)
    var feedAuthors = [this.user.url].concat(followedUsers)
    var [c, r] = await Promise.all([
      uwg.comments.list({topic: this.item.href, author: feedAuthors}),
      uwg.reactions.tabulate(this.item.href, {author: feedAuthors})
    ])
    this.numComments = c.length
    this.reactions = r

    this.requestUpdate()
  }

  get statusObject () {
    return {
      url: this.item.href,
      author: this.item.author,
      body: this.item.record.body,
      numComments: this.numComments,
      reactions: this.reactions,
      createdAt: this.item.record.createdAt
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <beaker-status
        user-url=${this.user.url}
        highlight-nonce=${this.highlightNonce}
        .status=${this.statusObject}
        @add-reaction=${this.onAddReaction}
        @delete-reaction=${this.onDeleteReaction}
        @delete=${this.onDeleteStatus}
      ></beaker-status>
    `
  }

  // events
  // =

  async onAddReaction (e) {
    await uwg.reactions.add(e.detail.topic, e.detail.phrase)
  }

  async onDeleteReaction (e) {
    await uwg.reactions.remove(e.detail.topic, e.detail.phrase)
  }

  async onDeleteStatus (e) {
    let status = e.detail.status

    // delete the status
    try {
      await uwg.statuses.remove(status.url)
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to delete status')
      console.error(e)
      return
    }
    toast.create('Status deleted')

    // remove self from the dom
    this.remove()
  }
}
customElements.define('search-status-result', SearchStatusResult)