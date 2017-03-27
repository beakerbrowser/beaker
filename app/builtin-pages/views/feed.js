/*
This uses the beaker.bookmarks API, which is exposed by webview-preload to all
sites loaded over the beaker: protocol
*/

import choo from 'choo'
import html from 'choo/html'
import DatProfileSite from 'dat-profile-site'
import {niceDate} from '../../lib/time'
import {pluralize} from '../../lib/strings'

// globals
// =


// DEBUG
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

var profileDat
var app = choo()
app.use(newPostStore)
app.route('/', mainView)
app.route('/profile/:key', profileView)
app.route('/follows/:key', followsView)
app.route('/edit-profile', editProfileView)

setup()
async function setup () {
  // read profile
  profileDat = new DatProfileSite((await beaker.profiles.get(0)).url)
  profileDat.profile = await profileDat.getProfile()
  if ((profileDat.profile.image || '').startsWith('/')) {
    profileDat.profile.image = profileDat.url + profileDat.profile.image
  }
  profileDat.profile.follows = profileDat.profile.follows || []

  app.mount('main')
}

// views
// =

function mainView (state, emit) {
  return html`
    <main>
      <div class="grid">
        <div class="feed-container">
          ${renderPostForm(state, emit)}
          <h2>Your feed</h2>
          ${renderFeed()}
        </div>
        <div class="sidebar">
          ${renderProfile()}
        </div>
      </div>
    </main>
  `
}

function profileView (state, emit) {
  return html`
    <main>
      <div class="grid">
        <div class="feed-container">
          <a href="#">Back to feed</a><br />
          TODO: posts of ${state.params.key}
        </div>
        <div class="sidebar">
        </div>
      </div>
    </main>
  `
}

function followsView (state, emit) {
  return html`
    <main>
      <div class="grid">
        <div class="feed-container">
          <a href="#">Back to feed</a><br />
          TODO: follows of ${state.params.key}
        </div>
        <div class="sidebar">
        </div>
      </div>
    </main>
  `
}

function editProfileView (state, emit) {
  return html`
    <main>
      <div class="grid">
        <div class="feed-container">
          ${renderPostForm(state, emit)}
          <h2>Your feed</h2>
          ${renderFeed()}
        </div>
        <div class="sidebar">
          Todo edit profile
          <a href="#">Back</a>
        </div>
      </div>
    </main>
  `
}

// components
// =

function renderFeed () {
  if (updates.length) {
    return html`
      <ul class="feed">
        ${updates.map(renderUpdate)}
      </ul>
    `
  } else {
    return html`
      <p class="feed">
        No updates.
      </p>
    `
  }
}

function renderUpdate (update) {
  return html`
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

function renderProfile () {
  var numFollows = profileDat.profile.follows.length
  return html`
    <div class="profile">
      <a href=${profileDat.url}><img class="avatar" src=${profileDat.profile.image} /></a>
      <div class="profile-info">
        <h1 class="name"><a href=${profileDat.url}>${profileDat.profile.name}</a></h1>
        <div class="description">${profileDat.profile.description} <a href="#edit-profile">Edit profile</a></div>
        <hr />
        <div>Posted <a href=${getViewProfileURL(profileDat)}>10 broadcasts</a></div>
        <div>Following <a href=${getViewFollowsURL(profileDat)}>${numFollows} ${pluralize(numFollows, 'site')}</a></div>
      </div>
    </div>
  `
}

function renderPostForm (state, emit) {
  var textareaCls = !!state.newPostText ? 'has-content' : ''
  return html`
    <form id="new-post" onsubmit=${onPostSubmit}>
      <textarea class=${textareaCls} placeholder="Post a broadcast" onkeyup=${onChangePostText}>${state.newPostText}</textarea>
      ${state.newPostText ? html`
        <div class="new-post-btns">
          <div>
            ${''/*TODO <button class="btn">Share a file<i class="fa fa-file-text-o"></i></button>
            <button class="btn">Share an image<i class="fa fa-picture-o"></i></button>*/}
          </div>
          <div>
            <input type="submit" value="Post to feed" class="btn primary" />
          </div>
        </div>
      ` : ''}
    </form>
  `

  function onChangePostText (e) {
    emit('change-post-text', e.target.value)
  }

  function onPostSubmit (e) {
    e.preventDefault()
    emit('submit-post')
  }
}

// stores
// =

function newPostStore (state, emitter) {
  state.newPostText = ''
  emitter.on('change-post-text', text => {
    state.newPostText = text
    emitter.emit('render')
  })
  emitter.on('submit-post', async () => {
    try {
      await profileDat.broadcast({text: state.newPostText})
    } catch (e) {
      console.error(e)
      return
    }

    // clear form
    state.newPostText = ''
    emitter.emit('render')
  })
}

// event handlers
// =



function onPostSubmit (e) {

}

// helpers
// =

function getViewProfileURL (site) {
  var url = site.url ? site.url : site
  return 'beaker://feed#profile/' + url.slice('dat://'.length)
}

function getViewFollowsURL (site) {
  var url = site.url ? site.url : site
  return 'beaker://feed#follows/' + url.slice('dat://'.length)
}