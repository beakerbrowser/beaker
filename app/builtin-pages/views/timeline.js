/* globals beaker DatArchive Event history FileReader */

import yo from 'yo-yo'
import moment from 'moment'
import * as cropPopup from '../com/crop-popup'
import renderFilesIcon from '../icon/filesystem'
import renderHeartIcon from '../icon/heart'
import renderRepliesIcon from '../icon/replies'
import imgWithFallbacks from '../com/img-with-fallbacks'
import {pluralize} from '../../lib/strings'
import {findParent} from '../../lib/fg/event-handlers'

// globals
// =

const themeColor = {h: 4, s: 100, l: 65, a: 1}
const themeColorBorder = Object.assign({}, themeColor, {l: 83})
const themeColorBoxShadow = Object.assign({}, themeColor, {l: 87})
const themeColorFaded = Object.assign({}, themeColor, {l: 95})

var currentUserProfile
var viewedProfile
var viewedPost
var currentView = 'feed'
var previewingProfile
var postDraftText = ''
var replyDraftText = ''
var posts = []
var whoToFollow = []
var isEditingPost
var isEditingReply
var unviewedPosts = []
var tmpAvatar

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
  currentUserProfile = await beaker.profiles.getCurrentUserProfile()
  currentUserProfile.isCurrentUser = true
  await loadViewedProfile()
  await loadViewedPost()
  await loadFeedPosts()

  // render
  render()

  // load who to follow data then re-render
  await loadWhoToFollow()
  render()

  window.addEventListener('pushstate', loadViewedProfile)
  window.addEventListener('popstate', loadViewedProfile)
  window.addEventListener('pushstate', loadViewedPost)
  window.addEventListener('popstate', loadViewedPost)

  // fetch new posts every second
  window.setInterval(fetchNewPosts, 1000)
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

function parseURLPostHref () {
  var path = window.location.pathname.slice(1)

  if (!path) return null
  return `dat://${path}`
}

async function loadWhoToFollow () {
  await Promise.all(currentUserProfile.follows.map(async (f) => {
    const fullProfile = await beaker.profiles.getUserProfile(f.url)

    const shouldRecommend = (p) => {
      // is it the current user?
      if (p.url === currentUserProfile._origin) return false
      // is it already in the recommended list?
      else if (whoToFollow.indexOf(p) !== -1) return false
      // TODO: is the user already following this person?
      // else if (await beaker.profiles.isFollowing(currentUserProfile._origin, p.url)) return false
      return true
    }
    whoToFollow = whoToFollow.concat(fullProfile.follows.filter(shouldRecommend))
  }))
}

async function loadFeedPosts () {
  var query = {
    fetchAuthor: true,
    countVotes: true,
    reverse: true,
    rootPostsOnly: false,
    fetchReplies: true
  }
  if (viewedProfile) {
    query = Object.assign(query, {author: viewedProfile._origin})
  }
  posts = await beaker.timeline.listPosts(query)
  posts = await Promise.all(posts.map(async p => {
    if (p.threadParent) {
      p.threadParent = await beaker.timeline.getPost(p.threadParent)
    }
    return p
  }))
}

async function loadViewedPost () {
  try {
    const href = parseURLPostHref()
    if (href) {
      viewedPost = await beaker.timeline.getPost(href)
      if (viewedPost) {
        viewedPost.parents = []
        viewedPost.author.isCurrentUserFollowing = await beaker.profiles.isFollowing(currentUserProfile._origin, viewedPost.author._origin)
        viewedPost.author.isCurrentUser = viewedPost.author._origin === currentUserProfile._origin
        fetchParent(viewedPost)
      }
    }
    render()
  } catch (e) {
    console.error(e)
  }
}

async function fetchNewPosts () {
  var query = {
    limit: 1,
    reverse: true,
    rootPostsOnly: false
  }

  if (viewedProfile) {
    query = Object.assign(query, {author: viewedProfile._origin})
  }

  let newestPost = await beaker.timeline.listPosts(query)
  newestPost = newestPost[0]

  if (newestPost && newestPost._url !== posts[0]._url) {
    if ((unviewedPosts[0] && unviewedPosts[0]._url !== newestPost._url) || !unviewedPosts[0]) {
      unviewedPosts.unshift(newestPost)
      renderNewPostsLink()
    }
  }
}

