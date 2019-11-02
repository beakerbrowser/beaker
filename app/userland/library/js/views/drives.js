import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from '../../../app-stdlib/js/clipboard.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'
import drivesViewCSS from '../../css/views/drives.css.js'
import { bookmarks, friends, library, profiles } from '../../../app-stdlib/js/uwg.js'
import { toNiceUrl } from '../../../app-stdlib/js/strings.js'
import { EditBookmarkPopup } from '../com/edit-bookmark-popup.js'
import { oneof } from '../lib/validation.js'
import _groupBy from 'lodash.groupby'
import '../../../app-stdlib/js/com/hover-menu.js'

export class DrivesView extends LitElement {
  static get properties () {
    return {
      currentViz: {type: String}
    }
  }

  static get styles () {
    return drivesViewCSS
  }

  constructor () {
    super()
    this.currentViz = oneof(getSavedConfig('viz', 'grid'), 'grid', ['grid', 'list'])
    this.bookmarks = []
    this.drives = {}
  }

  get libraryMenu () {
    const toggle = (prefix, id, current, label) => ({
      id: `${prefix}:${id}`,
      label: html`<span class="far fa-fw ${id === current ? 'fa-check-circle' : 'fa-circle'}"></span> ${label}`
    })
    return [
      {heading: 'View'},
      toggle('viz', 'grid', this.currentViz, 'Grid'),
      toggle('viz', 'list', this.currentViz, 'List'),
    ]
  }

  async load () {
    this.bookmarks = await bookmarks.list({
      author: this.currentSubview === 'library' ? 'me' : undefined,
      sort: 'name',
      reverse: false
    })
    this.drives = {
      'You': await navigator.filesystem.query({type: 'mount', path: '/public'}),
      'Friends': await navigator.filesystem.query({type: 'mount', path: '/public/friends/*'}),
      'Library': await navigator.filesystem.query({type: 'mount', path: '/library/*'}),
      'Users': await navigator.filesystem.query({type: 'mount', path: '/users/*'})
    }
    for (let path in this.drives) {
      for (let item of this.drives[path]) {
        if (item.mount && item.mount.author) {
          item.author = await profiles.get(item.mount.author)
        }
      }
      this.drives[path].sort((a, b) => (a.mount.title || 'Untitled').localeCompare(b.mount.title || 'Untitled'))
    }

    console.log('loaded', {bookmarks: this.bookmarks, drives: this.drives})
    this.requestUpdate()
  }

