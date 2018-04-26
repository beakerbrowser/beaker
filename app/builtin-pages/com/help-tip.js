/* globals localStorage */

import * as yo from 'yo-yo'
import * as HELP_TIPS from '../../lib/i18n/help-tips'

// globals
// =

var IS_DISMISSED = false
var IS_FIRST_RENDER = true

// exported api
// =

export default function render () {
  // update the tip
  if (IS_FIRST_RENDER) {
    nextTip()
    IS_FIRST_RENDER = false
  }

  // select the tip
  var currentHelpTip = localStorage.currentHelpTip
  if (IS_DISMISSED || currentHelpTip === 'dismissed') return yo`<div></div>`
  var tip = HELP_TIPS.EN[(+currentHelpTip) || 0]

  // render
  var el = yo`<span></span>`
  el.innerHTML = tip.content
  return yo`<div class="help-tip">
    <strong><span class="fa fa-info"></span> Tip:</strong>
    ${el}
    <span class="help-tip-ctrl">
      <a class="btn success" href=${tip.href}>${tip.cta}</a>
      ${''/* <a class="btn" href="#" onclick=${onClickNextTip}><span class="fa fa-caret-right"></span></a> */}
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

function nextTip () {
  var currentHelpTip = ((+localStorage.currentHelpTip) || 0) + 1
  if (currentHelpTip >= HELP_TIPS.EN.length) currentHelpTip = 0
  localStorage.currentHelpTip = currentHelpTip
}

// events
// =

function onClickNextTip (e) {
  e.preventDefault()
  nextTip()
  rerender()
}

function onClickDismiss (e) {
  e.preventDefault()
  IS_DISMISSED = true
  // localStorage.currentHelpTip = 'dismissed'
  rerender()
}
