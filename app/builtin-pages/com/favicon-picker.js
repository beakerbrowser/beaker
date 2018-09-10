/* globals beaker */

import * as yo from 'yo-yo'

// globals
// =

var builtinFaviconsList
var selectedFavicon
var loadError
var onSelect

// exported
// =

export default function (opts) {
  onSelect = opts.onSelect

  // load the favicons if neded
  if (!builtinFaviconsList) {
    beaker.browser.listBuiltinFavicons()
      .catch(err => {
        loadError = err
        console.error('Error loading builtin favicons', err)
      })
      .then(bfl => {
        builtinFaviconsList = bfl
        rerender()
      })
  }

  return render()
}

// internal methods
// =

function render () {
  if (!builtinFaviconsList && !loadError) {
    return yo`<div class="loading-favicon-picker text"></div>`
  }
  if (loadError) {
    return yo`<div class="loading-favicon-picker text">${loadError.toString()}</div>`
  }
  // var iconNames = builtinFaviconsList.filter(applyFilter)
  return yo`
    <div class="favicon-picker">
      <div class="favicon-picker-icons">
        ${builtinFaviconsList.map(name => yo`
          <div
            class="icon ${selectedFavicon === name ? 'selected' : ''}"
            onclick=${() => onClickIcon(name)}
          >
            <img src="beaker://assets/favicons/${name}" />
          </div>
        `)}
      </div>
      <div class="remove">
        <a class="btn plain" onclick=${() => onClickRemove()}><span class="fa fa-times"></span> remove favicon</a>
      </div>
    </div>
  `
}

function rerender () {
  const el = document.body.querySelector('.loading-favicon-picker')
  if (el) yo.update(el, render())
}

// event handlers
// =

async function onClickIcon (v) {
  selectedFavicon = v
  onSelect(await beaker.browser.getBuiltinFavicon(selectedFavicon))
  rerender()
}

async function onClickRemove () {
  selectedFavicon = null
  onSelect(null)
  rerender()  
}