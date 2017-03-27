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

var profileDat
var app = choo()
app.use(newPostStore)
app.use(feedStore)
app.route('/', mainView)
app.route('/profile/:key', profileView)
app.route('/follows/:key', followsView)
app.route('/edit-profile', editProfileView)

setup()
async function setup () {
  // read profile
  profileDat = new DatProfileSite((await beaker.profiles.get(0)).url)
  profileDat.profile = await profileDat.getProfile()
  profileDat.profile.follows = profileDat.profile.follows || []
  profileDat.numBroadcasts = (await profileDat.listBroadcasts({metaOnly: true})).length
  window.profileDat = profileDat

  app.mount('main')
}

// views
// =

function mainView (state, emit) {
  if (!state.broadcasts) {
    emit('load-feed')
  }
  return html`
    <main>
      <div class="grid">
        <div class="feed-container">
          ${renderError(state, emit)}
          ${renderPostForm(state, emit)}
          <h2>Your feed</h2>
          ${renderFeed(state, emit)}
        </div>
        <div class="sidebar">
          ${renderProfile(profileDat)}
        </div>
      </div>
    </main>
  `
}

function profileView (state, emit) {
  if (!state.broadcasts) {
    emit('load-broadcasts', state.params.key)
  }
  return html`
    <main>
      <div class="grid">
        <div class="feed-container">
          ${renderError(state, emit)}
          <p><a href="#"><i class="fa fa-caret-left"></i> Back to feed</a></p>
          <h2>${state.params.key} feed</h2>
          ${renderFeed(state, emit)}
        </div>
        <div class="sidebar">
          ${renderProfile(state.currentProfileDat)}
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
          ${renderError(state, emit)}
          <p><a href="#"><i class="fa fa-caret-left"></i> Back to feed</a></p>
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
          ${renderError(state, emit)}
          ${renderPostForm(state, emit)}
          <h2>Your feed</h2>
          ${renderFeed(state, emit)}
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

function renderError (state, emit) {
  if (!state.error) {
    return ''
  }
  return html`
    <p class="message error">${state.error.toString()}</p>
  `
}

function renderFeed (state, emit) {
  if (!state.broadcasts) {
    return html`
      <p class="feed">
        Loading...
      </p>
    `
  } else if (state.broadcasts.length) {
    return html`
      <ul class="feed">
        ${state.broadcasts.map(renderBroadcast)}
      </ul>
    `
  } else {
    return html`
      <p class="feed">
        No broadcasts.
      </p>
    `
  }
}

function renderBroadcast (broadcast) {
  if (!broadcast.content.text) {
    return ''
  }
  return html`
    <li class="update">
      <a href=${getViewProfileURL(broadcast.author)}><img src=${getAvatarURL(broadcast.author, broadcast.authorProfile)} class="avatar"/></a>
      <div class="container">
        <div class="metadata">
          <a href=${getViewProfileURL(broadcast.author)} class="name">${broadcast.authorProfile.name}</span>
          <a href=${broadcast.url} target="_blank"><span class="date">${niceDate(broadcast.publishTime)}</span></a>
        </div>
        <p class="content">${broadcast.content.text}</p>
      </div>
    </li>
  `
}

function renderProfile (site) {
  if (!site) {
    return ''
  }
  var numFollows = site.profile.follows.length
  return html`
    <div class="profile">
      <a href=${getViewProfileURL(site)}><img class="avatar" src=${getAvatarURL(site, site.profile)} /></a>
      <div class="profile-info">
        <h1 class="name"><a href=${getViewProfileURL(site)}>${site.profile.name}</a></h1>
        <div class="description">${site.profile.description} <a href="#edit-profile">Edit profile</a></div>
        <hr />
        <div>Posted <a href=${getViewProfileURL(site)}>${site.numBroadcasts} broadcasts</a></div>
        <div>Following <a href=${getViewFollowsURL(site)}>${numFollows} ${pluralize(numFollows, 'site')}</a></div>
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

function feedStore (state, emitter) {
  state.error = null
  state.broadcasts = null
  state.currentProfileDat = null

  emitter.on('pushState', () => {
    // clear page state
    state.error = null
    state.broadcasts = null
    state.currentProfileDat = null
  })

  emitter.on('load-feed', async () => {
    try {
      state.broadcasts = await profileDat.listFeed({reverse: true})
    } catch (e) {
      state.error = e
    }
    emitter.emit('render')
  })

  emitter.on('load-broadcasts', async (profileKey) => {
    try {
      // TODO select the right profile
      console.log('loading', profileKey)
      state.currentProfileDat = profileDat
      state.broadcasts = await state.currentProfileDat.listBroadcasts({reverse: true})
    } catch (e) {
      state.error = e
    }
    emitter.emit('render')
  })
}

function newPostStore (state, emitter) {
  state.newPostText = ''
  emitter.on('change-post-text', text => {
    state.newPostText = text
    emitter.emit('render')
  })
  emitter.on('submit-post', async () => {
    try {
      await profileDat.broadcast({text: state.newPostText})
      profileDat.numBroadcasts++
    } catch (e) {
      console.error(e)
      return
    }

    // clear form
    state.newPostText = ''
    emitter.emit('render')
  })
}

// helpers
// =

function getAvatarURL (site, profile) {
  if (profile && typeof profile.image === 'string') {
    if (profile.image.startsWith('/')) {
      return site.url + profile.image
    }
    return profile.image
  }
  return '' // TODO need a fallback image
}

function getViewProfileURL (site) {
  var url = site.url ? site.url : site
  return 'beaker://feed#profile/' + url.slice('dat://'.length)
}

function getViewFollowsURL (site) {
  var url = site.url ? site.url : site
  return 'beaker://feed#follows/' + url.slice('dat://'.length)
}