/* globals DatArchive beaker confirm localStorage */

import yo from 'yo-yo'
import {niceDate} from '../../lib/time'
import * as toast from '../com/toast'
import renderBuiltinPagesNav from '../com/builtin-pages-nav'
import toggleable from '../com/toggleable'
import renderCloseIcon from '../icon/close'

// globals
// =

// watchlist, cached in memory
let watchlist = []
let resolvedList = []
let unresolvedList = []
let selectedSites = []
let query = ''
let type = 'resolved'
let currentSort = ['alpha', -1]
let wlEvents = beaker.watchlist.createEventsStream()
let seedWhenResolved = false

// main
// =

setup()
async function setup () {
  loadSettings()
  await loadWatchlist()
  render()

  // watchlist events
  wlEvents.addEventListener('updated', async () => {
    await loadWatchlist()
    render()
  })
}

// data
// =

function loadSettings () {
  currentSort[0] = localStorage.currentSortValue || 'alpha'
  currentSort[1] = (+localStorage.currentSortDir) || -1
}

function saveSettings () {
  localStorage.currentSortValue = currentSort[0]
  localStorage.currentSortDir = currentSort[1]
}

async function loadWatchlist () {
  watchlist = await beaker.watchlist.list()

  // apply search query
  filterWatchlist()
  resolvedList = watchlist.filter(item => item.resolved == 1)
  unresolvedList = watchlist.filter(item => item.resolved == 0)

  // apply sort
  sortWatchlist()
}

function filterWatchlist () {
  if (query && query.length) {
    watchlist = watchlist.filter(a => {
      if (a.description && a.description.toLowerCase().includes(query)) {
        return a
      }
    })
  }
}

function sortWatchlist () {
  var list = type === 'resolved' ? resolvedList : unresolvedList
  list.sort((a, b) => {
    var v
    switch (currentSort[0]) {
      case 'recently-added': v = a.createdAt - b.createdAt; break
      case 'alpha':
      default:
        v = (b.description || '').localeCompare(a.description || '')
    }
    return v * currentSort[1]
  })
}

// rendering
// =

function renderColumnHeading ({label, cls, sort, type}) {
  const icon = currentSort[0] === sort
    ? currentSort[1] > 0
      ? yo`<span class="fa fa-angle-up"></span>`
      : yo`<span class="fa fa-angle-down"></span>`
    : ''

  return yo`
    <div class="column-heading ${cls}">
      <button class="nofocus" onclick=${e => onUpdateSort(sort, type)}>
        ${label}
      </button>
      ${icon}
    </div>
  `
}

function renderRows (type, sort = '') {
  let a = []
  // Check if rendering resolved table or unresolved, filter watchlist accordingly
  if (type === 'resolved') a = Array.from(resolvedList)
  if (type === 'unresolved') a = Array.from(unresolvedList)

  if (!a.length) {
    return type === 'resolved' ? yo`
      <div class="view empty">
        ${query
          ? yo`<i class="fa fa-search"></i>`
          : yo`<i class="fa fa-frown"></i>`
        }

        <p>
          ${query
            ? `No results for "${query}"`
            : `No archives from your watchlist are online!`
          }
        </p>
      </div>` : yo`
      <div class="view empty">
        ${query
          ? yo`<i class="fa fa-search"></i>`
          : yo`<i class="fa fa-eye"></i>`
        }

        <p>
          ${query
            ? `No results for "${query}"`
            : `You aren't watching any archives!`
          }
        </p>
      </div>
      `
  }
  return a.map(renderRow)
}

function renderRow (row, i) {
  let utcSeconds = row.createdAt
  let date = new Date(0)
  date.setUTCSeconds(utcSeconds)

  return yo`
    <a
      href="${row.url}"
      class="ll-row archive ${row.checked ? 'selected' : ''}"
    >
      <span class="description">
        <img class="favicon" src="beaker-favicon:32,${row.url}" />
        <span class="description">${row.description}</span>
      </span>

      <span class="date">
        ${date ? niceDate(date) : '--'}
      </span>

      <span class="seed">
        <label class="toggle">
          <input checked=${Boolean(row.seedWhenResolved)} type="checkbox" onchange=${(e) => onToggleSeed(e, row)} />
          <div class="switch"></div>
        </label>
      </span>

      <div class="buttons">
        <button class="btn plain trash" onclick=${e => onDelete(e, row)} title="Remove from Watchlist">
          <i class="fa fa-trash-o"></i>
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
  yo.update(
    document.querySelector('.watchlist-wrapper'), yo`
      <div class="watchlist-wrapper watchlist builtin-wrapper">
        ${renderHeader()}

        <div class="builtin-main">
          <h1>Resolved Pages</h1>
          <div>
            ${resolvedList.length
              ? yo`
                <div class="ll-column-headings">
                  ${renderColumnHeading({cls: 'description', sort: 'alpha', type: 'resolved', label: 'Description'})}
                  ${renderColumnHeading({cls: 'date', sort: 'recently-added', label: `Added`})}
                  <div class="column-heading seed">
                    <label>Seed When Resolved</label>
                  </div>
                  <span class="buttons"></span>
                </div>`
              : ''
            }

          ${renderRows('resolved')}

          <h1>Still Watching</h1>
            <div>
              ${unresolvedList.length
                ? yo`
                  <div class="ll-column-headings">
                    ${renderColumnHeading({cls: 'description', sort: 'alpha', type: 'unresolved', label: 'Description'})}
                    ${renderColumnHeading({cls: 'date', sort: `recently-added`, label: `Added`})}
                    <div class="column-heading seed">
                      <label>Seed When Resolved</label>
                    </div>
                    <span class="buttons"></span>
                  </div>`
                : ''
              }

            ${renderRows('unresolved')}

            ${!query
              ? yo`
                <p class="builtin-hint">
                  Your Watchlist contains websites and archives 
                  you've asked Beaker to keep an eye on for you.
                  <i class="fa fa-question-circle-o"></i>
                </p>`
              : ''
            }
          </div>
        </div>
      </div>
    `
  )
}

