/* globals localStorage */

import * as yo from 'yo-yo'

// globals
// =

var isDismissed = false
var tip

// exported api
// =

export async function load () {
  try {
    var lastSeenTip = (+localStorage.lastSeenTip || 0)
    var archive = new DatArchive('dat://beakerbrowser.com')
    var latestTip = JSON.parse(await archive.readFile('/tips/en-US.json'))
    if (latestTip.number > lastSeenTip) {
      tip = latestTip
      rerender()
    }
  } catch (e) {
    console.warn('Failed to load latest tip', e)
  }
}

export function render () {
  if (!tip || isDismissed) return yo`<div class="help-tip"></div>`

  // render
  var el = yo`<span></span>`
  el.innerHTML = tip.content
  return yo`<div class="help-tip">
    <span class="fa fa-${tip.icon}"></span>
    ${el}
    <span class="help-tip-ctrl">
      <a class="btn success" href=${tip.href} target="_blank">${tip.cta}</a>
      <a class="btn plain" href="#" onclick=${onClickDismiss}><span class="fa fa-times"></span></a>
    </span>
  </div>`
}

// internal methods
// =

function rerender () {
  var el = document.querySelector('.help-tip')
  if (el) yo.update(el, render())
}

// events
// =

function onClickDismiss (e) {
  e.preventDefault()
  isDismissed = true
  localStorage.lastSeenTip = tip.number
  rerender()
}
