const yo = require('yo-yo')
const co = require('co')
import renderSidebar from '../com/sidebar'
import renderPencilIcon from '../icon/pencil'
import renderFilesIcon from'../icon/filesystem'
import renderHeartIcon from '../icon/heart'
import imgWithFallbacks from '../com/img-with-fallbacks'
import {pluralize} from '../../lib/strings'

// globals
// =

const themeColor = {h: 4, s: 100, l: 65, a: 1}
const themeColorBorder = Object.assign({}, themeColor, {l: 83})
const themeColorBoxShadow = Object.assign({}, themeColor, {l: 87})
const themeColorFaded = Object.assign({}, themeColor, {l: 97})

var currentUserProfile
var viewedProfile
var currentView = 'feed'
var previewingProfile
var postDraftText = ''
var posts = []
var isEditingPost

// HACK FIX
// the good folk of whatwg didnt think to include an event for pushState(), so let's add one
// -prf
var _wr = function (type) {
  var orig = window.history[type]
  return function () {
    var rv = orig.apply(this, arguments)
    var e = new Event(type.toLowerCase())
    e.arguments = arguments
    window.dispatchEvent(e)
    return rv
  }
}
window.history.pushState = _wr('pushState')
window.history.replaceState = _wr('replaceState')

// main
// =

setup()
async function setup () {
  currentUserProfile = await beaker.profiles.getCurrentProfile()
  currentUserProfile.isCurrentUser = true
  await loadViewedProfile()
  await loadFeedPosts()

  // render
  render()

  window.addEventListener('pushstate', loadViewedProfile)
  window.addEventListener('popstate', loadViewedProfile)
}

async function parseURLKey () {
  var path = window.location.pathname

  if (path === '/' || !path) return false
  try {
    // extract key from url
    var name = /^\/([^/]+)/.exec(path)[1]
    if (/[0-9a-f]{64}/i.test(name)) return name
    return DatArchive.resolveName(name)
  } catch (e) {
    console.error('Failed to parse URL', e)
    throw new Error('Invalid dat URL')
  }
}

async function loadFeedPosts () {
  var query = {
    fetchAuthor: true,
    countVotes: true,
    reverse: true
  }
  if (viewedProfile) {
    query = Object.assign(query, {author: viewedProfile._origin})
  }
  posts = await beaker.timeline.listPosts(query)
}

async function loadViewedProfile () {
  try {
    // load the profile
    var selectedProfileKey = await parseURLKey()
    if (selectedProfileKey) {
      viewedProfile = await beaker.profiles.getProfile(`dat://${selectedProfileKey}`)
      viewedProfile.isCurrentUserFollowing = await beaker.profiles.isFollowing(currentUserProfile._origin, viewedProfile._origin)
      viewedProfile.isCurrentUser = viewedProfile._origin === currentUserProfile._origin

      const friends = await beaker.profiles.listFriends(viewedProfile._origin)
      viewedProfile.friends = friends.filter(f => f._origin !== currentUserProfile._origin)
    }
    render()

    // load extra data and render again
    await Promise.all(viewedProfile.follows.map(async (f) => {
      f.isCurrentUser = f.url === currentUserProfile._origin
      f.isCurrentUserFollowing = await beaker.profiles.isFollowing(currentUserProfile._origin, f.url)
      const fullProfile = await beaker.profiles.getProfile(f.url)
      return Object.assign(f, fullProfile)
    }))
    render()
  } catch (e) {
    // TODO
    console.error(e)
  }

}

// events
// =

async function onClickHome () {
  viewedProfile = null
  history.pushState({}, null, 'beaker://timeline/')
  await loadFeedPosts()
  onUpdateViewFilter('feed')
}

function onChangePostDraft (e) {
  postDraftText = e.target.value
  render()
}

async function onSubmitPost (e) {
  e.preventDefault()
  await beaker.timeline.post({text: postDraftText})
  postDraftText = ''
  await loadFeedPosts()
  render()
}

function onToggleNewPostForm () {
  isEditingPost = !isEditingPost
  render()
}

async function onUpdateViewFilter (filter) {
  // update view
  currentView = filter || ''
  render()
}

