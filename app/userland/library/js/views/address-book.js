import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import addessBookCSS from '../../css/views/address-book.css.js'

const sysDrive = beaker.hyperdrive.drive('sys')

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
    this.hideEmpty = false
  }

  async load () {
    var addressBook = await sysDrive.readFile('/address-book.json').then(JSON.parse).catch(e => ({contacts: []}))
    this.contacts = addressBook?.contacts || []
    console.log(this.contacts)
  }

  contactMenu (contact, x, y, right = false) {
    return contextMenu.create({
      x,
      y,
      right: right || (x > document.body.scrollWidth - 300),
      top: (y > window.innerHeight / 2),
      roomy: false,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items: [
        {icon: 'fa fa-external-link-alt', label: 'Open Link in New Tab', click: () => window.open('hyper://' + contact.key)},
        {icon: 'fa fa-link', label: 'Copy Link Address', click: () => writeToClipboard('hyper://' + contact.key)},
        {icon: 'fa fa-times', label: 'Delete', click: () => this.onClickRemove(contact)}
      ]
    })
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
        <div class="contacts">
          ${repeat(contacts, contact => this.renderContact(contact))}
        </div>
          ${contacts.length === 0 && !this.hideEmpty ? html`
            <div class="empty"><span class="far fa-address-card"></span><div>Click "New Contact" to create a Contact</div></div>
          ` : ''}
      ` : html`
        <div class="loading"><span class="spinner"></span></div>
      `}
    `
  }

  renderContact (contact) {
    var {key, title, description} = contact
    var href = `hyper://${key}`
    return html`
      <a
        class="contact"
        href="${href}"
        title=${title || ''}
        @contextmenu=${e => this.onContextmenuContact(e, contact)}
      >
       <img class="thumb" src="asset:thumb:${href}">
       <div class="info">
         <div class="title">${title}</div>
         <div class="description">${description}</div>
        </div>
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
    var el = e.currentTarget
    el.style.background = '#fafafd'
    await this.contactMenu(contact, e.clientX, e.clientY)
    el.style.background = 'none'
  }

  onClickContactMenuBtn (e, contact) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    this.contactMenu(contact, rect.right, rect.bottom, true)
  }

  async onClickRemove (contact) {
    if (!confirm('Are you sure?')) return
    await updateAddressBook(addressBook => {
      addressBook.contacts = addressBook.contacts.filter(c2 => c2.key !== contact.key)
    })
    toast.create('Contact removed', '', 10e3)
    this.load()
  }
}

customElements.define('address-book-view', AddressBookView)