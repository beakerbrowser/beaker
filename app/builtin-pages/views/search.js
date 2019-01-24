/* globals beaker window */

import yo from 'yo-yo'
import moment from 'moment'
import renderUserResult from '../com/search/user-result'
import renderPostResult from '../com/search/post-result'
import renderSiteResult from '../com/search/site-result'
import renderCloseIcon from '../icon/close'
import {polyfillHistoryEvents} from '../../lib/fg/event-handlers'

const LIMIT = 20

// globals
//

var currentUserSession = null
var results = []
var highlightNonce
var hasMore

// main
// =

setup()
async function setup () {
  polyfillHistoryEvents()
  window.addEventListener('pushstate', readStateFromURL)
  window.addEventListener('popstate', readStateFromURL)

  currentUserSession = await beaker.browser.getUserSession()
  readStateFromURL()
}

async function readStateFromURL () {
  console.log('running query', getParam('q'))

  var category = getCategory()
  var page = getPage()
  let res = await beaker.crawler.listSearchResults({
    user: currentUserSession.url, 
    query: getParam('q'),
    type: category === 'users' ? category : 'all',
    hops: getHops(),
    since: getSinceTS(),
    offset: (page - 1) * LIMIT,
    limit: LIMIT + 1 // get 1 more than needed to detect if more results exist
  })
  results = res.results
  highlightNonce = res.highlightNonce

  // detect hasMore
  hasMore = results.length > LIMIT
  if (hasMore) results.pop() // discard extra

  console.log('results', results)
  update()
}

function getCategory () {
  var cat = getParam('category')
  if (!cat) cat = 'all'
  return cat
}

function getPage () {
  return +(getParam('page') || 1)
}

function getHops () {
  return +(getParam('hops') || 2)
}

function getSinceTS () {
  var since = getParam('since')
  if (!since || since === 'all') return undefined
  return moment().subtract(1, since).valueOf()
}

function getParam (k) {
  return (new URL(window.location)).searchParams.get(k)
}

function setParams (kv) {
  var url = (new URL(window.location))
  for (var k in kv) {
    url.searchParams.set(k, kv[k])
  }
  window.history.pushState({}, null, url)
}

function deleteParam (k) {
  var url = (new URL(window.location))
  url.searchParams.delete(k)
  window.history.pushState({}, null, url)
}

// rendering
// =

function update () {
  const query = getParam('q') || ''
  const category = getCategory()
  const page = getPage()
  const isEmpty = !results || results.length === 0

  const renderTab = (id, label) => yo`<div class="tab ${category === id ? 'active' : ''}" onclick=${() => onClickTab(id)}>${label}</div>`

  yo.update(document.querySelector('.search-wrapper'), yo`
    <div class="search-wrapper builtin-wrapper">
      <div class="builtin-main">
        <div class="search-header">
          ${renderSearchControl()}
        </div>

        ${query
          ? yo`
            <div class="showing-results-for">
              Showing results for "${query}". <a class="link" onclick=${onClearQuery}>Clear query.</a>
            </div>`
          : ''}

        <div class="search-body">
          <div class="tabs">
            ${[
              renderTab('all', 'All'),
              renderTab('users', 'Users'),
              renderTab('pages', 'Pages'),
              renderTab('images', 'Images'),
              renderTab('videos', 'Videos'),
              renderTab('music', 'Music'),
              renderTab('podcasts', 'Podcasts'),
              renderTab('templates', 'Templates'),
              renderTab('modules', 'Modules'),
              renderTab('files', 'Files'),
              renderTab('other', 'Other')
            ]}
          </div>
          <div class="search-results-col">
            <div class="search-results">
              ${isEmpty
                ? yo`
                  <div class="empty">
                    No results${query ? ` for "${query}"` : ''}.
                    <a class="link" href="https://duckduckgo.com${query ? ('?q=' + encodeURIComponent(query)) : ''}">Try your search on DuckDuckGo <span class="fa fa-angle-double-right"></span></a>
                  </div>`
                : ''}
              ${results.map(result => {
                if (result.resultType === 'user') return renderUserResult(result, currentUserSession, highlightNonce)
                if (result.resultType === 'post') return renderPostResult(result, currentUserSession, highlightNonce)
                return renderSiteResult(result, currentUserSession, highlightNonce)
              })}
            </div>
            <div class="pagination">
              <a class="btn ${page > 1 ? '' : 'disabled'}" onclick=${onClickPrevPage}><span class="fa fa-angle-left"></span></a>
              <span class="current">${page}</span>
              <a class="btn ${hasMore ? '' : 'disabled'}" onclick=${onClickNextPage}>Next page <span class="fa fa-angle-right"></span></a>
            </div>
          </div>
          <div class="search-controls-col">
            ${renderSideControls(category, query)}
          </div>
        </div>
      </div>
    </div>`
  )
}

