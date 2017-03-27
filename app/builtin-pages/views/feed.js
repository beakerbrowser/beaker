/*
This uses the beaker.bookmarks API, which is exposed by webview-preload to all
sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import DatProfileSite from 'dat-profile-site'
import {niceDate} from '../../lib/time'

// globals
// =

var newPostText = false
var profileDat

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

setup()
async function setup () {
  profileDat = new DatProfileSite((await beaker.profiles.get(0)).url)
  profileDat.profile = await profileDat.getProfile()
  update()
}

// rendering
// =

function update () {
  yo.update(document.querySelector('main'), yo`
    <main>
      <div class="grid">
        <div class="feed-container">
          ${renderPostForm()}
          <h2>Your feed</h2>
          ${renderFeed()}
        </div>
        <div class="sidebar">
          ${renderProfile()}
        </div>
      </div>
    </main>
  `)
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

function renderProfile () {
  return yo`
    <div class="profile">
      <a href=${profileDat.url}><img class="avatar" src=${profileDat.profile.image} /></a>
      <div class="profile-info">
        <h1 class="name"><a href=${profileDat.url}>${profileDat.profile.name}</a></h1>
        <div class="description">${profileDat.profile.description} <a href="#">Edit profile</a></div>
        <hr />
        <div>Posted <a href="#">10 broadcasts</a></div>
        <div>Following <a href="#">23 sites</a></div>
      </div>
    </div>
  `
}

function renderPostForm () {
  return yo`
    <form id="new-post">
      <textarea placeholder="Post a broadcast" onkeyup=${onChangePostText}>${newPostText || ''}</textarea>
      ${newPostText ? yo`
        <div class="new-post-btns">
          <div>
            ${''/*<button class="btn">Share a file<i class="fa fa-file-text-o"></i></button>
            <button class="btn">Share an image<i class="fa fa-picture-o"></i></button>*/}
          </div>
          <div>
            <input type="submit" value="Post to feed" class="btn primary" />
          </div>
        </div>
      ` : ''}
    </form>
  `
}

// event handlers
// =

function onChangePostText (e) {
  newPostText = e.target.value
  update()
}