async function onClickProfile (profile) {
  history.pushState({}, null, 'beaker://timeline/' + profile._origin.slice('dat://'.length))
  viewedProfile = profile
  await loadFeedPosts()
  onUpdateViewFilter('feed')
}

async function onSaveProfile (e) {
  e.preventDefault()

  var name = e.target.name.value || ''
  var bio = e.target.bio.value || ''
  await beaker.profiles.setCurrentProfile({name, bio})

  // if the avatar's changed, update the profile avatar
  if (tmpAvatar) {
    await beaker.profiles.setCurrentAvatar(tmpAvatar.imgData, tmpAvatar.imgExtension)
  }

  tmpAvatar = undefined
  currentView = ''
  viewedProfile = await beaker.profiles.getCurrentProfile()
  render()
}

function onUpdateTmpAvatar (e) {
  if (e.target.files) {
    var f = e.target.files[0]
    var reader = new FileReader()

    reader.onload = function () {
      e.target.value = null // clear the input
      cropPopup.create(reader.result, res => {
        document.querySelector('img.editor.avatar').src = res.dataUrl
        tmpAvatar = res
      })
    }
    reader.readAsDataURL(f)
  }
}

async function onHoverAvatar (profile) {
  // get the full profile
  previewingProfile = await beaker.profiles.getProfile(profile.url)
  previewingProfile.friends = await beaker.profiles.listFriends(profile.url)
  render()
}

async function onToggleFollowing (e, user) {
  e.preventDefault()
  e.stopPropagation()
  var userUrl = user._origin || user.url // we may be given a profile record or a follows record
  if (user.isCurrentUserFollowing) {
    await beaker.profiles.unfollow(currentUserProfile._origin, userUrl)
    user.isCurrentUserFollowing = false
  } else {
    await beaker.profiles.follow(currentUserProfile._origin, userUrl, user.name || '')
    user.isCurrentUserFollowing = true
  }
  render()
}

async function onToggleLiked (p) {
  const vote = p.votes.currentUsersVote ? 0 : 1
  await beaker.timeline.vote(vote, p._url, 'post')
  await loadFeedPosts()
  render()
}


// rendering
// =

function render () {
  yo.update(document.querySelector('.timeline-wrapper'), yo`
    <div class="builtin-wrapper timeline-wrapper">
      ${renderSidebar()}
      <div class="builtin-main center">
        ${renderHeader()}
        ${renderView()}
      </div>
      <style>body{--theme-color: ${toCSSColor(themeColor)}}</style>
      <style>body{--theme-color-faded: ${toCSSColor(themeColorFaded)}}</style>
      <style>body{--theme-color-box-shadow: ${toCSSColor(themeColorBoxShadow)}}</style>
      <style>body{--theme-color-border: ${toCSSColor(themeColorBorder)}}</style>
    </div>
  `)
}

function renderHeader () {
  return yo`
    <div class="header">
      <div class="container">
        <div class="nav-links">
          <span onclick=${onClickHome} class="nav-link">
            ${renderFilesIcon()}
            Feed
          </span>
        </div>

        <div class="avatar-container">
          ${renderAvatar(currentUserProfile)}
        </div>
      </div>
    </div>
  `
}

function renderView () {
  switch (currentView) {
    case 'feed':
      return renderFeed()
    case 'following':
      return renderFollowing()
    case 'friends':
      return renderFriends()
    default:
      return renderFeed()
  }
}

function renderViewHeader (profile) {
  return yo`
    <div class="view-header">
      <div onclick=${e => onUpdateViewFilter('feed')} class="nav-link ${currentView === 'feed' ? 'active' : ''}">
        <div class="label">Posts</div>
        <div class="value">${posts.length}</div>
      </div>

      <div onclick=${e => onUpdateViewFilter('following')} class="nav-link ${currentView === 'following' ? 'active' : ''}">
        <div class="label">Following</div>
        <div class="value">${profile.follows.length}</div>
      </div>
    </div>
  `
}