  showMenu (type, item, x, y, isContextMenu) {
    var url = (type === 'bookmark') ? item.content.href : item.mount.url
    
    var items = [
      {icon: 'fas fa-fw fa-external-link-alt', label: 'Open in new tab', click: () => beaker.browser.openUrl(url, {setActive: true}) },
      {
        icon: 'fas fa-fw fa-link',
        label: 'Copy URL',
        click: () => {
          writeToClipboard(url)
          toast.create('Copied to your clipboard')
        }
      }
    ]

    items.push('-')
    if (type === 'bookmark') {
      items.push({
        icon: 'fas fa-fw fa-pencil-alt',
        label: 'Edit bookmark',
        click: async () => {
          var values = await EditBookmarkPopup.create(item.content)
          await bookmarks.update(item.path, values)
          this.load()
        }
      })
      items.push({
        icon: 'fas fa-fw fa-trash',
        label: 'Delete bookmark',
        click: async () => {
          if (confirm('Are you sure?')) {
            await bookmarks.remove(item.path)
            toast.create('Bookmark deleted')
            this.load()
          }
        }
      })
    } else if (type === 'drive') {
      items.push({
        icon: 'far fa-fw fa-clone',
        label: 'Clone this drive',
        click: async () => {
          var drive = await DatArchive.fork(url)
          toast.create('Drive created')
          beaker.browser.openUrl(drive.url, {setActive: true})
          this.load()
        }
      })
      if (/^\/(library|public\/friends)\//.test(item.path)) {
        var label = item.path.startsWith('/library/') ? 'Library' : 'Friends'
        items.push({
          icon: 'far fa-fw fa-trash-alt',
          label: `Remove from ${label}`,
          click: async () => {
            await navigator.filesystem.unmount(item.path)
            const undo = async () => {
              await navigator.filesystem.mount(item.path, item.mount.url)
              this.load()
            }
            toast.create(`Removed from ${label}`, '', 10e3, {label: 'Undo', click: undo})
            this.load()
          }
        })
      } else if (item.path.startsWith('/users/')) {
        items.push({
          icon: 'far fa-fw fa-trash-alt',
          label: `Delete User`,
          click: async () => {
            let user = await beaker.users.get(item.mount.url)
            await beaker.users.remove(user.url)
            const undo = async () => {
              await beaker.users.add(user.label, user.url)
              this.load()
            }
            toast.create(`Deleted User`, '', 10e3, {label: 'Undo', click: undo})
            this.load()
          }
        })
      }
      items.push('-')
      items.push({
        icon: 'far fa-fw fa-list-alt',
        label: 'Drive properties',
        click: async () => {
          await navigator.drivePropertiesDialog(url)
          this.load()
        }
      })
    }

    var right = !isContextMenu
    if (x > document.body.scrollWidth - 300) {
      right = true
    }

    contextMenu.create({
      x,
      y,
      right,
      withTriangle: !isContextMenu,
      roomy: !isContextMenu,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items
    })
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="header">
        <hover-menu
          .options=${this.libraryMenu}
          icon="fas fa-university"
          current="Library"
          @change=${this.onSelectView}
        ></hover-menu>
      </div>

      <main>
        <h4>Bookmarks</h4>
        <div class="listing ${this.currentViz}">
          ${repeat(this.bookmarks, item => this.renderBookmark(item))}
          ${this.renderAdder('Bookmarks')}
        </div>
        ${this.renderDriveGroup('Library')}
        <div class=${this.currentViz === 'grid' ? 'twocol-grouping' : ''}>
          ${this.renderDriveGroup('You')}
          ${this.renderDriveGroup('Friends')}
        </div>
        ${this.renderDriveGroup('Users')}
      </main>
    `
  }

  renderDriveGroup (group) {
    return html`
      <div>
        <h4>${group}</h4>
        <div class="listing ${this.currentViz}">
          ${repeat(this.drives[group] || [], item => this.renderDrive(item))}
          ${group !== 'You' ? this.renderAdder(group) : ''}
        </div>
      </div>
    `
  }

  renderAdder (group) {
    return html`<a class="item adder" @click=${e => this.onClickAdd(e, group)}><span class="fas fa-fw fa-plus"></span></a>`
  }

  renderBookmark (item) {
    const isPublic = !item.path.startsWith('/data')
    if (this.currentViz === 'grid') {
      return html`
        <a class="item" href=${item.content.href} @contextmenu=${e => this.onContextMenu(e, 'bookmark', item)}>
          <img src="asset:thumb:${item.content.href}?cache_buster=${Date.now()}">
          <div class="details">
            <div class="title">${item.content.title || html`<em>Untitled</em>`}</div>
          </div>
        </a>
      `
    } else {
      return html`
        <a class="item" href=${item.content.href} @contextmenu=${e => this.onContextMenu(e, 'bookmark', item)}>
          <span class="favicon"><img src="asset:favicon:${item.content.href}"></span>
          <span class="title">${item.content.title}</span>
          <span class="href">${item.content.href}</span>
          <span class="description">${item.content.description}</span>
          <span class="flex1"></span>
          <span class="visibility ${isPublic ? 'public' : 'private'}">
            <span class="fas fa-fw fa-${isPublic ? 'globe-americas' : 'lock'}"></span>
            ${isPublic ? 'Public' : 'Private'}
          </span>
          <button class="transparent" @click=${e => this.onClickMenu(e, 'bookmark', item)}>
            <span class="fas fa-fw fa-ellipsis-h"></span>
          </button>
        </a>
      `
    }
  }

  renderDrive (item) {
    if (this.currentViz === 'grid') {
      return html`
        <a class="item" href=${item.mount.url} @contextmenu=${e => this.onContextMenu(e, 'drive', item)}>
          <img src="asset:thumb:${item.mount.url}?cache_buster=${Date.now()}">
          <div class="details">
            <div class="title">${item.mount.title || html`<em>Untitled</em>`}</div>
          </div>
        </a>
      `
    } else {
      return html`
        <a class="item" href=${item.mount.url} @contextmenu=${e => this.onContextMenu(e, 'drive', item)}>
          <img src="asset:favicon:${item.mount.url}?cache_buster=${Date.now()}">
          <div class="title">${item.mount.title || html`<em>Untitled</em>`}</div>
          ${item.mount.author ? html`<div class="author">by ${item.author ? item.author.title : '(unknown)'}</div>` : ''}
          <span class="flex1"></span>
          ${item.mount.description ? html`<span class="description">${item.mount.description}</span>` : ''}
          <button class="transparent" @click=${e => this.onClickMenu(e, 'drive', item)}>
            <span class="fas fa-fw fa-ellipsis-h"></span>
          </button>
        </a>
      `
    }
  }

  // events
  // =

  onSelectView (e) {
    if (e.detail.id.startsWith('viz:')) {
      this.changeViz(e.detail.id.slice('viz:'.length))
    }
  }

  changeViz (v) {
    this.currentViz = v
    setSavedConfig('viz', this.currentViz)
    this.requestUpdate()
  }

  async onClickAdd (e, group) {
    e.preventDefault()
    e.stopPropagation()

    if (group === 'Bookmarks') {
      let b = await EditBookmarkPopup.create()
      await beaker.bookmarks.add(b)
      this.load()
    } else if (group === 'Library') {
      let driveCreator = (type = undefined) => async () => {
        var drive = await DatArchive.create({type})
        toast.create('Drive created')
        beaker.browser.openUrl(drive.url, {setActive: true})
        this.load()
      }
      await contextMenu.create({
        x: e.clientX,
        y: e.clientY,
        noBorders: true,
        roomy: true,
        fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
        style: `padding: 4px 0`,
        items: [
          html`<div class="section-header light small">Basic</div>`,
          {icon: 'far fa-fw fa-folder-open', label: 'Files drive', click: driveCreator()},
          {icon: 'fas fa-fw fa-sitemap', label: 'Website', click: driveCreator('website')},
          '-',
          html`<div class="section-header light small">Advanced</div>`,
          {icon: 'fas fa-fw fa-drafting-compass', label: 'Application', click: driveCreator('application')},
          {icon: 'fas fa-fw fa-terminal', label: 'Webterm Command', click: driveCreator('webterm.sh/cmd-pkg')},
        ]
      })
    } else if (group === 'Users') {
      await beaker.users.showCreateDialog()
      this.load()
    } else {
      alert('TODO')
    }
  }

  onContextMenu (e, type, item) {
    e.preventDefault()
    e.stopPropagation()

    this.showMenu(type, item, e.clientX, e.clientY, true)
  }

  onClickMenu (e, type, item) {
    e.preventDefault()
    e.stopPropagation()

    var rect = e.currentTarget.getClientRects()[0]
    this.showMenu(type, item, rect.right + 6, rect.bottom + 8, false)
  }

  async onClickNew (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    await createNew.showContextMenu({
      x: rect.left,
      y: rect.bottom
    })
    this.load()
  }
}
customElements.define('drives-view', DrivesView)

// internal methods
// =

function getSavedConfig (name, fallback = undefined) {
  return localStorage.getItem(`drives-setting-${name}`) || fallback
}

function setSavedConfig (name, value) {
  localStorage.setItem(`drives-setting-${name}`, value)
}