/* globals DatArchive beaker confirm localStorage */

import yo from 'yo-yo'
import {niceDate} from '../../../lib/time'
import * as toast from '../com/toast'
import * as addWatchlistItemPopup from '../com/add-watchlist-item-popup'
import renderBuiltinPagesNav from '../com/builtin-pages-nav'

// globals
// =

// watchlist, cached in memory
let watchlist = []
let selectedItems = []
let wlEvents = beaker.watchlist.createEventsStream()

// main
// =

setup()
async function setup () {
  await loadWatchlist()
  render()

  // watchlist events
  wlEvents.addEventListener('resolved', async () => {
    await loadWatchlist()
    render()
  })

  // handle query params
  var location = new URL(window.location)
  if (location.searchParams.get('url')) {
    await addToWatchlist(location.searchParams.get('url'))
    window.history.replaceState({}, null, 'beaker://watchlist/')
  }
}

// data
// =

async function loadWatchlist () {
  watchlist = await beaker.watchlist.list()
  sortWatchlist()
}

async function addToWatchlist (url, description) {
  description = description || url
  try {
    await beaker.watchlist.add(url, {description, seedWhenResolved: false})
    toast.create('Added to your watchlist', 'success')
  } catch (e) {
    console.error(e)
    toast.create(e.toString(), 'error')
    return
  }
  await loadWatchlist()
  render()
}

function sortWatchlist () {
  watchlist.sort((a, b) => {
    // put resolved at top
    if (a.resolved && !b.resolved) return -1
    if (b.resolved && !a.resolved) return 1
    // sort by creation time
    return b.createdAt - a.createdAt
  })
}

// rendering
// =

function renderColumnHeading ({label, cls, icon}) {
  icon = icon || ''
  return yo`
    <div class="column-heading ${cls}">
      <button class="nofocus">
        ${label}
      </button>
      ${icon}
    </div>
  `
}

function renderRows ({resolved}) {
  var list = watchlist.filter(a => a.resolved == resolved)
  return list.map(renderRow)
}

function renderRow (row, i) {
  let utcSeconds = row.createdAt
  let date = new Date(0)
  date.setUTCSeconds(utcSeconds)

  return yo`
    <a
      href="${row.url}"
      class="ll-row watchlist-item ${row.checked ? 'selected' : ''} ${row.resolved ? 'resolved' : ''}"
      onclick=${e => onOpenItem(e, row)}
      target="_blank"
    >
      <span class="watchlist-item-status">
        ${row.resolved ? yo`<span class="badge blue">Found</span>` : yo`<span class="badge">Searching</span>`}
      </span>

      <span class="watchlist-item-title">
        <img class="favicon" src="beaker-favicon:32,${row.url}" />
        <span class="description">${row.description}</span>
      </span>

      <span class="date">
        ${date ? niceDate(date) : '--'}
      </span>

      <div class="buttons">
        <button class="btn plain trash" onclick=${e => onDelete(e, row)} title="Remove from Watchlist">
          <i class="fas fa-trash"></i>
        </button>
      </div>

      <label class="checkbox">
        <input type="checkbox" checked=${!!row.checked} onclick=${(e) => onToggleChecked(e, row)}/>
        <i class="fa fa-check-circle"></i>
      </label>
    </div>
  `
}

function render () {
  var resolved = renderRows({resolved: true})
  var unresolved = renderRows({resolved: false})

  yo.update(
    document.querySelector('.watchlist-wrapper'), yo`
      <div class="watchlist-wrapper watchlist builtin-wrapper">
        <div class="builtin-main">
          <div class="builtin-sidebar">
            ${renderBuiltinPagesNav('beaker://watchlist/', 'Watchlist')}
          </div>
          
          <div>
            ${watchlist.length
              ? yo`
                <div class="ll-column-headings">
                  ${renderColumnHeading({cls: 'watchlist-item-status', label: ''})}
                  ${renderColumnHeading({cls: 'watchlist-item-title', label: 'Description'})}
                  ${renderColumnHeading({cls: 'date', label: 'Added', icon: yo`<span class="fa fa-angle-down"></span>`})}
                  <span class="buttons"></span>
                </div>`
              : ''
            }

            <div class="group">${resolved}</div>
            <div class="group">${unresolved}</div>

            ${resolved.length === 0 && unresolved.length === 0
              ? yo`
                <div class="view empty">
                  <i class="fa fa-eye"></i>
                  <p>
                    You aren${"'"}t watching for any dat sites!
                  </p>
                </div>`
              : ''
            }

            <p class="builtin-hint">
              <i class="fa fa-info-circle"></i>
              Your Watchlist contains websites you${"'"}ve asked Beaker to find for you.
              You${"'"}ll be notified when a site is found. <button class="link" onclick=${onAddToWatchlist}>Add site</button>.
            </p>
          </div>
        </div>
      </div>
    `
  )
}

// events
// =

function onToggleChecked (e, row) {
  e.stopPropagation()
  row.checked = !row.checked
  selectedItems = watchlist.filter(a => !!a.checked)
  render()
}

function onSelectAll () {
  selectedItems = watchlist.slice()
  selectedItems.forEach(a => { a.checked = true })
  render()
}

function onDeselectAll () {
  selectedItems.forEach(a => { a.checked = false })
  selectedItems = []
  render()
}

async function onAddToWatchlist () {
  var {url, description} = await addWatchlistItemPopup.create()
  addToWatchlist(url, description)
}

function onOpenItem (e, item) {
  if (item.resolved) {
    // delete if opening a resolved item
    onDelete(null, item)
  } else {
    e.preventDefault()
  }
}

async function onDelete (e, item) {
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }

  try {
    await beaker.watchlist.remove(item.url)
  } catch (e) {
    console.error(e)
    toast.create(`Could not remove site from watchlist`, 'error')
  }
  await loadWatchlist()
  render()
}

async function onDeleteSelected () {
  await Promise.all(selectedItems.map(async a => {
    a.checked = false
    try {
      await beaker.watchlist.remove(a.url)
    } catch (e) {
      toast.create(`Could not remove site from watchlist`, 'error')
    }
  }))
  selectedItems = []

  await loadWatchlist()
  render()
}