function renderHeader () {
  let actions = ''
  let searchContainer = ''

  if (selectedSites && selectedSites.length) {
    actions = yo`
      <div class="actions">
        <button class="btn transparent" onclick=${onSelectAll}>
          Select all
        </button>
        |
        <button class="btn transparent" onclick=${onDeselectAll}>
          Deselect all
        </button>

        <button class="btn warning" onclick=${onDeleteSelected}>
          Stop Watching
        </button>
      </div>`

    searchContainer = ''
  } else {
    actions = yo`
      <div class="actions">
        ${toggleable(yo`
          <div class="watchlist-modal toggleable-container">
            <button class="btn primary toggleable">
              <span>Add</span>
              <i class="fa fa-plus"></i>
            </button>
            <div class="modal-container subtle-shadow">
              <div class="watchlist-input">
                <input type="text" id="url" name="url" placeholder="dat:// url to watch">
                <label class="validate" id="validateUrl">Error</label>
              </div>
              <div class="watchlist-input">
                <input type="text" id="description" name="description" placeholder="Description of dat" maxlength=100 onkeyup=${characterCount}">
                <label id="counter" for="description">180</label>
                <label class="validate" id="validateDesc">Error</label>
              </div>
              <label class="toggle">
                <input checked="false" type="checkbox" onchange=${() => { seedWhenResolved = !seedWhenResolved }} />
                <div class="switch"></div>
                <span class="text">
                  Seed When Resolved
                </span>
              </label>
              <button class="btn primary" onclick=${addToWatchlist}>
                <span>Add to Watchlist</span>
                <i class="fa fa-eye"></i>
              </button>
            </div>
          </div>
        `)}
      </div>`

    searchContainer = yo`
      <div class="search-container">
        <input required autofocus onkeyup=${onUpdateSearchQuery} placeholder="Search your Watchlist" type="text" class="search"/>

        <span onclick=${onClearQuery} class="close-btn">
          ${renderCloseIcon()}
        </span>

        <i class="fa fa-search"></i>

        <div class="filter-btn">
          ${toggleable(yo`
            <div class="dropdown toggleable-container">
              <button class="btn transparent toggleable">
                <i class="fa fa-filter"></i>
              </button>

              <div class="dropdown-items filters with-triangle compact subtle-shadow right">
                <div class="section">
                  <div class="section-header">Sort by:</div>

                  <div
                    class="dropdown-item ${currentSort[0] === 'alpha' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('alpha')}
                  >
                    ${currentSort[0] === 'alpha' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Alphabetical</span>
                  </div>

                  <div
                    class="dropdown-item ${currentSort[0] === 'recently-added' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('recently-added')}
                  >
                    ${currentSort[0] === 'recently-added' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Recently added</span>
                  </div>

                </div>
              </div>
            </div>
          `)}
        </div>
      </div>`
  }

  return yo`
    <div class="builtin-header fixed">
      ${renderBuiltinPagesNav('Watchlist')}
      ${searchContainer}
      ${actions}
    </div>`
}

// events
// =

function onToggleSeed (e, row) {
  e.stopPropagation()
  row.seedWhenResolved = !row.seedWhenResolved

  beaker.watchlist.update(row, {seedWhenResolved: row.seedWhenResolved})
}

function onToggleChecked (e, row) {
  e.stopPropagation()
  row.checked = !row.checked
  selectedSites = watchlist.filter(a => !!a.checked)
  render()
}

function onSelectAll () {
  selectedSites = watchlist.slice()
  selectedSites.forEach(a => { a.checked = true })
  render()
}

function onDeselectAll () {
  selectedSites.forEach(a => { a.checked = false })
  selectedSites = []
  render()
}

async function addToWatchlist () {
  let url = document.getElementById('url').value.toLowerCase()
  let description = document.getElementById('description').value

  if (validate(url, description)) {
    try {
      await beaker.watchlist.add(url, {description: description, seedWhenResolved: seedWhenResolved})
      await loadWatchlist()
      render()
    } catch (e) {
      console.error(e)
      toast.create(e, 'error')
    }
  } else {
    return
  }
}

async function onDelete (e, archive) {
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }

  try {
    await beaker.watchlist.remove(archive.url)
  } catch (e) {
    console.error(e)
    toast.create(`Could not remove site from watchlist`, 'error')
  }
  await loadWatchlist()
  render()
}

async function onDeleteSelected () {
  await Promise.all(selectedSites.map(async a => {
    a.checked = false
    try {
      await beaker.watchlist.remove(a.url)
    } catch (e) {
      toast.create(`Could not remove site from watchlist`, 'error')
    }
  }))
  selectedSites = []

  await loadWatchlist()
  render()
}

async function onUpdateSearchQuery (e) {
  var newQuery = e.target.value.toLowerCase()
  if (newQuery !== query) {
    query = newQuery
    await loadWatchlist()
    render()
  }
}

async function onClearQuery () {
  try {
    document.querySelector('input.search').value = ''
  } catch (_) {}

  query = ''
  await loadWatchlist()
  render()
}

function characterCount (e) {
  // get description value to calculate length
  let textVal = document.getElementById('description').value

  // take maxLength of src element so this will work by just changing maxLength attribute on element
  let count = (e.srcElement.maxLength - (textVal.length))

  // get counter label and apply new count
  let counter = document.getElementById('counter')
  counter.textContent = count
}

function onUpdateSort (sort, type, direction = false, {noSave} = {}) {
  if (!direction) {
    // invert the direction if none is provided and the user toggled same sort
    direction = (currentSort[0] === sort) ? (currentSort[1] * -1) : -1
  }
  currentSort[0] = sort
  currentSort[1] = direction
  if (!noSave) {
    saveSettings()
  }
  sortWatchlist()
  render()
}

// helper gets the offsetTop relative to the document
function getTop (el) {
  let top = 0
  do {
    top += el.offsetTop
  } while ((el = el.offsetParent))
  return top
}

function validate (url, description) {
  let urlError = document.getElementById('validateUrl')
  let descError = document.getElementById('validateDesc')
  let urlRegex = /dat?:\/\//
  let descRegex = /^[ A-Za-z0-9_@./#&+-]*$/

  urlError.style.opacity = 0
  descError.style.opacity = 0

  if (url !== '' && urlRegex.test(url) && description !== '' && descRegex.test(description)) {
    urlError.style.opacity = 0
    descError.style.opacity = 0
    return true
  }

  if (url === '') {
    urlError.textContent = 'Please enter a site.'
    urlError.style.opacity = 1
    return false
  }
  if (!urlRegex.test(url)) {
    urlError.textContent = 'Please enter a valid dat:// url'
    urlError.style.opacity = 1
    return false
  }
  if (description === '') {
    descError.textContent = 'Please enter a description.'
    descError.style.opacity = 1
    return false
  }
  if (!descRegex.test(description)) {
    descError.textContent = 'Alphanumeric description only'
    descError.style.opacity = 1
    return false
  }
}
