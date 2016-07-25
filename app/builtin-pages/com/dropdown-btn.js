import * as yo from 'yo-yo'

export default function dropdownBtn (elRender, listRender) {
  var el = elRender('', false, onToggle)
  var isOpen = false
  function onToggle () {
    isOpen = !isOpen
    yo.update(el, elRender((isOpen ? listRender() : ''), isOpen, onToggle))
  }
  return el
}