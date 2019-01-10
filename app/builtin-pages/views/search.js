/* globals beaker window */

import yo from 'yo-yo'
import renderUserCard from '../com/user-card'
import renderCloseIcon from '../icon/close'
import {polyfillHistoryEvents} from '../../lib/fg/event-handlers'

const LIMIT = 20

// globals
//

var currentUserSession = null
var results = []
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

  var category = getParam('category') || 'people'
  var page = getPage()
  results = await beaker.crawler.listSearchResults({
    user: currentUserSession.url, 
    query: getParam('q'),
    type: {[category]: true},
    hops: getHops(),
    offset: (page - 1) * LIMIT,
    limit: LIMIT + 1 // get 1 more than needed to detect if more results exist
  })

  // detect hasMore
  hasMore = results[category].length > LIMIT
  if (hasMore) results[category].pop() // discard extra

  console.log('results', results)
  update()
}

function getPage () {
  return +(getParam('page') || 1)
}

function getHops () {
  return +(getParam('hops') || 2)
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
  var hasParam = getParam('q') || getParam('category')
  yo.update(document.querySelector('.search-wrapper'), yo`
    <div class="search-wrapper builtin-wrapper">
      ${hasParam ? renderSearchResults() : renderSearchPrompt()}
    </div>`
  )
}

function renderSearchPrompt () {
  return yo`
    <div class="builtin-main">
      <div class="search-header noquery">
        <div class="brand"><img src="beaker://assets/logo.png"></div>
        ${renderSearchControl()}
        <div class="search-actions">
          <a class="btn thick" onclick=${onClickSearch}>Search Beaker</a>
        </div>
        <div class="browse-links">
          Browse:
          <a href="beaker://search?category=people" class="link">People</a>,
          <a href="beaker://search?category=posts" class="link">Posts</a>
        </div>
      </div>
    </div>`
}

function renderSearchResults () {
  var query = getParam('q') || ''
  var category = getParam('category')
  var page = getPage()
  return  yo`
    <div class="builtin-main">
      <div class="search-header">
        ${renderSearchControl()}
      </div>

      <div class="search-body">
        <div class="search-results-col">
          <div class="tabs">
            <div class="tab active">People</div>
            <div class="tab">Posts</div>
          </div>
          ${query
            ? yo`<div>
              <div class="showing-results-for">
                Showing results for "${query}".
                <a class="link" href="https://duckduckgo.com?q=${encodeURIComponent(query)}">Try your search on DuckDuckGo <span class="fa fa-angle-double-right"></span></a>
              </div>`
            : ''}
          <div class="user-cards">
            ${results.people.map(f => renderUserCard(f, currentUserSession, results.highlightNonce))}
          </div>
          <div class="pagination">
            <a class="btn ${page > 1 ? '' : 'disabled'}" onclick=${onClickPrevPage}><span class="fa fa-angle-left"></span></a>
            <span class="current">${page}</span>
            <a class="btn ${hasMore ? '' : 'disabled'}" onclick=${onClickNextPage}>More results <span class="fa fa-angle-right"></span></a>
          </div>
        </div>
        <div class="search-controls-col">
          ${renderSideControls()}
          <div class="alternative-engines">
            <div>Try other search engines:</div>
            <ul>
              <li><a class="link" href="https://google.com/search?q=${encodeURIComponent(query)}" target="_blank"><span class="fab fa-google"></span> Google</a></li>
              <li><a class="link" href="https://duckduckgo.com?q=${encodeURIComponent(query)}" target="_blank"><span class="fas fa-search"></span> DuckDuckGo</a></li>
              <li><a class="link" href="https://bing.com/search?q=${encodeURIComponent(query)}" target="_blank"><span class="fas fa-search"></span> Bing</a></li>
              <li><a class="link" href="https://twitter.com/search?q=${encodeURIComponent(query)}" target="_blank"><span class="fab fa-twitter"></span> Twitter</a></li>
              <li><a class="link" href="https://reddit.com/search?q=${encodeURIComponent(query)}" target="_blank"><span class="fab fa-reddit-alien"></span> Reddit</a></li>
              <li><a class="link" href="https://github.com/search?q=${encodeURIComponent(query)}" target="_blank"><span class="fab fa-github-alt"></span> GitHub</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>`
}

function renderSearchControl () {
  return yo`
    <div class="search-container">
      <input autofocus onkeyup=${onUpdateSearchQuery} placeholder="Search your network privately" class="search" value=${getParam('q') || ''} />
      <i class="fa fa-search"></i>
    </div>`
}

function renderSideControls (category) {
  var ctrls = []

  if (category === 'posts') {
    ctrls.push(yo`
      <div class="search-sidecontrol">
        <ul class="radio">
          <li class="active"><span class="fas fa-check"></span> All time</li>
          <li><span class="fas fa-check"></span> Past day</li>
          <li><span class="fas fa-check"></span> Past week</li>
          <li><span class="fas fa-check"></span> Past month</li>
          <li><span class="fas fa-check"></span> Past year</li>
        </ul>
      </div>`
    )    
  }

  var hops = getHops()
  ctrls.push(yo`
    <div class="search-sidecontrol">
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

  return ctrls
}

function renderRadio ({onclick, current, items}) {
  const renderItem = item => yo`<li class=${item.id === current ? 'active' : ''} onclick=${() => onclick(item)}><span class="fas fa-check"></span> ${item.label}</li>`
  return yo`<ul class="radio">${items.map(renderItem)}</ul>`
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
      category: getParam('category') || 'people'
    })
  }
}

function onClickSearch () {
  setParams({
    q: document.querySelector('.search-container .search').value.toLowerCase(),
    category: getParam('category') || 'people'
  })
}

function onClearQuery () {
  deleteParam('q')
}
