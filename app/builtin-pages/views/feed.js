/* globals beaker */

const yo = require('yo-yo')
import renderBuiltinPagesHeader from '../com/builtin-pages-header'
import {niceDate} from '../../lib/time'
import * as toast from '../com/toast'

// globals
//

var currentUserSession = null
var newPostText = ''
var posts = []

// main
// =

setup()
async function setup () {
  currentUserSession = await beaker.browser.getUserSession()
  posts = await beaker.posts.list({reverse: true})
  console.log({posts})
  update()
}

// rendering
// =

function update () {
  yo.update(document.querySelector('.feed-wrapper'), yo`
    <div class="feed-wrapper builtin-wrapper">
      ${renderBuiltinPagesHeader('Feed', currentUserSession)}

      <div class="builtin-main">
        ${renderNewPostForm()}
        ${renderFeed()}
    </div>`
  )
}

function renderNewPostForm () {
  var charCount = newPostText.length
  return yo`
    <form class="new-post-form" onsubmit=${onSubmitNewPostForm}>
      <div class="inputs">
        <a href="${currentUserSession.url}" class="avatar-container">
          <img src="${currentUserSession.url}/thumb.jpg" class="avatar">
        </a>
        <textarea placeholder="Write a post" onkeydown=${onNewPostKeyup} onkeyup=${onNewPostKeyup} onchange=${onNewPostKeyup}>${newPostText}</textarea>
      </div>
      <div class="actions editing">
        <span class="char-count${charCount > 240 ? ' danger' : ''}">${charCount} / 280</span>
        <button type="submit" class="btn new-post" disabled=${!newPostText}>Post</button>
      </div>
    </form>`
}

function renderFeed () {
  return yo`
    <div class="feed">
      ${posts.length === 0
        ? yo`
          <div class="empty">
            Your feed is empty, what the fuck.
          </div>`
        : ''}
      ${posts.map(post => yo`
        <div class="feed-item post">
          <a href="${post.author.url}" class="avatar-container">
            <img src="${post.author.url}/thumb.jpg" class="avatar ">
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
        </div>
      `)}
    </div>
  </div>`
}

// event handlers
// =

function onNewPostKeyup (e) {
  newPostText = e.currentTarget.value
  if (newPostText.length > 280) {
    newPostText = newPostText.slice(0, 280)
  }
  update()
}

async function onSubmitNewPostForm (e) {
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
    await beaker.posts.delete(postPathname)
    window.location.reload()
  } catch (e) {
    console.error(e)
    toast.create(`Could not delete post: ${e.toString()}`, 'error')
  }
}