async function loadNewPosts () {
  await loadFeedPosts()
  render()
}

async function fetchParent (p) {
  if (p.threadParent) {
    const parent = await beaker.timeline.getPost(p.threadParent)
    viewedPost.parents.unshift(parent)
    await fetchParent(parent)
  } else {
    render()
  }
}

async function loadViewedProfile () {
  try {
    // load the profile
    var selectedProfileKey = await parseURLKey()
    if (selectedProfileKey) {
      viewedProfile = await beaker.profiles.getUserProfile(`dat://${selectedProfileKey}`)
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
      const fullProfile = await beaker.profiles.getUserProfile(f.url)
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

function onClosePopup (e) {
  const close = () => {
    viewedPost = null
    window.removeEventListener('click', onClosePopup)
    window.removeEventListener('keydown', onClosePopup)
    const url = viewedProfile._origin.slice('dat://'.length) || ''
    history.pushState({}, null, 'beaker://timeline/' + url)
    render()
  }

  // ESC key pressed
  if (e.keyCode && e.keyCode === 27) close()

  // click outside of the popup content
  if (!findParent(e.target, 'popup-inner')) close()
}

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

function onShowReplies (p) {
  history.pushState({}, null, 'beaker://timeline/' + p._url.slice('dat://'.length))
  render()
}

async function onSubmitReply (e) {
  e.preventDefault()
  await beaker.timeline.post({
    text: replyDraftText,
    threadRoot: viewedPost.threadRoot || viewedPost._url,
    threadParent: viewedPost._url
  })
  replyDraftText = ''
  isEditingReply = false
  // reload the post
  viewedPost = await beaker.timeline.getPost(viewedPost._url)
  render()
}

function onToggleIsReplying () {
  if (!replyDraftText) {
    isEditingReply = !isEditingReply
    render()
  }
}

function onChangeReplyDraft (e) {
  replyDraftText = e.target.value
  render()
}

async function onUpdateViewFilter (filter) {
  // update view
  currentView = filter || ''
  render()
}

async function onClickProfile (e, profile) {
  e.stopPropagation()

  // reset viewedPost in case the click came from a popup
  viewedPost = null
  // load the full profile
  if (!profile._origin) {
    profile = await beaker.profiles.getUserProfile(profile.url)
  }

  history.pushState({}, null, 'beaker://timeline/' + profile._origin.slice('dat://'.length))
  viewedProfile = profile
  await loadFeedPosts()
  onUpdateViewFilter('feed')
}

async function onSaveProfile (e) {
  e.preventDefault()

  var name = e.target.name.value || ''
  var bio = e.target.bio.value || ''
  await beaker.profiles.setCurrentUserProfile({name, bio})

  // if the avatar's changed, update the profile avatar
  if (tmpAvatar) {
    await beaker.profiles.setCurrentUserAvatar(tmpAvatar.imgData, tmpAvatar.imgExtension)
  }

  tmpAvatar = undefined
  currentView = ''
  viewedProfile = await beaker.profiles.getCurrentUserProfile()
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
  previewingProfile = await beaker.profiles.getUserProfile(profile.url)
  previewingProfile.friends = await beaker.profiles.listFriends(profile.url)
  render()
}

async function onToggleFollowing (e, user) {
  e.preventDefault()
  e.stopPropagation()
  var userUrl = user._origin || user.url // we may be given a profile record or a follows record
  if (user.isCurrentUserFollowing) {
    await beaker.profiles.unfollow(userUrl)
    user.isCurrentUserFollowing = false
  } else {
    await beaker.profiles.follow(userUrl, user.name || '')
    user.isCurrentUserFollowing = true
  }
  render()
}

async function onToggleLiked (e, p) {
  e.stopPropagation()

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
      <div class="builtin-main center">
        ${renderHeader()}
        ${renderView()}
        ${renderPopup()}
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

function renderPopup () {
  if (!viewedPost) return ''

  window.addEventListener('click', onClosePopup)
  window.addEventListener('keydown', onClosePopup)

  const editingCls = isEditingReply ? 'editing' : ''
  return yo`
    <div class="popup-wrapper">
      <div class="popup-inner post-popup">

        ${viewedPost.threadParent && !viewedPost.parents ? yo`
          <div class="loading-container"><div class="spinner"></div></div>
        `: ''}

        ${viewedPost.parents ? yo`
          <div class="parents">
            ${viewedPost.parents.map(renderReply)}
          </div>`
        : ''}

        <div class="main-post">
          <div class="post-header">
            ${renderAvatar(viewedPost)}

            <div>
              <div class="name" onclick=${e => onClickProfile(e, viewedPost.author)}>${viewedPost.author.name}</div>
              <div class="timestamp">${timestamp(viewedPost.createdAt)}</div>
            </div>

            ${renderFollowButton(viewedPost.author)}
          </div>

          <div class="text">${viewedPost.text}</div>

          ${renderPostActions(viewedPost)}
        </div>

        <form class="reply-form ${editingCls}" onsubmit=${onSubmitReply}>
          ${renderAvatar(currentUserProfile)}
          <textarea placeholder="Write a reply" style="border-color: ${toCSSColor(themeColorBorder)}" onfocus=${onToggleIsReplying} onblur=${onToggleIsReplying} onkeyup=${onChangeReplyDraft}>${replyDraftText}</textarea>
          <div class="actions ${editingCls}">
            ${isEditingReply ? yo`<button disabled=${!replyDraftText} class="btn new-reply" type="submit">Reply</button>` : ''}
          </div>
        </form>

        ${renderReplies(viewedPost)}
      </div>
    </div>
  `
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
        ${renderWhoToFollow()}
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
      ${!posts.length ? yo`<div class="loading-container"><div class="spinner"></div></div>` : ''}
      <div class="new-posts-indicator"></div>
      ${posts.map(renderPostFeedItem)}
    </div>
  `
}

function renderNewPostsLink () {
  yo.update(
    document.querySelector('.new-posts-indicator'),
    yo`<div class="new-posts-indicator" onclick=${loadNewPosts}>
      ${unviewedPosts.length} new ${pluralize(unviewedPosts.length, 'post')}
    </div>`
  )
}

function renderNewPostForm () {
  var editingCls = (isEditingPost || postDraftText.length) ? 'editing' : ''
  return yo`
    <form class="new-post-form ${editingCls}" onsubmit=${onSubmitPost}>
      ${renderAvatar(currentUserProfile)}
      <textarea placeholder="Write a post" style="border-color: ${toCSSColor(themeColorBorder)}; height: ${isEditingPost || postDraftText.length ? '60px' : '35px'};" onfocus=${onToggleNewPostForm} onblur=${onToggleNewPostForm} onkeyup=${onChangePostDraft}>${postDraftText}</textarea>
      <div class="actions ${editingCls}">
        ${isEditingPost || postDraftText.length ? yo`<button disabled=${!postDraftText.length} class="btn new-post" type="submit">Submit post</button>` : ''}
      </div>
    </form>`
}

function renderPostFeedItem (p) {
  return yo`
    <div class="feed-item post" onclick=${() => onShowReplies(p)}>
      ${renderAvatar(p.author)}
      <div class="post-content">
        <div class="post-header">
          <div>
            <span onclick=${e => onClickProfile(e, p.author)} class="name">${p.author.name}</span>
            <span class="timestamp">
              <span class="bullet">•</span>
              <span class="value">${timestamp(p.createdAt)}</span>
            </span>
          </div>

          ${p.threadParent ? yo`
            <div class="reply-info" onclick=${() => onShowReplies(p.threadParent)}>
              Replying to
              <span class="url" >${p.threadParent.author.name}</span>
            </div>`
          : ''}
        </div>

        <p class="text">${p.text}</p>
      </div>

      ${renderPostActions(p)}
    </div>
  `
}

function renderReplies (p) {
  if (!(p.replies && p.replies.length)) return ''
  return yo`
    <div class="replies-container">
      <div class="replies">${p.replies.map(renderReply)}</div>
    </div>
  `
}

function renderReply (r) {
  return yo`
    <div class="reply feed-item post" onclick=${() => onShowReplies(r)}>
      ${renderAvatar(r.author)}
      <div class="post-content">
        <div class="post-header">
          <span onclick=${e => onClickProfile(e, r.author)} class="name">${r.author.name}</span>
          <span class="timestamp">
            <span class="bullet">•</span>
            <span class="value">${timestamp(r.createdAt)}</span>
          </span>
        </div>

        <p class="text">${r.text}</p>
      </div>

      ${renderPostActions(r)}
    </div>
  `
}

function renderPostActions (p) {
  return yo`
    <div class="post-actions">
      <div class="action">
        <span onclick=${e => onShowReplies(p)} class="replies-icon">
          ${renderRepliesIcon()}
        </span>

        ${p.replies ? yo`
          <span class="count">
            ${p.replies.length}
          </span>`
        : ''}
      </div>

      <div class="action ${p.votes.currentUsersVote ? 'voted' : ''}">
        <span onclick=${e => onToggleLiked(e, p)} class="vote-icon ${p.votes.currentUsersVote ? 'voted' : ''}">
          ${renderHeartIcon()}
        </span>

        <span class="count">
          ${p.votes.value || ''}
        </span>
      </div>
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

      <span onclick=${e => onClickProfile(e, profile)} class="name">${profile.name || 'Anonymous'}</span>

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
        ${renderWhoToFollow()}
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
        ${renderWhoToFollow()}
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

function renderWhoToFollow () {
  if (!whoToFollow.length) return ''
  return yo`
    <div class="who-to-follow-container">
      <h2>Who to follow</h2>
      <div class="who-to-follow">${whoToFollow.map(renderProfileLite)}</div>
    </div>
  `
}

function renderProfileLite (profile) {
  return yo`
    <div onclick=${e => onClickProfile(e, profile)} class="profile-lite">
      ${renderAvatar(profile)}
      <span class="content">
        <div class="name">${profile.name}</div>
        ${renderFollowButton(profile)}
      </span>
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
    <div onclick=${e => onClickProfile(e, profile)} class="avatar-container">
      ${imgWithFallbacks(`${profile._origin || profile.url}/avatar`, ['png', 'jpg', 'jpeg', 'gif'], {cls: 'avatar'})}
    </div>
  `
}

function renderProfileFeedItem (profile) {
  const url = profile._origin || profile.url
  return yo`
    <div class="feed-item profile" href="beaker://profile/${url.slice('dat://'.length)}">
      <div class="profile-feed-item-header">
        ${renderAvatar(profile)}

        <div>
          <div class="name" onclick=${e => onClickProfile(e, profile)}>${profile.name || 'Anonymous'}</div>
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

function timestamp (ts, opts) {
  const endOfToday = moment().endOf('day')
  if (typeof ts == 'number') { ts = moment(ts) }

  // TODO: lord forgive me for i have sinned -tbv
  // here's what you get when the moment.js docs are taking too long to parse
  // and i'm in a rush:
  if (ts.isSame(endOfToday, 'day')) {
    var fromNow = ts.fromNow()
    fromNow = fromNow.substring(0, fromNow.indexOf(' ago'))
    fromNow = fromNow.replace('an ', '1')
    fromNow = fromNow.replace('a ', '1')
    fromNow = fromNow.replace('hours', 'h')
    fromNow = fromNow.replace('hour', 'h')
    fromNow = fromNow.replace('minutes', 'm')
    fromNow = fromNow.replace('minute', 'm')
    fromNow = fromNow.replace('seconds', 's')
    fromNow = fromNow.replace('second', 's')
    fromNow = fromNow.replace('few', '')
    fromNow = fromNow.replace(' ', '')
    return fromNow
  } else {
    return ts.format('MMM D')
  }
}