function renderSearchControl () {
  var query = getParam('q') || ''
  return yo`
    <div class="search-container">
      <input autofocus onkeyup=${onUpdateSearchQuery} placeholder="Search your network privately" class="search" value=${query} />
      <i class="fa fa-search"></i>
      ${query
        ? yo`
          <span onclick=${onClearQuery} class="clear-btn">
            ${renderTimes()} clear query
          </span>`
        : ''}
    </div>`
}

function renderSideControls (category, query) {
  const hops = getHops()
  const since = getParam('since') || 'all'
  var ctrls = []

  ctrls.push(yo`
    <button class="btn primary thick full-width">
      Create a post
    </button>`
  )

  ctrls.push(yo`
    <div class="search-sidecontrol">
      <h3>Filters</h3>
      ${renderRadio({
        onclick ({id}) {
          setParams({hops: id})
        },
        current: hops,
        items: [
          {id: 2, label: 'All of your network'},
          {id: 1, label: 'Followed users'}
        ]
      })}
    </div>`
  )

  ctrls.push(yo`
    <div class="search-sidecontrol">
      ${renderRadio({
        onclick ({id}) {
          setParams({since: id})
        },
        current: since,
        items: [
          {id: 'all', label: 'All time'},
          {id: 'day', label: 'Past day'},
          {id: 'week', label: 'Past week'},
          {id: 'month', label: 'Past month'},
          {id: 'year', label: 'Past year'}
        ]
      })}
    </div>`
  )

  if (query) {
    ctrls.push(yo`
      <div class="alternative-engines">
        <div>Try other search engines:</div>
        <ul>
          <li><a class="link" href="https://duckduckgo.com${query ? '?q=' + encodeURIComponent(query) : ''}" target="_blank"><span class="fas fa-search"></span> DuckDuckGo</a></li>
          <li><a class="link" href="https://google.com/search${query ? '?q=' + encodeURIComponent(query) : ''}" target="_blank"><span class="fab fa-google"></span> Google</a></li>
          <li><a class="link" href="https://twitter.com/search${query ? '?q=' + encodeURIComponent(query) : ''}" target="_blank"><span class="fab fa-twitter"></span> Twitter</a></li>
          <li><a class="link" href="https://reddit.com/search${query ? '?q=' + encodeURIComponent(query) : ''}" target="_blank"><span class="fab fa-reddit-alien"></span> Reddit</a></li>
          <li><a class="link" href="https://github.com/search${query ? '?q=' + encodeURIComponent(query) : ''}" target="_blank"><span class="fab fa-github-alt"></span> GitHub</a></li>
        </ul>
      </div>`
    )
  }

  return ctrls
}

function renderRadio ({onclick, current, items}) {
  const renderItem = item => yo`<li class=${item.id === current ? 'active' : ''} onclick=${() => onclick(item)}><span class="fas fa-check"></span> ${item.label}</li>`
  return yo`<ul class="radio">${items.map(renderItem)}</ul>`
}

function renderTimes () {
  var el = yo`<span></span>`
  el.innerHTML = '&times;'
  return el
}

// event handlers
// =

function onClickPrevPage (e) {
  var page = (getPage())
  if (page <= 1) return
  setParams({
    page: page - 1
  })
}

function onClickNextPage (e) {
  if (!hasMore) return
  setParams({
    page: (getPage()) + 1
  })
}

function onUpdateSearchQuery (e) {
  if (e.key === 'Enter') {
    setParams({
      q: e.target.value.toLowerCase(),
      category: getCategory()
    })
  }
}

function onClickTab (category) {
  setParams({category})
}

function onClickSearch () {
  setParams({
    q: document.querySelector('.search-container .search').value.toLowerCase(),
    category: getCategory()
  })
}

function onClearQuery () {
  deleteParam('q')
}
