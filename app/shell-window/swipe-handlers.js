import { ipcRenderer } from 'electron'
import * as pages from './pages'

var SWIPE_TRIGGER_DIST = 400 // how far do you need to travel to trigger the navigation
var ARROW_OFF_DIST = 80 // how far off-screen are the arrows

export function setup () {
  var horizontal = 0 // how much x traveled?
  var vertical = 0 // how much y traveled?
  var hnorm = 0 // "normalized" 0 (put into a ranger where `> 1` or `< -1` triggers the navigation)
  var isTouching = false // is touch event active?
  var leftSwipeArrowEl = document.getElementById('left-swipe-arrow')
  var rightSwipeArrowEl = document.getElementById('right-swipe-arrow')

  const shouldGoBack = () => {
    return hnorm < -1
  }
  const shouldGoForward = () => {
    return hnorm > 1
  }

  window.addEventListener('mousewheel', e => {
    if (isTouching) {

      // track amount of x & y traveled
      horizontal += e.deltaX
      vertical += e.deltaY

      // calculate the normalized horizontal
      if (Math.abs(vertical) > Math.abs(horizontal))
        hnorm = 0 // ignore if there's more vertical motion than horizontal
      else
        hnorm = horizontal / SWIPE_TRIGGER_DIST
      hnorm = Math.min(1.2, Math.max(-1.2, hnorm)) // clamp to [-1.2, 1.2]

      // calculate arrow positions
      if (horizontal < 0) {
        leftSwipeArrowEl.style.left = ((-1 * ARROW_OFF_DIST) - (hnorm * ARROW_OFF_DIST)) + 'px'
        rightSwipeArrowEl.style.right = (-1 * ARROW_OFF_DIST) + 'px'
      }
      if (horizontal > 0) {
        leftSwipeArrowEl.style.left = (-1 * ARROW_OFF_DIST) + 'px'
        rightSwipeArrowEl.style.right = ((-1 * ARROW_OFF_DIST) + (hnorm * ARROW_OFF_DIST)) + 'px'        
      }

      // highlight 
      if (shouldGoBack()) leftSwipeArrowEl.classList.add('highlight')
      else                leftSwipeArrowEl.classList.remove('highlight')
      if (shouldGoForward()) rightSwipeArrowEl.classList.add('highlight')
      else                   rightSwipeArrowEl.classList.remove('highlight')
    }
  })

  // for various humorous reasons, the 'scroll-touch-end' event is emitted in the background process
  // so, listen for it over ipc
  // https://github.com/electron/electron/pull/4181
  ipcRenderer.on('window-event', function (event, type) {
    if (type == 'scroll-touch-begin') {
      leftSwipeArrowEl.classList.remove('returning')
      rightSwipeArrowEl.classList.remove('returning')
      isTouching = true
    }

    if (type == 'scroll-touch-end' && isTouching) {
      isTouching = false

      // trigger navigation
      if (shouldGoBack()) {
        var page = pages.getActive()
        if (page) page.goBack()
      }
      if (shouldGoForward()) {
        var page = pages.getActive()
        if (page) page.goForward()
      }

      // reset arrows
      horizontal = vertical = hnorm = 0
      leftSwipeArrowEl.classList.add('returning')
      leftSwipeArrowEl.classList.remove('highlight')
      leftSwipeArrowEl.style.left = (-1 * ARROW_OFF_DIST) + 'px'
      rightSwipeArrowEl.classList.add('returning')
      rightSwipeArrowEl.classList.remove('highlight')
      rightSwipeArrowEl.style.right = (-1 * ARROW_OFF_DIST) + 'px'
    }
  })
}