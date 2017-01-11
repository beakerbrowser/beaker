import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {shortenHash} from '../../lib/strings'
import {niceDate} from '../../lib/time'
import {pushUrl} from '../../lib/fg/event-handlers'

// exported api
// =

export function archiveAbout (archive) {
  return yo`<table class="archive-about">
    <tr><td>Type</td><td>Website</td></tr>
    <tr><td>Size</td><td>${prettyBytes(archive.info.size)} <span class="thin muted">(${prettyBytes(archive.info.metaSize)} metadata)</span></td></tr>
    <tr><td>Updated</td><td>${niceDate(archive.info.mtime)}</td></tr>
    ${rProvinence(archive)}
  </table>`
}

function rProvinence (archive) {
  var infoEls = []
  if (archive.forkOf) infoEls.push(yo`<tr><td></td><td><span class="icon icon-flow-branch"></span> Fork of <a href=${viewUrl(archive.forkOf)} onclick=${pushUrl}>${shortenHash(archive.forkOf)}</a></td></tr>`)
  if (archive.info.createdBy) infoEls.push(yo`<tr><td></td><td><span class="icon icon-code"></span> Created by <a href=${viewUrl(archive.info.createdBy.url)} onclick=${pushUrl}>${archive.info.createdBy.title || shortenHash(archive.info.createdBy.url)}</a></td></tr>`)
  return infoEls
}

function viewUrl (url) {
  if (url.startsWith('dat://')) {
    return 'beaker:archive/' + url.slice('dat://'.length)
  }
  return url
}