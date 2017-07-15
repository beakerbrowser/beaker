import { ipcRenderer } from 'electron'
import * as pages from './pages'
import * as zoom from './pages/zoom'

var SWIPE_TRIGGER_DIST = 400 // how far do you need to travel to trigger the navigation
var ARROW_OFF_DIST = 80 // how far off-screen are the arrows

export function setup () {
  var horizontal = 0 // how much x traveled?
  var vertical = 0 // how much y traveled?
  var hnorm = 0 // normalized to a [-1,1] range
  var isTouching = false // is touch event active?
  var leftSwipeArrowEl = document.getElementById('left-swipe-arrow')
  var rightSwipeArrowEl = document.getElementById('right-swipe-arrow')
  var toolbarSize = document.getElementById('toolbar').clientHeight

  const canGoBack = () => {
    var page = pages.getActive()
    if (page) return page.canGoBack()
  }
  const shouldGoBack = () => {
    return hnorm <= -1
  }
  const canGoForward = () => {
    var page = pages.getActive()
    if (page) return page.canGoForward()
  }
  const shouldGoForward = () => {
    return hnorm >= 1
  }

  window.addEventListener('mousewheel', e => {
    // TODO add key for macOS
    if (e.ctrlKey === true) {
      var page = pages.getActive()
      if (e.deltaY > 0) zoom.zoomOut(page)
      if (e.deltaY < 0) zoom.zoomIn(page)
    }

    if (isTouching) {
      // track amount of x & y traveled
      horizontal += e.deltaX
      vertical += e.deltaY

      // calculate the normalized horizontal
      if (Math.abs(vertical) > Math.abs(horizontal)) {
        hnorm = 0 // ignore if there's more vertical motion than horizontal
      } else if ((horizontal < 0 && !canGoBack()) || (horizontal > 0 && !canGoForward())) {
        hnorm = horizontal = 0 // ignore if the navigation isnt possible in that direction
      } else {
        hnorm = horizontal / SWIPE_TRIGGER_DIST
      }
      hnorm = Math.min(1.0, Math.max(-1.0, hnorm)) // clamp to [-1.0, 1.0]

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
      else leftSwipeArrowEl.classList.remove('highlight')
      if (shouldGoForward()) rightSwipeArrowEl.classList.add('highlight')
      else rightSwipeArrowEl.classList.remove('highlight')
    }
  })

  // for various humorous reasons, the 'scroll-touch-end' event is emitted in the background process
  // so, listen for it over ipc
  // https://github.com/electron/electron/pull/4181
  ipcRenderer.on('window-event', async function (event, type, data) {
    if (type == 'scroll-touch-begin') {
      leftSwipeArrowEl.classList.remove('returning')
      rightSwipeArrowEl.classList.remove('returning')

      // check if the item under the cursor is scrolling
      let page = pages.getActive()
      if (!page) return
      page.webviewEl.executeJavaScript(`
        (function() {
          var isScrolling = false
          // check if the element under the cursor, or any of its parents, are scrolling horizontally right now
          var el = document.elementFromPoint(${data.cursorX}, ${(data.cursorY - toolbarSize)})
          while (el) {
            if (el.scrollWidth > el.clientWidth) {
              isScrolling = true
              break
            }
            el = el.parentNode
          }
          return isScrolling
        })()
      `, true, (isScrollingEl) => {
        if (isScrollingEl) return // dont do anything
        isTouching = true
      })
    }

    if (type == 'scroll-touch-end' && isTouching) {
      isTouching = false

      // trigger navigation
      if (shouldGoBack()) {
        let page = pages.getActive()
        if (page) page.goBackAsync()
      }
      if (shouldGoForward()) {
        let page = pages.getActive()
        if (page) page.goForwardAsync()
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
