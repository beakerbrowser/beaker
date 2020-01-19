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
    path: ['/profile/posts/*/*', '/profile/follows/*/posts/*/*'],
    sort: 'name',
    reverse: true,
    limit: opts.num,
    offset: (opts.page - 1) * opts.num
  })
  let profiles = {}
  for (let post of posts) {
    lastPosts.push(post.url)
    profiles[post.drive] = post.drive = profiles[post.drive] || await (new Hyperdrive(post.drive)).getInfo()
  }
  posts.toHTML = () => {
    return posts.map((post, i) => html`
      <div class="border-lightgray" style="margin-bottom: 5px; padding: 5px; overflow: hidden; white-space: nowrap; overflow: hidden;">
        <div style="display: flex; align-items: center; font-size: 10px; margin-bottom: 2px;">
          <strong class="color-lightgray" style="margin-right: 5px">${i + 1}.</strong>
          <a href="beaker://social/${post.drive.url.slice('hd://'.length)}" style="margin-right: 5px">${post.drive.title}</a>
          <a class="color-lightgray" href="beaker://social/${post.url.slice('hd://'.length)}" style="margin-right: 10px"><small>${timeDifference(post.stat.ctime)}</small></a>
        </div>
        <div style="font-size: 14px">
          <a href=${post.stat.metadata.href || post.url}><strong>${post.stat.metadata.title}</strong></a>
        </div>
      </div>
    `).reverse()
  }
  return posts
}

export async function post (opts = {}, title = '') {
  if (opts.link && opts.file) {
    throw new Error('Must give a file or a link (cannot give both)')
  }
  if (!opts.link && !opts.file) {
    throw new Error('Must give a file (-f) or link (-l)')
  }
  title = title.trim()
  if (!title) throw new Error('Must give a title')
  if (opts.file) opts.file = this.env.resolve(opts.file)

  let urlParams = new URLSearchParams()
  urlParams.set('from-cli', 1)
  urlParams.set('title', title)
  if (opts.topic) urlParams.set('topic', opts.topic)
  if (opts.link) {
    urlParams.set('type', 'link')
    urlParams.set('url', opts.link)
  } else {
    urlParams.set('type', 'file')
    urlParams.set('file', opts.file)
  }
  this.page.goto(`beaker://social/compose?${urlParams.toString()}`)
}

export async function whoami () {
  let st = await navigator.filesystem.stat('/profile')
  let key = st.mount.key
  let info = await (new Hyperdrive(key)).getInfo()
  return {
    title: info.title,
    description: info.description,
    type: info.type,
    url: info.url,
    toHTML: () => renderProfile(key, info)
  }
}

export async function whois (opts = {}, id) {
  let key = await Hyperdrive.resolveName(id)
  let info = await (new Hyperdrive(key)).getInfo()
  return {
    title: info.title,
    description: info.description,
    type: info.type,
    url: info.url,
    toHTML: () => renderProfile(key, info)
  }
}

export async function find (opts = {}, query = '') {
  query = ('' + query).toLowerCase()
  var candidates = await navigator.filesystem.query({
    type: 'mount',
    path: ['/profile', '/profile/follows/*', '/profile/follows/*/follows/*']
  })

  // remove duplicates
  {
    let candidates2 = []
    let set = new Set()
    for (const item of candidates) {
      if(!set.has(item.mount)){
        set.add(item.mount)
        candidates2.push(item)
      }
    }
    candidates = candidates2
  }

  var hits = []
  const test = v => ('' + (v || '')).toLowerCase().includes(query)
  for (let candidate of candidates) {
    let profile = await whois({}, candidate.mount)
    if (test(profile.title) || test(profile.description)) {
      if (!hits.find(p2 => p2.url === profile.url)) {
        hits.push(profile)
      }
    }
  }

  Object.defineProperty(hits, 'toHTML', {
    enumerable: false,
    value: () => {
      return html`
        <div class="border-lightgray" style="padding: 0 10px; margin: 5px 0">
          ${hits.length === 0 ? html`<p><em>No matches found in your follows or foafs</em></p>` : ''}
          ${hits.map(f => html`
            <p>
              <a href="beaker://social/${f.url.slice('hd://'.length)}">
                <strong>${f.title}</strong>
                <small>${toNiceDomain(f.url)}</small>
              </a>
              ${f.description || ''}
            </p>
          `)}
        </div>
      `
    }
  })

  return hits
}

export async function graph (opts = {}, id) {
  let key = !id ? (await navigator.filesystem.stat('/profile')).mount.key : await Hyperdrive.resolveName(id)
  let drive = new Hyperdrive(key)
  let [followers, following] = await Promise.all([
    navigator.filesystem.query({path: ['/profile/follows/*', '/profile/follows/*/follows/*'], mount: key}),
    drive.query({path: '/follows/*', type: 'mount'})
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
            ${following.map(f => html`<a href="beaker://social/${f.url.slice('hd://'.length)}">${f.title} <small>${toNiceDomain(f.url)}</small></a><br>`)}
          </div>
        `
      }
      return html`
        <div class="border-lightgray" style="padding: 0 10px 10px; margin: 5px 0">
          <h3>Following (${following.length})</h3>
          ${following.map(f => html`<a href="beaker://social/${f.url.slice('hd://'.length)}">${f.title} <small>${toNiceDomain(f.url)}</small></a><br>`)}
          <h3>Followers (${followers.length})</h3>
          ${followers.map(f => html`<a href="beaker://social/${f.url.slice('hd://'.length)}">${f.title} <small>${toNiceDomain(f.url)}</small></a><br>`)}
        </div>
      `
    }
  }
}

export async function follow (opts = {}, id) {
  var key = await Hyperdrive.resolveName(id)
  var res = await navigator.filesystem.query({path: '/profile/follows/*', mount: key})
  if (res.length === 0) {
    await navigator.filesystem.mount('/profile/follows/' + key, key)
  }
}

export async function unfollow (opts = {}, id) {
  var key = await Hyperdrive.resolveName(id)
  var res = await navigator.filesystem.query({path: '/profile/follows/*', mount: key})
  for (let k of res) {
    await navigator.filesystem.unmount(k.path)
  }
}

export function home (opts = {}) {
  var url = 'beaker://social/'
  this.page.goto(url, {newTab: opts['new-tab']})
}

export async function me (opts = {}) {
  let prof = await whoami()
  var url = 'beaker://social/' + prof.url.slice('hd://'.length)
  this.page.goto(url, {newTab: opts['new-tab']})
}

export function view (opts = {}, id) {
  if (isNumeric(id)) id = lastPosts[id - 1]
  if (id.startsWith('hd://')) id = id.slice('hd://'.length)
  var url = 'beaker://social/' + id
  this.page.goto(url, {newTab: opts['new-tab']})
}

// internal
// =

function renderProfile (key, info) {
  return html`
    <div class="border-lightgray" style="padding: 0px 10px">
      <h1><img src="${info.url}/thumb" style="width: 32px; border-radius: 50%"> ${info.title}</h1>
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