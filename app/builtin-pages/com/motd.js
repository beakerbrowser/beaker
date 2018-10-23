/* globals localStorage DatArchive */

import * as yo from 'yo-yo'

// globals
// =

var isDismissed = false
var motd

// exported api
// =

export async function load () {
  try {
    var lastSeenMOTD = (+localStorage.lastSeenMOTD || 0)
    var archive = new DatArchive('dat://beakerbrowser.com')
    var latestMOTD = JSON.parse(await archive.readFile('/motd/en-US.json'))
    if (latestMOTD.number > lastSeenMOTD) {
      motd = latestMOTD
      rerender()
    }
  } catch (e) {
    console.warn('Failed to load latest motd', e)
  }
}

export function render () {
  if (!motd || isDismissed) return yo`<div class="motd"></div>`

  // render
  var el = yo`<span></span>`
  el.innerHTML = motd.content

  return yo`
    <div class="motd">
      <i class="fa fa-${motd.icon} icon"></i>
      <span class="content">
        <span>${motd.content}</span>
        <a class="btn transparent cta nofocus" href=${motd.href} target="_blank">${motd.cta}</a>
      </a>
      <button class="btn plain close" onclick=${onClickDismiss}>
        <i class="fa fa-times"></i>
      </button>
    </div>`
}

// internal methods
// =

function rerender () {
  var el = document.querySelector('.motd')
  if (el) yo.update(el, render())
}

// events
// =

function onClickDismiss (e) {
  e.preventDefault()
  isDismissed = true
  localStorage.lastSeenMOTD = motd.number
  rerender()
}
