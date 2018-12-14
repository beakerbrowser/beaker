/* globals beaker */

import yo from 'yo-yo'
import renderBuiltinPagesHeader from '../com/builtin-pages-header'
import renderUserCard from '../com/user-card'

// globals
//

var currentUserSession = null
var follows
var foafs

// main
// =

setup()
async function setup () {
  currentUserSession = await beaker.browser.getUserSession()
  ;[follows, foafs] = await Promise.all([
    beaker.followgraph.listFollows(currentUserSession.url, {includeDesc: true, includeFollowers: true}),
    beaker.followgraph.listFoaFs(currentUserSession.url)
  ])
  update()
}

// rendering
// =

function update () {
  yo.update(document.querySelector('.search-wrapper'), yo`
    <div class="search-wrapper builtin-wrapper">
      ${renderBuiltinPagesHeader('Search', currentUserSession)}

      <div class="builtin-main">
        <h3 class="subtitle-heading">Users</h3>
        <div class="user-cards">
          ${follows.map(f => renderUserCard(f, currentUserSession))}
          ${foafs.map(f => renderUserCard(f, currentUserSession))}
        </div>
        <div style="background: #fff; padding: 20px; border: 1px solid #ddd">
          <h3 class="subtitle-heading">Pre-release note</h3>
          <div>This page is still in progress. For now, it only lists users in your network.</div>
        </div>
      </div>
    </div>`
  )
}

// event handlers
// =
