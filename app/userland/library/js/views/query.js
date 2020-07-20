import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import queryCSS from '../../css/views/query.css.js'
import { removeMarkdown } from 'beaker://app-stdlib/vendor/remove-markdown.js'

export class QueryView extends LitElement {
  static get properties () {
    return {
      filter: {type: String},
      hideEmpty: {type: Boolean, attribute: 'hide-empty'},
      queryId: {type: Number, attribute: 'query-id'}
    }
  }

  static get styles () {
    return queryCSS
  }

  constructor () {
    super()
    this.filter = undefined
    this.hideEmpty = false
    this.queryId = 0
  }

  load () {

  }

  updated (changedProperties) {
    if (changedProperties.has('filter')) {
      if (this._loadTimeout) {
        clearTimeout(this._loadTimeout)
      }
      this._loadTimeout = setTimeout(() => {
        this.requestUpdate()
        this._loadTimeout = undefined
      }, 500)
    }
  }

  // rendering
  // =

  render () {
    return html`
      <iframe src="hyper://b0e49551af1717e8f475337dca43a8cb3fa1ca73ff11b7cfe0eff94bcb3079fb/query.html#filter=${this.filter}"></iframe>
    `
  }

  // events
  // =

}

customElements.define('query-view', QueryView)



function filterToRegex (filter) {
  return new RegExp(filter, 'gi')
}

let _driveTitleCache = {}
async function getDriveTitle (url) {
  if (_driveTitleCache[url]) return _driveTitleCache[url]
  _driveTitleCache[url] = beaker.hyperdrive.getInfo(url).then(info => info.title)
  return _driveTitleCache[url]
}

function matchAndSliceString (filter, str) {
  let re = filterToRegex(filter)
  if (!str) return false
  let match = re.exec(str)
  if (!match) return false
  let matchStart = re.lastIndex - filter.length
  let matchEnd = re.lastIndex
  let phraseStart = matchStart - 40
  let phraseEnd = matchEnd + 70
  let strLen = str.length
  str = str.slice(Math.max(0, phraseStart), matchStart) + `<mark>${str.slice(matchStart, matchEnd)}</mark>` + str.slice(matchEnd, Math.min(phraseEnd, strLen))
  if (phraseStart > 0) str = '...' + str
  if (phraseEnd < strLen) str = str + '...'
  return str
}

