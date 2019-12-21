import { resolveParse, toNiceDomain, toNiceUrl } from './util.js'

// globals
// =

// we retain the URLs of the last posts emitted from `ls`
// to provide short numeric indexes in other commands
var lastPosts = []

// exported api
// =

export async function ls (opts = {}) {
  lastPosts.length = 0
  let posts = await navigator.filesystem.query({
    path: ['/profile/feed/*', '/profile/friends/*/feed/*'],
    sort: 'ctime',
    reverse: true,
    limit: opts.num,
    offset: (opts.page - 1) * opts.num
  })
  let profiles = {}
  for (let post of posts) {
    lastPosts.push(post.url)
    profiles[post.drive] = post.drive = profiles[post.drive] || await (new DatArchive(post.drive)).getInfo()
    post.content = await navigator.filesystem.readFile(post.path)
  }
  posts.toHTML = () => {
    if (!opts.long) {
      return posts.map((post, i) => html`
        <div style="display: flex; align-items: center; margin-bottom: 10px; overflow: hidden; white-space: nowrap; height: 1rem">
          <strong class="color-lightgray" style="margin-right: 10px">${i + 1}.</strong>
          <img src="asset:thumb:${post.drive.url}" style="width: 16px; border-radius: 50%; margin-right: 10px">
          <a href="beaker://social/${post.drive.url.slice('dat://'.length)}" style="margin-right: 10px"><strong>${post.drive.title}</strong></a>
          <a class="color-lightgray" href="beaker://social/${post.url.slice('dat://'.length)}" style="margin-right: 10px"><small>${timeDifference(post.stat.ctime)}</small></a>
          <span>${post.content}</span>
        </div>
      `).reverse()      
    }
    return posts.map((post, i) => html`
      <div class="border-lightgray" style="padding: 10px; margin: 5px 0">
        <div style="display: flex; align-items: center; margin-bottom: 10px">
          <strong class="color-lightgray" style="margin-right: 10px">${i + 1}.</strong>
          <img src="asset:thumb:${post.drive.url}" style="width: 16px; border-radius: 50%; margin-right: 10px">
          <a href="beaker://social/${post.drive.url.slice('dat://'.length)}" style="margin-right: 10px"><strong>${post.drive.title}</strong></a>
          <a class="color-lightgray" href="beaker://social/${post.url.slice('dat://'.length)}"><small>${timeDifference(post.stat.ctime)}</small></a>
        </div>
        <div>
          ${post.content}
        </div>
      </div>
    `).reverse()
  }
  return posts
}

export async function post (opts = {}, ...bodyParts) {
  var body = bodyParts.join(' ')
  if (opts.file) {
    let {archive, pathname} = resolveParse(this.env, opts.file)
    body = await archive.readFile(pathname)
  }
  if (opts.yes) {
    await navigator.filesystem.writeFile(`/profile/feed/${Date.now()}.md`, body)
  } else {
    let urlParams = new URLSearchParams()
    urlParams.set('body', body)
    beaker.browser.gotoUrl(`beaker://social/?compose&${urlParams.toString()}`)
  }
}

export async function whoami () {
  let st = await navigator.filesystem.stat('/profile')
  let key = st.mount.key
  let info = await (new DatArchive(key)).getInfo()
  return {
    title: info.title,
    description: info.description,
    type: info.type,
    url: info.url,
    toHTML: () => renderProfile(key, info)
  }
}

export async function whois (opts = {}, id) {
  let key = await DatArchive.resolveName(id)
  let info = await (new DatArchive(key)).getInfo()
  return {
    title: info.title,
    description: info.description,
    type: info.type,
    url: info.url,
    toHTML: () => renderProfile(key, info)
  }
}

