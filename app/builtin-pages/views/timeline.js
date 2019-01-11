/* globals beaker */

const yo = require('yo-yo')
import {niceDate} from '../../lib/time'
import * as toast from '../com/toast'

// globals
//

var currentUserSession = null
var followedUsers
var newPostText = ''
var posts = []

// main
// =

setup()
async function setup () {
  currentUserSession = await beaker.browser.getUserSession()
  followedUsers = await beaker.followgraph.listFollows(currentUserSession.url)
  posts = await beaker.posts.list({reverse: true, authors: getTimelineAuthors(), limit: 40})
  console.log({posts})
  update()
}

function getTimelineAuthors () {
  return followedUsers.concat(currentUserSession.url)
}

// rendering
// =

function update () {
  yo.update(document.querySelector('.timeline-wrapper'), yo`
    <div class="timeline-wrapper builtin-wrapper">
      <div class="builtin-main">
        ${renderNewPostForm()}
        ${renderTimeline()}
    </div>`
  )
}

function updateNewPostForm () {
  yo.update(document.querySelector('.new-post-form'), renderNewPostForm())
}

function renderNewPostForm () {
  var charCount = newPostText.length
  return yo`
    <form class="new-post-form" onsubmit=${onSubmitNewPostForm}>
      <div class="inputs">
        <a href="${currentUserSession.url}" class="avatar-container">
          <img src="${currentUserSession.url}/thumb" class="avatar">
        </a>
        <textarea placeholder="Write a post" onkeydown=${onNewPostKeyup} onkeyup=${onNewPostKeyup} onchange=${onNewPostKeyup}>${newPostText}</textarea>
      </div>
      <div class="actions editing">
        <span class="char-count${charCount > 240 ? ' danger' : ''}">${charCount} / 280</span>
        <button type="submit" class="btn new-post" disabled=${!newPostText}>Post</button>
      </div>
    </form>`
}

function renderTimeline () {
  return yo`
    <div class="timeline">
      ${posts.length === 0
        ? yo`
          <div class="empty">
            Your timeline is empty.
          </div>`
        : ''}
      ${posts.map(renderFeedItem)}
    </div>
  </div>`
}

function renderFeedItem (post) {
  var el = yo`
    <div class="timeline-item post" id="post-${post.author.url}${post.pathname}">
      <a href="${post.author.url}" class="avatar-container">
        <img src="${post.author.thumbUrl}" class="avatar">
      </a>
      <div class="post-content">
        <div class="post-header">
          <a href="${post.author.url}" class="name">${post.author.title}</a>
          <span class="timestamp">
            <span class="bullet">•</span>
            <a href="${post.author.url}${post.pathname}" class="value">${niceDate(post.createdAt)}</a>
          </span>
          ${post.author.url === currentUserSession.url
            ? yo`
              <span class="timestamp">
                <span class="bullet">•</span>
                <a href="#" onclick=${e => onClickDelete(e, post.pathname)}>delete</a>
              </span>`
            : ''}
        </div>
        <p class="text">${post.content}</p>
      </div>
    </div>`
  el.isSameNode = other => el.id === other.id
  return el
}

// event handlers
// =

function onNewPostKeyup (e) {
  newPostText = e.currentTarget.value
  if (newPostText.length > 280) {
    newPostText = newPostText.slice(0, 280)
  }
  updateNewPostForm()
}

async function onSubmitNewPostForm (e) {
  e.preventDefault()
  if (!newPostText.trim()) return

  try {
    await beaker.posts.create({content: newPostText})
    window.location.reload()
  } catch (e) {
    console.error(e)
    toast.create(`Could not create post: ${e.toString()}`, 'error')
  }
}

async function onClickDelete (e, postPathname) {
  try {
    if (!confirm('Delete this post?')) return
    await beaker.posts.delete(postPathname)
    window.location.reload()
  } catch (e) {
    console.error(e)
    toast.create(`Could not delete post: ${e.toString()}`, 'error')
  }
}
