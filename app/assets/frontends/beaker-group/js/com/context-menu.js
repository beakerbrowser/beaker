import {LitElement, html, css} from '../../vendor/lit-element/lit-element.js'
import {classMap} from '../../vendor/lit-element/lit-html/directives/class-map.js'
import {ifDefined} from '../../vendor/lit-element/lit-html/directives/if-defined.js'
import {findParent} from '../lib/dom.js'
import dropdownCSS from '../../css/com/dropdown.css.js'

// globals
// =

var resolve

// exported api
// =

// create a new context menu
// - returns a promise that will resolve to undefined when the menu goes away
// - example usage:
/*
create({
  // where to put the menu
  x: e.clientX,
  y: e.clientY,

  // align edge to right instead of left
  right: true,

  // use triangle
  withTriangle: true,

  // roomy style
  roomy: true,

  // no borders on items
  noBorders: false,

  // additional styles on dropdown-items
  style: 'font-size: 14px',

  // parent element to append to
  parent: document.body,

  // menu items
  items: [
    // icon from font-awesome
    {icon: 'fa fa-link', label: 'Copy link', click: () => writeToClipboard('...')}
  ]

  // instead of items, can give render()
  render () {
    return html`
      <img src="smile.png" onclick=${contextMenu.destroy} />
    `
  }
}
*/
export function create (opts) {
  // destroy any existing
  destroy()

  // extract attrs
  var parent = opts.parent || document.body

  // render interface
  parent.appendChild(new BeakerContextMenu(opts))
  document.addEventListener('keyup', onKeyUp)
  document.addEventListener('click', onClickAnywhere)

  // return promise
  return new Promise(_resolve => {
    resolve = _resolve
  })
}

export function destroy (value) {
  const el = document.querySelector('beaker-context-menu')
  if (el) {
    el.parentNode.removeChild(el)
    document.removeEventListener('keyup', onKeyUp)
    document.removeEventListener('click', onClickAnywhere)
    resolve(value)
  }
}

// global event handlers
// =

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}

function onClickAnywhere (e) {
  if (!findParent(e.target, el => el.tagName === 'BEAKER-CONTEXT-MENU')) {
    // click is outside the context-menu, destroy
    destroy()
  }
}

// internal
// =

export class BeakerContextMenu extends LitElement {
  constructor ({x, y, right, center, top, withTriangle, roomy, noBorders, style, items, render}) {
    super()
    this.x = x
    this.y = y
    this.right = right || false
    this.center = center || false
    this.top = top || false
    this.withTriangle = withTriangle || false
    this.roomy = roomy || false
    this.noBorders = noBorders || false
    this.customStyle = style || undefined
    this.items = items
    this.customRender = render
  }

  // calls the global destroy
  // (this function exists so that custom renderers can destroy with this.destroy)
  destroy () {
    destroy()
  }

  // rendering
  // =

  render () {
    const cls = classMap({
      'dropdown-items': true,
      right: this.right,
      center: this.center,
      left: !this.right,
      top: this.top,
      'with-triangle': this.withTriangle,
      roomy: this.roomy,
      'no-border': this.noBorders
    })
    var style = ''
    if (this.x) style += `left: ${this.x}px; `
    if (this.y) style += `top: ${this.y}px; `
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <div class="context-menu dropdown" style="${style}">
        ${this.customRender
          ? this.customRender()
          : html`
            <div class="${cls}" style="${ifDefined(this.customStyle)}">
              ${this.items.map(item => {
                if (item === '-') {
                  return html`<hr />`
                }
                if (item.type === 'html') {
                  return item
                }
                var icon = item.icon
                if (icon && !icon.includes(' ')) {
                  icon = 'fa fa-' + icon
                }
                if (item.disabled) {
                  return html`
                    <div class="dropdown-item disabled">
                      ${icon ? html`<i class="${icon}"></i>` : ''}
                      ${item.label}
                    </div>
                  `
                }
                if (item.href) {
                  return html`
                    <a class="dropdown-item" href=${item.href}>
                      ${icon ? html`<i class="${icon}"></i>` : ''}
                      ${item.label}
                    </a>
                  `
                }
                return html`
                  <div class="dropdown-item" @click=${() => { destroy(); item.click() }}>
                    ${icon ? html`<i class="${icon}"></i>` : ''}
                    ${item.label}
                  </div>
                `
              })}
            </div>`
        }
      </div>`
  }
}

BeakerContextMenu.styles = css`
${dropdownCSS}

.context-menu {
  position: fixed;
  z-index: 10000;
}

.dropdown-items {
  width: auto;
  white-space: nowrap;
}

a.dropdown-item {
  color: inherit;
  text-decoration: none;
}

.dropdown-item,
.dropdown-items.roomy .dropdown-item {
  padding-right: 30px; /* add a little cushion to the right */
}

/* custom icon css */
.fa-long-arrow-alt-right.custom-link-icon {
  position: relative;
  transform: rotate(-45deg);
  left: 1px;
}
.fa-custom-path-icon:after {
  content: './';
  letter-spacing: -1px;
  font-family: var(--code-font);
}
`

customElements.define('beaker-context-menu', BeakerContextMenu)