function renderFeed () {
  return yo`
    <div class="view feed">
      <div class="sidebar-col">
        ${renderProfileCard(viewedProfile || currentUserProfile)}
        ${renderFriendsList(viewedProfile || currentUserProfile)}
      </div>

      <div class="main-col">
        ${viewedProfile ? renderViewHeader(viewedProfile) : ''}

        <div class="view-content">
          ${!viewedProfile ? renderNewPostForm() : ''}
        </div>

        ${renderTimeline()}
      </div>
    </div>
  `
}

function renderTimeline () {
  return yo`
    <div class="feed">
      ${!posts.length ? 'No posts' : ''}
      ${posts.map(renderPostFeedItem)}
    </div>
  `
}

function renderNewPostForm () {
  return yo`
    <form class="new-post-form" onsubmit=${onSubmitPost}>
      ${renderAvatar(currentUserProfile)}
      <textarea placeholder="Write a post" style="border-color: ${toCSSColor(themeColorBorder)}; height: ${isEditingPost || postDraftText.length ? '60px' : '35px'};" onfocus=${onToggleNewPostForm} onblur=${onToggleNewPostForm} onkeyup=${onChangePostDraft}>${postDraftText}</textarea>
      <div class="actions">
        ${isEditingPost || postDraftText.length ? yo`<button disabled=${!postDraftText.length} class="btn new-post" type="submit">Submit post</button>` : ''}
      </div>
    </form>`
}

function renderPostFeedItem (p) {
  return yo`
    <div class="feed-item post">
      ${renderAvatar(p.author)}
      <div class="post-content">
        <div class="post-header">
          <span onclick=${e => onClickProfile(p.author)} class="name">${p.author.name}</span>
        </div>
        <p class="text">${p.text}</p>
      </div>

      ${renderPostActions(p)}
    </div>
  `
}

function renderPostActions (p) {
  return yo`
    <div class="post-actions">
      <span onclick=${e => onToggleLiked(p)} class="vote-icon ${p.votes.currentUsersVote ? 'voted' : ''}">
        ${renderHeartIcon()}
      </span>
      ${p.votes.value ? p.votes.value : ''}
    </div>
  `
}

function renderProfileCard (profile) {
  return yo`
    <div class="profile-card" href="beaker://profile/${profile._url.slice('dat://'.length)}">
      <div class="profile-card-header">
        ${imgWithFallbacks(`${profile._origin}/avatar`, ['png', 'jpg', 'jpeg', 'gif'], {cls: 'avatar'})}
        ${renderFollowButton(profile)}
      </div>

      <span onclick=${e => onClickProfile(profile)} class="name">${profile.name || 'Anonymous'}</span>

      <p class="bio">${profile.bio}</p>

      ${previewingProfile && previewingProfile._origin === profile.url
        ? renderProfilePreview()
        : ''
      }
    </div>
  `
}

function renderFollowing () {
  return yo`
    <div class="view following">
      <div class="sidebar-col">
        ${renderProfileCard(viewedProfile)}
      </div>

      <div class="main-col">
        ${renderViewHeader(viewedProfile)}
        <div class="view-content">
          ${viewedProfile.follows.length === 0
            ? `${viewedProfile.name} is not following anyone`
            : yo`<div class="following-list">${viewedProfile.follows.map(renderProfileFeedItem)}</div>`
          }
        </div>
      </div>
    </div>
  `
}

function renderFriends () {
  return yo`
    <div class="view friends">
      <div class="sidebar-col">
        ${renderProfileCard(viewedProfile)}
      </div>

      <div class="main-col">
        <div class="view-content">
          <div class="view-content-header">
            <h2>Followers you know:</h2>
          </div>

          ${!viewedProfile.friends
            ? ''
            : yo`
              <div class="following-list">
                ${viewedProfile.friends.map(renderProfileFeedItem)}
              </div>
            `
          }
        </div>
      </div>
    </div>
  `
}

function renderProfilePreview () {
  const profile = previewingProfile
  return yo`
    <div class="preview profile">
      <div class="header">
        ${renderAvatar(profile)}
      </div>

      <div class="info">
        <span class="title">${profile.name || 'Anonymous'}</span>
        ${profile.isCurrentUser ? '' : renderFollowButton(profile)}
      </div>

      <p class="bio">${profile.bio}</p>

      ${renderFriendsList(profile)}
    </div>
  `
}

