/*
The webviews that run untrusted content, by default, will handle all key press events.
The webview handlers take precedence over the browser keybindings (which are done in the window-menu).
To avoid that, we listen to the window webContents' 'before-input-event' and handle the commands manually.
*/

import _flattenDeep from 'lodash.flattendeep'
import isAccelerator from 'electron-is-accelerator'
import equals from 'keyboardevents-areequal'
import {toKeyEvent} from 'keyboardevent-from-electron-accelerator'
import {buildWindowMenu, triggerMenuItemById} from './window-menu'

const IS_DARWIN = process.platform === 'darwin'
const registeredKBs = {} // map of [window.id] => keybindings

// exported api
// =

export function registerGlobalKeybinding (win, accelerator, callback) {
  // sanity checks
  checkAccelerator(accelerator)

  // add the keybinding
  registeredKBs[win.id] = registeredKBs[win.id] || []
  registeredKBs[win.id].push({
    eventStamp: toKeyEvent(accelerator),
    callback,
    enabled: true
  })
}

export function unregisterGlobalKeybinding (win, accelerator, callback) {
  // sanity checks
  checkAccelerator(accelerator)

  // remove the keybinding
  var keyEvent = toKeyEvent(accelerator)
  if (win.id in registeredKBs) {
    var kbIdx = registeredKBs[win.id].findIndex(kb => equals(kb.eventStamp, keyEvent))
    if (kbIdx !== -1) registeredKBs[win.id].splice(kbIdx, 1)
  }
}

// event handler for global shortcuts
export function createGlobalKeybindingsHandler (win) {
  return (e, input) => {
    if (input.type === 'keyUp') return
    var event = normalizeEvent(input)
    for (let {eventStamp, callback} of (registeredKBs[win.id] || [])) {
      if (equals(eventStamp, event)) {
        callback()
        return
      }
    }
  }
}

// event handler, manually run any events that match the window-menu's shortcuts and which are marked as 'reserved'
// this is used, for instance, to reserve "Cmd/Ctrl + T" so that an app cannot pre-empt it
// (the window-menu's accelerators are typically handled *after* the active view's input handlers)
export function createKeybindingProtectionsHandler (win) {
  const KEYBINDINGS = extractKeybindings(buildWindowMenu({win}))
  return (e, input) => {
    if (input.type !== 'keyDown') return
    var key = input.key
    if (key === 'Dead') key = 'i' // not... really sure what 'Dead' is about -prf
    if (key === '=') key = '+' // let's not differentiate the shift (see #1155) -prf
    var match
    for (var kb of KEYBINDINGS) {
      if (key === kb.binding.key) {
        if (kb.binding.control && !input.control) continue
        if (kb.binding.cmd && !input.meta) continue
        if (kb.binding.shift && !input.shift) continue
        if (kb.binding.alt && !input.alt) continue
        match = kb
      }
    }
    if (match) {
      e.preventDefault()
      triggerMenuItemById(match.menuLabel, match.id)
    }
  }
}

// internal
// =

// recurse the window menu and extract all 'accelerator' values with reserved=true
function extractKeybindings (menuNode, menuLabel) {
  if (menuNode.accelerator && menuNode.click && menuNode.reserved) {
    return {
      binding: convertAcceleratorToBinding(menuNode.accelerator),
      id: menuNode.id,
      menuLabel
    }
  } else if (menuNode.submenu) {
    return menuNode.submenu.map(item => extractKeybindings(item, menuNode.label)).filter(Boolean)
  } else if (Array.isArray(menuNode)) {
    return _flattenDeep(menuNode.map(extractKeybindings).filter(Boolean))
  }
  return null
}

// convert accelerator values into objects that are easy to match against input events
// eg 'CmdOrCtrl+Shift+T' -> {cmdOrCtrl: true, shift: true, key: 't'}
function convertAcceleratorToBinding (accel) {
  var binding = {}
  accel.split('+').forEach(part => {
    switch (part.toLowerCase()) {
      case 'command':
      case 'cmd':
        binding.cmd = true
        break
      case 'ctrl':
        binding.control = true
        break
      case 'cmdorctrl':
        if (IS_DARWIN) binding.cmd = true
        else binding.control = true
        break
      case 'alt':
        binding.alt = true
        break
      case 'shift':
        binding.shift = true
        break
      case 'plus':
        binding.key = '+'
        break
      default:
        binding.key = part.toLowerCase()
    }
  })
  return binding
}

function checkAccelerator (accelerator) {
  if (!isAccelerator(accelerator)) {
    throw new Error(`${accelerator} is not a valid accelerator`)
  }
}

function normalizeEvent (input) {
  var normalizedEvent = {
    code: input.code,
    key: input.key
  }

  for (let prop of ['alt', 'shift', 'meta']) {
    if (typeof input[prop] !== 'undefined') {
      normalizedEvent[`${prop}Key`] = input[prop]
    }
  }

  if (typeof input.control !== 'undefined') {
    normalizedEvent.ctrlKey = input.control
  }

  return normalizedEvent
}