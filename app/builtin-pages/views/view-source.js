/* globals DatArchive beaker */

import * as yo from 'yo-yo'
import mime from 'mime'

// globals
// =

var filePath = ''
var fileContent = false

setup()
async function setup () {
  update()

  var target = await parseURL()
  var mimetype = mime.lookup(target.path)
  if (/^(video|audio|image)/.test(mimetype)) {
    fileContent = true
    filePath = target.orig
  } else {
    if (target.type === 'dat') {
      let {archive, path} = target
      try {
        // run automated fallback rules (eg, if a directory look for index.html)
        let isDirectory
        let st
        let tryStat = async (testPath) => {
          if (st) return
          try {
            console.log('trying', testPath)
            st = await archive.stat(testPath)
            // success, keep this path
            path = testPath
            console.log('it worked!', st.isDirectory())
          } catch (e) {
            // failure, ignore
          }
        }
        await tryStat(path)
        if (!st && !path.endsWith('/')) {
          await tryStat(path + '.html')
        } else if (st.isDirectory()) {
          isDirectory = true
          st = null
          await tryStat(path + 'index.html')
          await tryStat(path + 'index.md')
        }

        // files listing
        if (!st && isDirectory) {
          // show the contents
          fileContent = (await archive.readdir(path)).join('\n')
        } else {
          // read the file
          fileContent = await archive.readFile(path, 'utf8')
          filePath = path
        }
      } catch (e) {
        console.error(e)
        fileContent = e.toString()
      }
    } else {
      try {
        // just use the beaker helper to get the raw content
        fileContent = await beaker.browser.fetchBody(target.path.slice(1))
        filePath = target.path
      } catch (err) {
        console.error(err)
        fileContent = err.toString()
      }
    }
  }

  update()
}

async function parseURL () {
  var path = window.location.pathname
  if (path === '/' || !path) {
    throw new Error('Invalid URL')
  }

  if (path.startsWith('/http')) {
    return {type: 'http', path: window.location.pathname, orig: path.slice(1)}
  }

  try {
    // extract key from url
    var parts = /^\/([^/]+)(.*)/.exec(path)
    var key = parts[1]
    path = parts[2]
    return {type: 'dat', archive: new DatArchive(key), path, orig: 'dat://' + window.location.pathname.slice(1)}
  } catch (e) {
    console.error('Failed to parse URL', e)
    throw new Error('Invalid dat URL')
  }
}

// rendering
// =

function update () {
  if (!fileContent) {
    yo.update(document.querySelector('main'), yo`<main>Loading...</main>`)
  } else {
    yo.update(document.querySelector('main'), yo`
      <main>
        ${renderFile()}
      </main>
    `)
  }
}

function renderFile () {
  var url = filePath
  var mimetype = mime.lookup(filePath)

  url += '?cache-buster=' + Date.now()

  if (mimetype.startsWith('image/')) {
    return yo`
      <div class="file-view">
        <img src=${url} />
      </div>
    `
  } else if (mimetype.startsWith('video/')) {
    return yo`
      <div class="file-view">
        <video controls src=${url}></video>
      </div>
    `
  } else if (mimetype.startsWith('audio/')) {
    return yo`
      <div class="file-view">
        <audio controls src=${url}></audio>
      </div>
    `
  } else if (mimetype === 'application/pdf') {
    return yo`
      <div class="file-view" style="padding: 1rem">
        <a class="link" href=${url}>PDF (click to open)</a>
      </div>
    `
  } else {
    return yo`
      <div class="file-view">
        <textarea readonly>${fileContent}</textarea>
      </div>
    `
  }
}