export async function graph (opts = {}, id) {
  let key = !id ? (await navigator.filesystem.stat('/profile')).mount.key : await DatArchive.resolveName(id)
  let drive = new DatArchive(key)
  let [followers, following] = await Promise.all([
    navigator.filesystem.query({path: ['/profile/friends/*', '/profile/friends/*/friends/*'], mount: key}),
    drive.query({path: '/friends/*', type: 'mount'})
  ])
  followers = Array.from((new Set(followers.map(f => f.drive))))
  following = Array.from((new Set(following.map(f => f.mount))))
  
  if (opts.mutual) {
    following = new Set(following)
    let intersection = new Set(followers.filter(x => following.has(x)))
    following = followers = Array.from(intersection)

    for (let i = 0; i < following.length; i++) {
      following[i] = await whois(null, following[i])
    }
  } else {
    for (let i = 0; i < followers.length; i++) {
      followers[i] = await whois(null, followers[i])
    }
    for (let i = 0; i < following.length; i++) {
      following[i] = await whois(null, following[i])
    }
  }

  return {
    followers,
    following,
    toHTML () {
      if (opts.mutual) {
        return html`
          <div class="border-lightgray" style="padding: 0 10px 10px; margin: 5px 0">
            <h3>Mutuals (${following.length})</h3>
            ${following.map(f => html`<a href="beaker://social/${f.url.slice('dat://'.length)}">${f.title} <small>${toNiceDomain(f.url)}</small></a><br>`)}
          </div>
        `
      }
      return html`
        <div class="border-lightgray" style="padding: 0 10px 10px; margin: 5px 0">
          <h3>Following (${following.length})</h3>
          ${following.map(f => html`<a href="beaker://social/${f.url.slice('dat://'.length)}">${f.title} <small>${toNiceDomain(f.url)}</small></a><br>`)}
          <h3>Followers (${followers.length})</h3>
          ${followers.map(f => html`<a href="beaker://social/${f.url.slice('dat://'.length)}">${f.title} <small>${toNiceDomain(f.url)}</small></a><br>`)}
        </div>
      `
    }
  }
}

export async function follow (opts = {}, id) {
  var key = await DatArchive.resolveName(id)
  var res = await navigator.filesystem.query({path: '/profile/friends/*', mount: key})
  if (res.length === 0) {
    await navigator.filesystem.mount('/profile/friends/' + key, key)
  }
}

export async function unfollow (opts = {}, id) {
  var key = await DatArchive.resolveName(id)
  var res = await navigator.filesystem.query({path: '/profile/friends/*', mount: key})
  for (let k of res) {
    await navigator.filesystem.unmount(k.path)
  }
}

export function home (opts = {}) {
  var url = 'beaker://social/'
  if (opts['new-tab']) beaker.browser.openUrl(url, {setActive: true})
  else beaker.browser.gotoUrl(url)
}

export async function me (opts = {}) {
  let prof = await whoami()
  var url = 'beaker://social/' + prof.url.slice('dat://'.length)
  if (opts['new-tab']) beaker.browser.openUrl(url, {setActive: true})
  else beaker.browser.gotoUrl(url)
}

export function view (opts = {}, id) {
  if (isNumeric(id)) id = lastPosts[id - 1]
  if (id.startsWith('dat://')) id = id.slice('dat://'.length)
  var url = 'beaker://social/' + id
  if (opts['new-tab']) beaker.browser.openUrl(url, {setActive: true})
  else beaker.browser.gotoUrl(url)
}

// internal
// =

function renderProfile (key, info) {
  return html`
    <div class="border-lightgray" style="padding: 0px 10px">
      <h1><img src="asset:thumb:${info.url}" style="width: 32px; border-radius: 50%"> ${info.title}</h1>
      <p><strong>Bio:</strong> ${info.description}</p>
      <p><strong>Profile:</strong> <a href="beaker://social/${key}">beaker.network/${key}</a></p>
      <p><strong>Drive:</strong> <a href="${info.url}">${toNiceUrl(info.url)}</a></p>
    </div>
  `
}


const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const msPerMinute = 60 * 1000
const msPerHour = msPerMinute * 60
const msPerDay = msPerHour * 24
const msPerMonth = msPerDay * 30
const msPerYear = msPerDay * 365
function timeDifference (ts) {
  ts = Number(new Date(ts))
  var elapsed = ts - Date.now()
  if (elapsed > -1) elapsed = -1 // let's avoid 0 and negative values
  if (Math.abs(elapsed) < msPerMinute) {
    return rtf.format(Math.round(elapsed/1000), 'second')
  } else if (Math.abs(elapsed) < msPerHour) {
    return rtf.format(Math.round(elapsed/msPerMinute), 'minute')
  } else if (Math.abs(elapsed) < msPerDay) {
    return rtf.format(Math.round(elapsed/msPerHour), 'hour')
  } else if (Math.abs(elapsed) < msPerMonth) {
    return rtf.format(Math.round(elapsed/msPerDay), 'day')
  } else if (Math.abs(elapsed) < msPerYear) {
    return rtf.format(Math.round(elapsed/msPerMonth), 'month')
  } else {
    return rtf.format(Math.round(elapsed/msPerYear), 'year')
  }
}

function isNumeric (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}