/* globals beaker */

import yo from 'yo-yo'
import * as faviconMakerPopup from './favicon-maker'

// globals
// =

var builtinFaviconsList
var selectedFavicon
var loadError
var onSelect
var currentFaviconUrl

// exported
// =

export default function (opts) {
  onSelect = opts.onSelect
  currentFaviconUrl = opts.currentFaviconUrl

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
      <div class="tools">
        <a class="btn" onclick=${() => uploadFavicon()}><span class="fa fa-folder-open-o"></span> Open</a>
        <a class="btn" onclick=${onCreateFavicon}><span class="fa fa-edit"></span> Edit</a>
        <a class="btn" onclick=${() => onClickRemove()}><span class="fa fa-times"></span> Remove</a>
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

async function onCreateFavicon (e) {
  e.stopPropagation()

  var customFavicon = await faviconMakerPopup.create({currentFaviconUrl})
  let v = await beaker.browser.imageToIco(customFavicon)
  if (v) {
    onSelect(v)
    rerender()
  }
}

async function uploadFavicon () {
  let v = await beaker.browser.uploadFavicon()
  if (v) {
    onSelect(v)
    rerender()
  }
}