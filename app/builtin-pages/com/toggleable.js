import * as yo from 'yo-yo'

// this is a very simple state-encapsulation method
// it tracks the toggle state and gives a method to change it
// - `elRender(onToggle, isOpen)`: function to render the dropdown
export default function toggleable (elRender) {
  var isOpen = false
  var el = elRender(onToggle, isOpen)
  function onToggle () {
    isOpen = !isOpen
    yo.update(el, elRender(onToggle, isOpen))
  }
  return el
}