const DEBUG_QUERIES = [
  {
    title: 'Feed',
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let drive = addressBook.profiles.concat(addressBook.contacts).map(item => item.key)
      var candidates = await beaker.hyperdrive.query({
        type: 'file',
        drive,
        path: '/microblog/*.md',
        sort: 'mtime',
        reverse: true,
        limit: filter ? undefined : limit,
        offset: filter ? undefined : offset
      })


      var results = []
      for (let candidate of candidates) {
        let content = await beaker.hyperdrive.readFile(candidate.url, 'utf8').catch(e => undefined)
        if (filter) {
          content = removeMarkdown(content || '')
          content = matchAndSliceString(filter, content)
          if (!content) continue
        } else {
          content = beaker.markdown.toHTML(content || '')
        }
        candidate.driveTitle = await getDriveTitle(candidate.drive)
        candidate.content = content
        results.push(candidate)
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }

      return results
    },
    views: {
      card (row) {
        var dateFormatter = new Intl.DateTimeFormat('en-us', {day: "numeric", month: "short", year: "numeric",})
        var timeFormatter = new Intl.DateTimeFormat('en-US', {hour12: true, hour: "2-digit", minute: "2-digit"})
        return `
          <div style="max-width: 620px; margin: 20px auto; border: 1px solid #ccc; padding: 10px 12px; border-radius: 4px; background: #fff;">
            <div style="display: flex; align-items: center;">
              <img src="${row.drive}thumb" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover; margin-right: 5px;">
              <a href=${row.drive} style="font-weight: 500; color: #555">${row.driveTitle}</a>
              <span style="flex: 1"></span>
              <a href=${row.url} style="color: #555">${dateFormatter.format(row.stat.mtime)} <small>${timeFormatter.format(row.stat.mtime)}</small></a>
            </div>
            <div>${row.content}</div>
          </div>
        `
      }
    },
  },
  {
    title: 'Blog posts',
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let drive = addressBook.profiles.concat(addressBook.contacts).map(item => item.key)
      var candidates = await beaker.hyperdrive.query({
        type: 'file',
        drive,
        path: '/blog/*.md',
        sort: 'mtime',
        reverse: true,
        limit: filter ? undefined : limit,
        offset: filter ? undefined : offset
      })

      var results = []
      for (let candidate of candidates) {
        let title = candidate.stat.metadata.title || candidate.path.split('/').pop()
        let content = await beaker.hyperdrive.readFile(candidate.url).catch(e => undefined)
        content = removeMarkdown(content || '')
        if (filter) {
          let contentMatch = matchAndSliceString(filter, content)
          if (contentMatch) content = contentMatch
          let titleMatch = matchAndSliceString(filter, title)
          if (titleMatch) title = titleMatch
          if (!contentMatch && !titleMatch) continue
        } else {
          if (content.length > 300) {
            content = content.slice(0, 300) + '...'
          }
        }
        candidate.driveTitle = await getDriveTitle(candidate.drive)
        candidate.title = title
        candidate.content = content
        results.push(candidate)
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }
      return results
    },
    views: {
      card (row) {
        return `
          <div style="border: 1px solid #ccc; padding: 14px 16px; background: #fff; border-radius: 4px; margin: 16px auto; max-width: 700px">
            <div><a href=${row.drive} style="color: #777">${row.driveTitle}</a></div>
            <h2 style="margin: 0"><a href=${row.url} style="color: #555">${row.title}</a></h2>
            <div style="margin: 0.6em 0 0">${row.content}</div>
          </div>
        `
      }
    }
  },
  DEBUG_LINKS_QUERY('Modules', 'modules'),
  DEBUG_LINKS_QUERY('Apps', 'apps'),
  {
    title: 'Users',
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let candidates = addressBook.profiles.concat(addressBook.contacts)

      var results = []
      for (let candidate of candidates) {
        let {url, title, description} = await beaker.hyperdrive.getInfo(candidate.key)
        if (filter) {
          let titleMatch = matchAndSliceString(filter, title)
          if (titleMatch) title = titleMatch
          let descriptionMatch = matchAndSliceString(filter, description)
          if (descriptionMatch) description = descriptionMatch
          if (!titleMatch && !descriptionMatch) continue
        } else {
          if (description.length > 300) {
            description = description.slice(0, 300) + '...'
          }
        }
        results.push({
          url,
          title,
          description,
          toHTML: () => `
            <img src="${url}thumb" style="float: left; border-radius: 50%; width: 40px; height: 40px; object-fit: cover; margin-right: 10px">
            <h1><a href="${url}">${title}</a></h1>
            <div><q>${description}</q></div>
          `
        })
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }
      return results
    }
  }
]
function DEBUG_LINKS_QUERY (title, id) {
  return {
    title,
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let drive = addressBook.profiles.concat(addressBook.contacts).map(item => item.key)
      var candidates = await beaker.hyperdrive.query({
        type: 'file',
        drive,
        path: `/links/${id}/*.goto`,
        sort: 'mtime',
        reverse: true,
        limit: filter ? undefined : limit,
        offset: filter ? undefined : offset
      })

      var results = []
      var re = filter ? filterToRegex(filter) : undefined
      for (let candidate of candidates) {
        let title = candidate.stat.metadata.title || candidate.path.split('/').pop()
        let description = candidate.stat.metadata.description || ''
        let href = candidate.stat.metadata.href || ''
        let hrefDecorated = href
        if (re) {
          if (!title || !href) continue
          let match = false
          title = title.replace(re, string => {
            match = true
            return `<mark>${string}</mark>`
          })
          description = description.replace(re, string => {
            match = true
            return `<mark>${string}</mark>`
          })
          // hrefDecorated = href.replace(re, string => {
          //   match = true
          //   return `<mark>${string}</mark>`
          // })
          if (!match) continue
        }
        candidate.driveTitle = await getDriveTitle(candidate.drive)
        candidate.href = href
        candidate.title = title
        candidate.description = description
        results.push(candidate)
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }
      return results
    },
    views: {
      card (row) {
        return `
          <div style="border: 1px solid #ccc; padding: 14px 16px; background: #fff; border-radius: 4px; margin: 16px auto; max-width: 700px">
            <div>Shared by <a href=${row.drive} style="color: #777">${row.driveTitle}</a></div>
            <h2 style="margin: 5px 0"><a href=${row.url} style="color: #555">${row.title}</a></h2>
            ${row.description ? `<div>${row.description}</div>` : ''}
          </div>
        `
      }
    }
  }
}