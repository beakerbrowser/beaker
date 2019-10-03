import {emit} from '../../../lib/event-handlers'

const HOTKEYS = [
  {modifiers: ['CmdOrCtrl'], key: 's', fn: () => emit('editor-save-active-model')}

  // DISABLED
  // these hotkeys require keyboard lock of some kind
  // -prf
  // {modifiers: ['CmdOrCtrl'], key: 'n', fn: () => emit('editor-new-model')},
  // {modifiers: ['CmdOrCtrl'], key: 'w', fn: () => emit('editor-unload-active-model')},
  // {modifiers: ['Ctrl', 'Shift'], key: 'Tab', fn: () => emit('editor-cycle-tabs', {reverse: true})},
  // {modifiers: ['Ctrl'], key: 'Tab', fn: () => emit('editor-cycle-tabs')},
  // {modifiers: ['CmdOrCtrl'], key: '1', fn: () => emit('editor-show-tab', {tab: 1})},
  // {modifiers: ['CmdOrCtrl'], key: '2', fn: () => emit('editor-show-tab', {tab: 2})},
  // {modifiers: ['CmdOrCtrl'], key: '3', fn: () => emit('editor-show-tab', {tab: 3})},
  // {modifiers: ['CmdOrCtrl'], key: '4', fn: () => emit('editor-show-tab', {tab: 4})},
  // {modifiers: ['CmdOrCtrl'], key: '5', fn: () => emit('editor-show-tab', {tab: 5})},
  // {modifiers: ['CmdOrCtrl'], key: '6', fn: () => emit('editor-show-tab', {tab: 6})},
  // {modifiers: ['CmdOrCtrl'], key: '7', fn: () => emit('editor-show-tab', {tab: 7})},
  // {modifiers: ['CmdOrCtrl'], key: '8', fn: () => emit('editor-show-tab', {tab: 8})},
  // {modifiers: ['CmdOrCtrl'], key: '9', fn: () => emit('editor-show-tab', {tab: 9})}
]

// globals
// =

var OS_USES_META_KEY = false

// exported api
// =

export function configure (opts) {
  OS_USES_META_KEY = opts.OS_USES_META_KEY
}

export function onGlobalKeydown (e) {
  var cmdOrCtrl = OS_USES_META_KEY ? e.metaKey : e.ctrlKey
  const HOTKEY = HOTKEYS.find(hotkey => {
    if (hotkey.key !== e.key) return false
    for (let mod of hotkey.modifiers) {
      if (mod === 'CmdOrCtrl' && !cmdOrCtrl) return false
      if (mod === 'Ctrl' && !e.ctrlKey) return false
      if (mod === 'Shift' && !e.shiftKey) return false
      if (mod === 'Alt' && !e.altKey) return false
    }
    return true
  })

  if (HOTKEY) {
    e.preventDefault()
    e.stopPropagation()
    HOTKEY.fn()
  }
}