/*
This uses the beaker.bookmarks API, which is exposed by webview-preload to all
sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import {niceDate} from '../../lib/time'

window.DatProfileSite = require('dat-profile-site')

const LATEST_VERSION = 6001 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001

// globals
// =

var builtinPages = [
  { href: 'beaker://history', label: 'History', icon: 'history', color: 'teal' },
  { href: 'beaker://bookmarks', label: 'Bookmarks', icon: 'star', color: 'yellow' },
  { href: 'beaker://settings', label: 'Settings', icon: 'gear', color: 'pink'},
  { href: 'beaker://editor', label: 'Editor', icon: 'pencil', color: 'blue' },
  { href: 'beaker://downloads', label: 'Downloads', icon: 'download', color: 'purple' },
  { href: 'https://beakerbrowser.com/docs', label: 'Help', icon: 'question', color: 'orange' }
]

var showReleaseNotes = false
var isAddingPin = false
var bookmarks, pinnedBookmarks, archivesList

co(function* () {
  bookmarks = (yield beaker.bookmarks.list()) || []
  pinnedBookmarks = (yield beaker.bookmarks.list({pinned: true})) || []
  archivesList = (yield beaker.archives.list({isSaved: true})) || []
  update()

  let latestVersion = yield beakerSitedata.get('beaker://start', 'latest-version')
  if (+latestVersion < LATEST_VERSION) {
    showReleaseNotes = true
    update()
    beakerSitedata.set('beaker://start', 'latest-version', LATEST_VERSION)
  }
})

// rendering
// =

function update () {
  yo.update(document.querySelector('main'), yo`
    <main>
      ${renderHeader()}

      <div class="grid">
        <div class="feed-container">
          ${renderPostForm()}
          <h2>Your feed</h2>
          ${renderFeed()}
        </div>
        <div class="sidebar">
          <div class="buttons">
            <button class="btn thick">Share a file<i class="fa fa-file-text-o"></i></button>
          </div>
          ${ pinnedBookmarks.length ? renderPinnedBookmarks() : '' }
          ${renderArchivesList()}
        </div>
      </div>

      ${renderReleaseNotes()}
    </main>
  `)
}

function renderHeader () {
  return yo`
    <header>
      ${renderPinned()}
      ${renderSocialHeader()}
    </header>
  `
}

function renderArchivesList () {
  return yo`
    <div class="sidebar-component">
      <div class="title">
        <h2>Your archives</h2>
        <a class="action">
          Create a new site
          <i class="fa fa-plus"></i>
        </a>
      </div>
      <ul class="links-list">
        ${archivesList.map(renderArchive)}
      </ul>
      ${renderEditorPrompt()}
    </div>
  `
}

function renderArchive (archive) {
  console.log(archive)
  var {url, title, key} = archive

  return yo`
    <li class="ll-row">
      <a class="link" href=${url} title=${title}>
        <i class="favicon fa fa-folder-o"></i>
        <span class="title">${title}</span>
        <span class="url">${url}</span>
      </a>
      <div class="actions">
        <a href="beaker://editor/${key}">
          <i class="fa fa-pencil"></i>
        </a>
      </div>
    </li>
  `
}

function renderEditorPrompt () {
  if (!archivesList.length) {
    return yo`
      <p>You don’t have any archives. Get started by <a href="">creating one from a template</a>.
    `
  }
}

function renderPinBookmarkForm () {
  if (isAddingPin) {
    return renderBookmarks()
  }
}

function renderPinnedBookmarks () {
  var icon = isAddingPin ? 'close' : 'plus'

  return yo`
    <div class="sidebar-component pinned-bookmarks">
      <div class="title">
        <h2>Pinned bookmarks</h2>
        <a class="action add-pin-link" onclick=${toggleAddPin}>
          ${ isAddingPin ? 'Close bookmarks' : 'Pin a bookmark' }
          <i class="fa fa-${icon}"></i>
        </a>
      </div>

      <ul class="links-list">
        ${pinnedBookmarks.map(renderPinnedBookmark)}
        ${renderPinBookmarkForm()}
      </ul>
    </div>
  `
}

function renderFeed () {
  if (updates.length) {
    return yo`
      <ul class="feed">
        ${updates.map(renderUpdate)}
      </ul>
    `
  } else {
    return yo`
      <p class="feed">
        No updates.
      </p>
    `
  }
}

function renderUpdate (update) {
  return yo`
    <li class="update">
      <img src=${update.avatar}/ class="avatar"/>
      <div class="container">
        <div class="metadata">
          <span class="name">${update.name}</span>
          <a href="/"><span class="date">${niceDate(update.date)}</span></a>
        </div>
        <p class="content">${update.content}</p>
      </div>
    </li>
  `
}

function renderSocialHeader () {
  return yo`
    <div class="social-header">
      <a href="/">Tara Vancil</a>
      <img class="avatar" src="https://pbs.twimg.com/profile_images/772121822481354752/kb41H-gR_400x400.jpg"/>
    </div>
  `
}

function renderPostForm () {
  // var cls = isEditingPost ? 'active' : ''

  return yo`
    <form id="new-post">
      <textarea placeholder="Post an update"></textarea>
      <input type="submit" value="Post to feed" class="btn primary" />
    </form>
  `
}

function renderReleaseNotes () {
  if (!showReleaseNotes) {
    return ''
  }
  return yo`
    <div class="alert alert__info alert__release-notes">
      <strong>Welcome to Beaker 0.6.1!</strong>
      New start page, Dat-DNS, and an improved bkr command-line.
      <a href="https://github.com/beakerbrowser/beaker/releases/tag/0.6.1">Learn more</a>
    </div>
  `
}

function renderPinned () {
  const pinCls = isAddingPin ? ' adding' : ''

  return yo`
    <div class="builtin-pages">
      ${builtinPages.map(renderBuiltinPage)}
    </div>
  `
}

var updates = [
  { name: '1337haxor',
    avatar: 'https://pbs.twimg.com/profile_images/787519608794157057/dDnFKms0_400x400.jpg',
    content: '<script>alert(1);</script>',
    date: Date.now()
  },
  { name: 'Paul Frazee',
    avatar: 'https://pbs.twimg.com/profile_images/822287293910134784/8Ho9TSEQ_400x400.jpg',
    content: 'Tara gives the best kisses.',
    date: Date.now() - 1e5
  },
  { name: 'Catmapper',
    avatar: 'https://scontent-dft4-1.cdninstagram.com/t51.2885-19/s320x320/15625367_898987853571642_5241746154403659776_a.jpg',
    content: 'Patrolling the streets of Portland looking for cats.',
    date: Date.now() - 1e6
  },
  { name: 'Beaker Browser',
    avatar: 'https://pbs.twimg.com/profile_images/779394213062451202/3wulCYBi_400x400.jpg',
    content: 'Check out what\'s coming up in v0.7! A builtin editor, markdown sites, and more.',
    date: Date.now() - 1e7
  },
  { name: 'Mathias Buus',
    avatar: 'https://pbs.twimg.com/profile_images/788479487390412800/oTdpaOev_400x400.jpg',
    content: 'The newest release of hypercore will be so good. Way faster.',
    date: Date.now() - 1e8
  },
  { name: 'Maxwell Ogden',
    avatar: 'https://pbs.twimg.com/profile_images/706616363599532032/b5z-Hw5g_400x400.jpg',
    content: 'Submit an application to the Knight foundation prototype fund.',
    date: Date.now() - 1e9
  },
  { name: 'Dat Project',
    avatar: 'https://pbs.twimg.com/profile_images/794335424940343296/xyrU8_HA_400x400.jpg',
    content: 'We just released Dat Desktop, a tool for managingi Dats on your desktop, duh.',
    date: Date.now() - 1e10
  },
  { name: 'Beyonce',
    avatar: 'https://pbs.twimg.com/profile_images/724054682579161088/3GgLeR65_400x400.jpg',
    content: 'I have three hearts.',
    date: Date.now() - 1e11
  }
]

function renderBookmarks () {
  if (!isAddingPin) {
    return ''
  }

  const renderRow = (row, i) =>
    yo`
      <li class="ll-row" data-row=${i} onclick=${pinBookmark(i)}>
        <a class="link bookmark__link" href=${row.url} title=${row.title} />
          <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.url} />
          <span class="title bookmark__title">${row.title}</span>
        </a>
      </li>`

  return yo`
    <div class="bookmarks">
      <form id="add-pinned-site" onsubmit=${pinSite}>
        <legend>Add a new site or select a bookmark</legend>
        <input name="url" type="text" placeholder="https://example.com" required autofocus="autofocus" />
        <input type="submit" value="Add" class="btn primary">
      </form>
      ${bookmarks.map(renderRow)}
    </div>
  `
}

function renderBuiltinPage (item) {
  // render items
  var { href, label, icon, color } = item

  return yo`
    <a class="pinned-item ${color} builtin" href=${href}>
      <i class="fa fa-${icon}" aria-hidden="true"></i>
      <div class="label">${label}
    </a>`
}

function renderPinnedBookmark (bookmark) {
  var { url, title } = bookmark

  return yo`
    <li class="ll-row ll-link pinned-bookmark" href=${url}>
      <a class="link" href=${url} title=${title}>
        <img class="favicon" src=${'beaker-favicon:' + url} />
        <span class="title">${title}</span>
        <span class="url">${url}</span>
      </a>
      <div class="actions">
        <i class="fa fa-close" data-url=${url} onclick=${unpinSite}></i>
      </div>
    </li>
  `
}

function toggleAddPin (url, title) {
  isAddingPin = !isAddingPin
  update()
}

function pinBookmark (i) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    var b = bookmarks[i]
    beaker.bookmarks.add(b.url, b.title, 1).then(() => {
      return beaker.bookmarks.list({pinned: true})
    }).then(pinned => {
      pinnedBookmarks = pinned
      isAddingPin = false
      update()
    })
  }
}

function pinSite (e) {
  e.preventDefault()

  var form = document.getElementById('add-pinned-site')
  var { url } = form.elements

  if (!url) return

  // attempt to make a nice title
  // TODO: temporary solution, this will clutter the bookmarks database
  // with duplicates -tbv
  var title = url.value
  try {
    title = title.split('://')[1] || url.value
  } catch (e) {}

  // add https:// to sites entered without a protocol
  url = url.value
  if (!(url.startsWith('http') || url.startsWith('dat://'))) {
    url = 'https://' + url
  }

  beaker.bookmarks.add(url, title, 1).then(() => {
    beaker.bookmarks.list({pinned: true}).then(pinned => {
      pinnedBookmarks = pinned
      toggleAddPin()
      update()
    })
  })
}

function unpinSite (e) {
  e.preventDefault()
  beaker.bookmarks.togglePinned(e.target.dataset.url, true)

  beaker.bookmarks.list({pinned: true}).then(pinned => {
    pinnedBookmarks = pinned
    update()
  })
}
