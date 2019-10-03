/* globals Event */

import yo from 'yo-yo'

// exported api
// =

export default function render (state, menu) {
  if (state.windowClickHandler) {
    window.removeEventListener('click', state.windowClickHandler)
    state.windowClickHandler = null
  }
  if (state.active) {
    state.windowClickHandler = onWindowClick(state, menu)
    window.addEventListener('click', state.windowClickHandler)
  }

  return yo`
    <div class="dropdown-menu-bar ${state.active ? 'active' : ''}">
      ${menu.map((item, i) => rTopItem(state, menu, item, i))}
    </div>
  `
}

// rendering
// =

function update (state, menu) {
  yo.update(document.querySelector('.dropdown-menu-bar'), render(state, menu))
}

function rTopItem (state, menu, item, index) {
  const onMouseOver = e => onHoverTopItem(state, menu, index)
  const onClick = e => onClickTopItem(state, menu, index, e)

  if (!state.active || state.openedMenuIndex !== index) {
    return yo`
      <div class="item top-item closed" onclick=${onClick} onmouseover=${onMouseOver}>${item.label}</div>
    `
  }

  return yo`
    <div class="item top-item open" onclick=${onClick} onmouseover=${onMouseOver}>
      ${item.label}
      <div class="dropdown-menu">
        ${item.menu.map(subItem => rMenuItem(state, subItem))}
      </div>
    </div>
  `
}

function rMenuItem (state, item) {
  const onClick = e => onClickMenuItem(item)
  if (item === '-') {
    return yo`<hr />`
  }
  var cls = ''
  if (item.disabled) cls = 'disabled'
  return yo`
    <a class=${cls} onclick=${onClick}>${rLabel(item.label)}</a>
  `
}

function rLabel (str) {
  var parts = str.split('&')
  if (parts.length === 1) return str // no change

  // pull out the character after the &
  var ch = parts[1].charAt(0)
  parts[1] = parts[1].slice(1)

  // add an underlined element
  parts.splice(1, 0, yo`<u>${ch}</u>`)
  return parts
}

// events
// =

function onClickTopItem (state, menu, index, e) {
  if (!state.active) {
    e.stopPropagation()

    state.active = true
    state.openedMenuIndex = index
    update(state, menu)
  }
}

function onClickMenuItem (item) {
  if (item.disabled) return
  if (typeof item.click === 'function') {
    item.click()
  } else if (typeof item.click === 'string') {
    window.dispatchEvent(new Event(item.click))
  }
}

function onHoverTopItem (state, menu, index) {
  if (state.active && state.openedMenuIndex !== index) {
    state.openedMenuIndex = index
    update(state, menu)
  }
}

function onWindowClick (state, menu) {
  return e => {
    if (!state.active) return
    state.active = false
    update(state, menu)
  }
}
