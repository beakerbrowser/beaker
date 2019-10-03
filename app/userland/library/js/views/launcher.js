import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'
import { EditPinPopup } from '../com/edit-pin-popup.js'
import { AddPinPopup } from '../com/add-pin-popup.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import { writeToClipboard } from '../../../app-stdlib/js/clipboard.js'
import * as pins from '../lib/pins.js'
import { oneof } from '../lib/validation.js'
import * as QP from '../lib/query-params.js'
import launcherViewCSS from '../../css/views/launcher.css.js'
import '../com/subview-tabs.js'

const SUBVIEWS = [
  {id: 'pins', label: html`<span class="fas fa-fw fa-thumbtack"></span> Pins`},
  {id: 'whats-new', label: html`<span class="fas fa-fw fa-star-of-life"></span> What's New`},
]

class LauncherView extends LitElement {
  static get properties() {
    return {
      currentSubview: {type: String},
      pins: {type: Array}
    }
  }

  static get styles () {
    return launcherViewCSS
  }

  constructor () {
    super()
    this.currentSubview = oneof(QP.getParam('subview'), 'pins', ['pins', 'whats-new'])
    this.pins = []
    this.draggedPin = null
    this.dragStartTime = 0
    this.load()
  }

  async load () {
    this.pins = await pins.load()
  }

  // rendering
  // =

  render() {
    document.title = 'New Tab'
    if (!this.pins) {
      return html`<div></div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.renderPins()}
    `
  }

  renderPins () {
    return html`
      <div class="pins">
        ${repeat(this.pins, pin => html`
          <a
            class="pin"
            href=${pin.href}
            @contextmenu=${e => this.onContextmenuPin(e, pin)}
            @dragstart=${e => this.onDragstart(e, pin)}
            @dragover=${e => this.onDragover(e, pin)}
            @dragleave=${e => this.onDragleave(e, pin)}
            @drop=${e => this.onDrop(e, pin)}
          >
            <img src=${'asset:favicon:' + pin.href + '?cache_buster=' + Date.now()} class="favicon"/>
            <div class="details">
              <div class="title">${pin.title}</div>
            </div>
          </a>
        `)}
        <a class="pin add" @click=${this.onClickAdd}>
          <span class="fas fa-fw fa-plus"></span>
        </a>
      </div>
    `
  }

  // events
  // =

  async onClickAdd () {
    try {
      var pin = await AddPinPopup.create()
      this.pins = this.pins.concat([pin])
      pins.save(this.pins)
      toast.create('Pin added', '', 10e3, {label: 'Undo', click: undo})
    } catch (e) {
      // ignore
      console.log(e)
    }
  }

  async onContextmenuPin (e, pin) {
    e.preventDefault()
    const items = [
      {icon: 'fa fa-external-link-alt', label: 'Open Link in New Tab', click: () => window.open(pin.href)},
      {icon: 'fa fa-link', label: 'Copy Link Address', click: () => writeToClipboard(pin.href)},
      {icon: 'fa fa-pencil-alt', label: 'Edit', click: () => this.onClickEdit(pin)},
      {icon: 'fa fa-times', label: 'Unpin', click: () => this.onClickRemove(pin)}
    ]
    await contextMenu.create({x: e.clientX, y: e.clientY, items, fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'})
  }

  async onClickEdit (pin) {
    try {
      // render popup
      var values = await EditPinPopup.create(pin)
      Object.assign(pin, values)
      
      // make update
      pins.save(this.pins)
      this.requestUpdate()
    } catch (e) {
      // ignore
      console.log(e)
    }
  }

  onClickRemove (pin) {
    this.pins = this.pins.filter(p => p !== pin)
    pins.save(this.pins)

    const undo = async () => {
      this.pins = this.pins.concat(pin)
      pins.save(this.pins)
    }

    toast.create('Pin removed', '', 10e3, {label: 'Undo', click: undo})
  }

  onDragstart (e, draggedPin) {
    this.draggedPin = draggedPin
    this.dragStartTime = Date.now()
    e.dataTransfer.effectAllowed = 'move'
  }

  onDragover (e, b) {
    if (e.dataTransfer.files.length) {
      return // allow toplevel event-handler to handle
    }
    e.preventDefault()

    e.currentTarget.classList.add('drag-hover')
    e.dataTransfer.dropEffect = 'move'
    return false
  }

  onDragleave (e, b) {
    e.currentTarget.classList.remove('drag-hover')
  }

  onDrop (e, dropTargetPin) {
    if (e.dataTransfer.files.length) {
      return // allow toplevel event-handler to handle
    }
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-hover')

    if (this.draggedPin !== dropTargetPin) {
      var dropIndex = this.pins.indexOf(dropTargetPin)
      var draggedIndex = this.pins.indexOf(this.draggedPin)
      
      // remove the dragged pin
      this.pins.splice(draggedIndex, 1)

      // ...and reinsert it in front of the drop target
      this.pins.splice(dropIndex, 0, this.draggedPin)

      // save new order
      pins.save(this.pins)
    } else if (Date.now() - this.dragStartTime < 100) {
      // this was probably a click that was misinterpretted as a drag
      // manually "click"
      window.location = this.draggedPin.href
    }

    // rerender
    this.requestUpdate()
    this.draggedPin = null
    return false
  }
}

customElements.define('launcher-view', LauncherView)