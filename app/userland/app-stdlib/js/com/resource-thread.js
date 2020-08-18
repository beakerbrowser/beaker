import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import css from '../../css/com/resource-thread.css.js'
import { emit } from '../dom.js'
import * as toast from './toast.js'

import './resource.js'

export class ResourceThread extends LitElement {
  static get properties () {
    return {
      resourceUrl: {type: String, attribute: 'resource-url'},
      resource: {type: Object},
      parents: {type: Array},
      immediateReplies: {type: Array},
      threadReplies: {type: Array},
      profileUrl: {type: String, attribute: 'profile-url'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.resourceUrl = ''
    this.resource = undefined
    this.parents = undefined
    this.immediateReplies = undefined
    this.threadReplies = undefined
    this.profileUrl = ''
  }

  async load () {
    var resource = await beaker.indexer.get(this.resourceUrl)
    var [parents, [immediateReplies, threadReplies]] = await Promise.all([
      this.loadParents(resource),
      this.loadReplies(resource)
    ])
    this.resource = resource
    this.parents = parents
    this.immediateReplies = immediateReplies
    this.threadReplies = threadReplies
    await this.updateComplete
    emit(this, 'load')
  }

  async loadParents (resource) {
    // ascend parents until we run out
    var node = resource
    var parents = []
    do {
      let linkedResources = await Promise.all(node.links.filter(link => link.startsWith('hyper://')).map(beaker.indexer.get))
      node = linkedResources.find(r => r?.index === 'beaker/index/microblogposts')
      if (node) parents.unshift(node)
    } while (node)
    return parents
  }

  async loadReplies (resource) {
    // get the immediate replies
    var immediateReplies = await beaker.indexer.list({index: 'beaker/index/microblogposts', filter: {linksTo: resource.url}, sort: 'ctime', reverse: false})

    var threadReplies = []
    if (immediateReplies[0]) {
      // take the first reply and descend first replies until we run out
      threadReplies.push(immediateReplies.shift())
      var node = threadReplies[0]
      while (node) {
        let replies = await beaker.indexer.list({index: 'beaker/index/microblogposts', filter: {linksTo: node.url}, sort: 'ctime', reverse: false, limit: 1})
        node = replies[0]
        if (node) threadReplies.push(node)
      }
    }
    return [immediateReplies, threadReplies]
  }

  updated (changedProperties) {
    if (typeof this.resource === 'undefined') {
      this.load()
    } else if (changedProperties.has('resourceUrl') && changedProperties.get('resourceUrl') != this.resourceUrl) {
      this.load()
    }
  }

  scrollHighlightedPostIntoView () {
    try {
      this.shadowRoot.querySelector('.highlighted').scrollIntoView()
    } catch {}
  }

  // rendering
  // =

  render () {
    if (!this.resource) {
      return html``
    }
    return html`
      <div class="main-thread">
        ${repeat(this.parents, r => r.url, parentResource => html`
          <beaker-resource
            .resource=${parentResource}
            render-mode="card"
            profile-url=${this.profileUrl}
            @publish-reply=${this.onPublishReply}
          ></beaker-resource>
        `)}
        <beaker-resource
          class="highlighted"
          .resource=${this.resource}
          render-mode="card"
          noborders
          profile-url=${this.profileUrl}
          @publish-reply=${this.onPublishReply}
        ></beaker-resource>
        ${repeat(this.threadReplies, r => r.url, replyResource => html`
          <beaker-resource
            .resource=${replyResource}
            render-mode="card"
            profile-url=${this.profileUrl}
            @publish-reply=${this.onPublishReply}
          ></beaker-resource>
        `)}
      </div>
      <div class="other-replies">
        ${repeat(this.immediateReplies, r => r.url, replyResource => html`
          <beaker-resource
            .resource=${replyResource}
            render-mode="card"
            profile-url=${this.profileUrl}
            @publish-reply=${this.onPublishReply}
          ></beaker-resource>
          `)}
      </div>
    `
  }

  // events
  // =

  onPublishReply (e) {
    toast.create('Reply published', '', 10e3)
    this.load()
  }
}

customElements.define('beaker-resource-thread', ResourceThread)