function renderAvatar (profile) {
  return yo`
    <div onclick=${e => onClickProfile(profile)} class="avatar-container">
      ${imgWithFallbacks(`${profile._origin}/avatar`, ['png', 'jpg', 'jpeg', 'gif'], {cls: 'avatar'})}
    </div>
  `
}

function renderProfileFeedItem (profile) {
  return yo`
    <div class="feed-item profile" href="beaker://profile/${profile._origin.slice('dat://'.length)}">
      <div class="profile-feed-item-header">
        ${renderAvatar(profile)}

        <div>
          <div class="name" onclick=${e => onClickProfile(profile)}>${profile.name || 'Anonymous'}</div>
          <a href="https://pfrazee.github.io" class="url">pfrazee.github.io</a>
          ${renderFollowButton(profile)}
        </div>

        ${previewingProfile && previewingProfile._origin === profile._origin
          ? renderProfilePreview()
          : ''
        }
      </div>

      <p class="bio">${profile.bio}</p>
    </div>
  `
}

function renderProfile () {
  if (!viewedProfile) {
    return yo`
      <div class="profile-view">
        <p>Profile not found</p>
      </div>
    `
  }

  var isUserProfile = viewedProfile && viewedProfile._origin === currentUserProfile._origin
  return yo`
    <div class="profile-view">
      <div class="header">
        ${viewedProfile.avatar
          ? yo`
            <div class="avatar-container">
              <img class="avatar" src="${viewedProfile._origin}${viewedProfile.avatar}?cache_buster=${Date.now()}"/>
            </div>`
          : yo`
            <div class="avatar-container">
              <span class="avatar empty"></span>
            </div>`
        }

        <span class="name">${viewedProfile.name}</span>
      </div>

      <p class="bio">${viewedProfile.bio}</p>

      ${isUserProfile ? '' : renderFollowButton(viewedProfile)}
    </div>
  `
}

function renderProfileEditor () {
  return yo`
    <div>
      <h2>Edit your profile</h2>

      <form class="edit-profile" onsubmit=${onSaveProfile}>

        <label for="avatar">Avatar</label>
        <div title="Update your avatar" class="avatar-container">
          <input onchange=${onUpdateTmpAvatar} name="avatar" class="avatar-input" type="file" accept="image/*"/>
          <img class="avatar editor" src="${viewedProfile.avatar ? viewedProfile._origin + viewedProfile.avatar : ''}?cache-buster=${Date.now()}"/>
          ${viewedProfile.avatar ? '' : yo`<span class="avatar editor empty">+</span>`}
        </div>

        <label for="name">Name</label>
        <input autofocus type="text" name="name" placeholder="Name" value=${viewedProfile.name || ''}/>

        <label for="bio">Bio (optional)</label>
        <textarea name="bio" placeholder="Enter a short bio">${viewedProfile.bio || ''}</textarea>

        <div class="actions">
          <button type="button" class="btn" onclick=${onToggleEditingProfile}>Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>
    </div>
  `
}

function renderFollowButton (profile) {
  if (profile.isCurrentUser) return ''
  var cls = profile.isCurrentUserFollowing ? 'following' : ''
  return yo`
    <button class="follow-btn btn ${cls}" onclick=${(e) => onToggleFollowing(e, viewedProfile)}>
      ${profile.isCurrentUserFollowing ? 'Following' : 'Follow'}
    </button>`
}

function renderFriendsList (profile) {
  if (profile.isCurrentUser || !profile.friends) return ''
  return yo`
    <div class="friends-list-container">
      <span class="url" onclick=${e => onUpdateViewFilter('friends')}>
        ${profile.friends.length ? `${profile.friends.length} ${pluralize(profile.friends.length, 'follower')} you know` : ''}
      </span>
      <div class="friends-list">${profile.friends.map(renderAvatar)}</div>
    </div>
  `
}

// helpers
// =

function toCSSColor (hslaObj) {
  const {h, s, l, a} = hslaObj
  return `hsla(${h}, ${s}%, ${l}%, ${a})`
}
