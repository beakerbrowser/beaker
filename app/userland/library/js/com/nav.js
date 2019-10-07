import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import libTools from '@beaker/library-tools'
import navCSS from '../../css/com/nav.css.js'

class LibraryNav extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      currentView: {type: String},
      currentQuery: {type: String}
    }
  }

  static get styles () {
    return navCSS
  }

  constructor () {
    super()
    this.currentQuery = ''
  }

  clearSearch () {
    this.currentQuery = ''
    this.shadowRoot.querySelector('input').value = ''
  }

  // rendering
  // =

  render () {
    const item = (id, icon, label, todo = false) => {
      const cls = classMap({
        item: true,
        current: id === this.currentView,
        todo
      })
      return html`
        <a class=${cls} @click=${e => this.onClick(e, id)}}>
          <span class="fa-fw ${icon || 'no-icon'}"></span>
          <span class="label">${label}</span>
        </a>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="search-container">
        <input @keyup=${this.onKeyupQuery} placeholder="Search" class="search" value=${this.currentQuery} />
        <i class="fa fa-search"></i>
      </div>
      ${item('launcher', 'fas fa-th', 'Launcher')}
      ${item('news-feed', 'far fa-newspaper', 'News Feed')}
      <br>
      <h5>Library</h5>
      ${item('bookmarks', 'far fa-star', 'Bookmarks')}
      ${item('drives', 'far fa-hdd', 'Drives')}
      <a class="item" href=${this.fs ? this.fs.url : ''}>
        <span class="fa-fw far fa-folder"></span>
        <span class="label">Filesystem</span>
      </a>
      <br>
      <h5>Network</h5>
      ${item('people', libTools.getFAIcon('people'), 'People')}
      <a class="item" href=${this.user ? this.user.url : ''}>
        <img class="avatar" src="asset:thumb:${this.user ? this.user.url : ''}?cache_buster=${Date.now()}">
        <span class="label">${this.user ? this.user.title : ''}</span>
      </a>
      <br>
      <h5>System</h5>
      ${item('applications', 'far fa-window-restore', 'Applications', true)}
      ${item('commands', 'fas fa-terminal', 'Commands')}
      ${item('cloud-peers', 'fas fa-cloud', 'Cloud Peers', true)}
      ${item('settings', 'fas fa-cog', 'Settings', true)}
      ${item('trash', 'fas fa-trash', 'Trash')}
    `
  }

  // events
  // =

  onClick (e, view) {
    e.preventDefault()
    emit(this, 'change-view', {bubbles: true, detail: {view}})
  }

  async onClickNew () {
    var archive = await DatArchive.create()
    toast.create('Website created')
    beaker.browser.openUrl(archive.url, {setActive: true})
  }

  onKeyupQuery (e) {
    this.currentQuery = e.currentTarget.value
    emit(this, 'change-query', {bubbles: true, detail: {value: this.currentQuery}})
  }
}
customElements.define('library-nav', LibraryNav)

/*

      <h5>Start</h5>
      ${item('pins', 'fas fa-rocket', 'Launcher')}
      ${item('bookmarks', 'far fa-star', 'Bookmarks')}
      <br>
      <h5>News</h5>
      ${item('news-feed', 'far fa-comment-alt', 'Social feed')}
      ${item('blog-posts', 'far fa-newspaper', 'Blog posts', true)}
      ${item('events', 'far fa-calendar-alt', 'Events', true)}
      <br>
      <h5>Web</h5>
      ${item('applications', 'far fa-window-maximize', 'Applications', true)}
      ${item('websites', libTools.getFAIcon('websites'), 'Websites')}
      <br>
      <h5>Media</h5>
      ${item('music', 'fas fa-music', 'Music', true)}
      ${item('photos', 'fas fa-image', 'Photos', true)}
      ${item('podcasts', 'fas fa-microphone-alt', 'Podcasts', true)}
      ${item('videos', 'fas fa-film', 'Videos', true)}
      <br>
      <h5>Data</h5>
      ${item('modules', libTools.getFAIcon('modules'), 'Code Modules', true)}
      ${item('archives', libTools.getFAIcon('archives'), 'File Archives')}
      ${item('datasets', 'fas fa-table', 'Datasets', true)}
      <br>
      <h5>Network</h5>
      ${item('people', libTools.getFAIcon('people'), 'People')}
      ${item('groups', 'fas fa-user-friends', 'Groups', true)}
      ${item('organizations', 'far fa-building', 'Organizations', true)}
      <br>
      <h5>System</h5>
      <a class="item" href=${this.user ? this.user.url : ''} target="_blank">
        <img class="avatar" src="asset:thumb:${this.user ? this.user.url : ''}?cache_buster=${Date.now()}">
        <span class="label">${this.user ? this.user.title : ''}</span>
        <span class="fas fa-fw fa-external-link-alt"></span>
      </a>
      ${item('cloud-peers', 'fas fa-cloud', 'Cloud Peers', true)}
      ${item('settings', 'fas fa-cog', 'Settings', true)}
      ${item('trash', 'fas fa-trash', 'Trash')}
      */