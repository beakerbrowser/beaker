import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { pluralize } from 'beaker://app-stdlib/js/strings.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import addessBookCSS from '../../css/views/address-book.css.js'

const sysDrive = beaker.hyperdrive.drive('hyper://system/')

async function updateAddressBook (updateFn) {
  var addressBook = await sysDrive.readFile('/address-book.json').then(JSON.parse).catch(e => ({contacts: []}))
  updateFn(addressBook)
  await sysDrive.writeFile('/address-book.json', JSON.stringify(addressBook, null, 2))
}

export class AddressBookView extends LitElement {
  static get properties () {
    return {
      contacts: {type: Array},
      filter: {type: String},
      showHeader: {type: Boolean, attribute: 'show-header'},
      hideEmpty: {type: Boolean, attribute: 'hide-empty'}
    }
  }

  static get styles () {
    return addessBookCSS
  }

  constructor () {
    super()
    this.contacts = undefined
    this.filter = undefined
    this.showHeader = false
    this.hideEmpty = false
  }

  async load () {
    this.contacts = await beaker.contacts.list()
    this.contacts.sort((a, b) => a.title.localeCompare(b.title))
    console.log(this.contacts)

    await Promise.all(this.contacts.map(async c => {
      c.peers = await beaker.drives.getPeerCount(c.url)
    }))
    this.requestUpdate()
  }

  async contactMenu (contact) {
    var items = [
      {label: 'Open Link in New Tab', click: () => window.open(contact.url)},
      {label: 'Copy Link Address', click: () => writeToClipboard(contact.url)},
      {type: 'separator'},
      {label: 'Remove from Address Book', click: () => this.onClickRemove(contact)}
    ]
    var fns = {}
    for (let i = 0; i < items.length; i++) {
      if (items[i].id) continue
      let id = `item=${i}`
      items[i].id = id
      fns[id] = items[i].click
      delete items[i].click
    }
    var choice = await beaker.browser.showContextMenu(items)
    if (fns[choice]) fns[choice]()
  }

  // rendering
  // =

  render () {
    var contacts = this.contacts
    if (contacts && this.filter) {
      contacts = contacts.filter(contact => (
        (contact.title).toLowerCase().includes(this.filter)
        || (contact.description).toLowerCase().includes(this.filter)
      ))
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${contacts ? html`
        ${this.showHeader && !(this.hideEmpty && contacts.length === 0) ? html`
          <h4>Address Book</h4>
        ` : ''}
        <div class="contacts">
          ${repeat(contacts, contact => this.renderContact(contact))}
        </div>
          ${contacts.length === 0 && !this.hideEmpty ? html`
            <div class="empty"><span class="far fa-address-card"></span><div>Click "New Contact" to create a Contact</div></div>
          ` : ''}
          ${contacts.length === 0 && this.filter ? html`
            <div class="empty"><div>No matches found for "${this.filter}".</div></div>
          ` : ''}
      ` : html`
        <div class="loading"><span class="spinner"></span></div>
      `}
    `
  }

  renderContact (contact) {
    var {url, title, description} = contact
    var peers = contact.peers || 0
    return html`
      <a
        class="contact"
        href="${url}"
        title=${title || ''}
        @contextmenu=${e => this.onContextmenuContact(e, contact)}
      >
        <img class="thumb" src="asset:thumb-30:${url}">
        <div class="title">${title || 'Anonymous'}</div>
        <div class="description">${description}</div>
        <div class="profile-badge">${contact.isProfile ? html`<span>My Profile</span>` : ''}</div>
        <div class="peers">${peers} ${pluralize(peers, 'peer')}</div>
        <div class="ctrls">
          <button class="transparent" @click=${e => this.onClickContactMenuBtn(e, contact)}><span class="fas fa-fw fa-ellipsis-h"></span></button>
        </div>
      </div>
    `
  }

  // events
  // =

  async onContextmenuContact (e, contact) {
    e.preventDefault()
    e.stopPropagation()
    await this.contactMenu(contact)
  }

  onClickContactMenuBtn (e, contact) {
    e.preventDefault()
    e.stopPropagation()
    this.contactMenu(contact)
  }

  async onClickRemove (contact) {
    if (!confirm('Are you sure?')) return
    var key = toHostname(contact.url)
    await updateAddressBook(addressBook => {
      if (contact.isProfile) {
        addressBook.profiles = addressBook.profiles.filter(c2 => c2.key !== key)
      } else {
        addressBook.contacts = addressBook.contacts.filter(c2 => c2.key !== key)
      }
    })
    toast.create('Contact removed', '', 10e3)
    this.load()
  }
}

customElements.define('address-book-view', AddressBookView)

function toHostname (str) {
  try {
    var urlp = new URL(str)
    return urlp.hostname
  } catch (e) {
    return str
  }
}