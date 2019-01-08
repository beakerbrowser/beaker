/* globals beaker window */

import yo from 'yo-yo'
import renderUserCard from '../com/user-card'
import renderCloseIcon from '../icon/close'
import {polyfillHistoryEvents} from '../../lib/fg/event-handlers'

// globals
//

var currentUserSession = null
var follows
var foafs

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
  // TODO
  ;[follows, foafs] = await Promise.all([
    beaker.followgraph.listFollows(currentUserSession.url, {includeDesc: true, includeFollowers: true}),
    beaker.followgraph.listFoaFs(currentUserSession.url)
  ])
  update()
}

function getParam (k) {
  return (new URL(window.location)).searchParams.get(k)
}

function setParam (k, v) {
  var url = (new URL(window.location))
  url.searchParams.set(k, v)
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
  var hasParam = getParam('q') || getParam('cat')
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
          <a href="beaker://search?cat=people" class="link">People</a>,
          <a href="beaker://search?cat=posts" class="link">Posts</a>
        </div>
      </div>
    </div>`
}

function renderSearchResults () {
  var query = getParam('q')
  var category = getParam('cat')
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
            ${follows.map(f => renderUserCard(f, currentUserSession))}
            ${foafs.map(f => renderUserCard(f, currentUserSession))}
            ${follows.map(f => renderUserCard(f, currentUserSession))}
            ${foafs.map(f => renderUserCard(f, currentUserSession))}
            ${follows.map(f => renderUserCard(f, currentUserSession))}
            ${foafs.map(f => renderUserCard(f, currentUserSession))}
          </div>
          <div class="pagination">
            <a class="btn"><span class="fa fa-angle-left"></span></a>
            <span class="current">1</span>
            <a class="btn">More results <span class="fa fa-angle-right"></span></a>
            ${query
              ? yo`
                <span class="showing-results-for">
                  Showing results for "${query}".
                  <a class="link" href="https://duckduckgo.com?q=${encodeURIComponent(query)}">Try your search on DuckDuckGo <span class="fa fa-angle-double-right"></span></a>
                </span>`
              : ''}
          </div>
        </div>
        <div class="search-controls-col">
          <div class="search-sidecontrol">
            <ul class="radio">
              <li class="active"><span class="fas fa-check"></span> All time</li>
              <li><span class="fas fa-check"></span> Past day</li>
              <li><span class="fas fa-check"></span> Past week</li>
              <li><span class="fas fa-check"></span> Past month</li>
              <li><span class="fas fa-check"></span> Past year</li>
            </ul>
          </div>
          <div class="search-sidecontrol">
            <ul class="radio">
              <li class="active"><span class="fas fa-check"></span> All of your network</li>
              <li><span class="fas fa-check"></span> Followed users</li>
            </ul>
          </div>
          ${query
            ? yo`
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
              </div>`
            : ''}
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

// event handlers
// =

function onUpdateSearchQuery (e) {
  if (e.key === 'Enter') {
    setParam('q', e.target.value.toLowerCase())
  }
}

function onClickSearch () {
  setParam('q', document.querySelector('.search-container .search').value.toLowerCase())
}

function onClearQuery () {
  deleteParam('q')
}
