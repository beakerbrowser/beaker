/*
The webviews that run untrusted content, by default, will handle all key press events.
The webview handlers take precedence over the browser keybindings (which are done in the window-menu).
To avoid that, we listen to the window webContents' 'before-input-event' and handle the commands manually.
*/

import _flattenDeep from 'lodash.flattendeep'
import {buildWindowMenu} from './window-menu'

const KEYBINDINGS = extractKeybindings(buildWindowMenu())

// recurse the window menu and extract all 'accelerator' values with reserved=true
function extractKeybindings (menuNode) {
  if (menuNode.accelerator && menuNode.click && menuNode.reserved) {
    return {
      binding: convertAcceleratorToBinding(menuNode.accelerator),
      cmd: menuNode.click
    }
  } else if (menuNode.submenu) {
    return menuNode.submenu.map(extractKeybindings).filter(Boolean)
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
      case 'cmdorctrl':
      case 'ctrl':
        binding.cmdOrCtrl = true
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

// event handler, manually run any events that match our keybindings
export function createBeforeInputEventHandler (win) {
  return (e, input) => {
    var key = input.key
    if (key === 'Dead') key = 'i' // not... really sure what 'Dead' is about -prf
    if (key === '=') key = '+' // let's not differentiate the shift (see #1155) -prf
    for (var kb of KEYBINDINGS) {
      if (key === kb.binding.key) {
        if (kb.binding.cmdOrCtrl && !(input.control || input.meta)) {
          continue
        }
        if (kb.binding.shift && !input.shift) {
          continue
        }
        if (kb.binding.alt && !input.alt) {
          continue
        }

        // match, run
        e.preventDefault()
        kb.cmd(null, win)
        return
      }
    }
  }
}
