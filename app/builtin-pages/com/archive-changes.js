import * as yo from 'yo-yo'
import {pluralize} from '../../lib/strings'

// exported api
// =

export default function renderChanges (archiveInfo, {onPublish, onRevert}) {
  var stats = archiveInfo.diffStats
  var isExpanded = {add: false, mod: false, del: false}

  // no changes
  if (archiveInfo.diff.length === 0) {
    return yo`<em>No changes have been made.</em>`
  }

  // helper to render files
  const rFile = (d, icon, change) => {
    var formattedPath = d.path.slice(1)
    var len = d.path.slice(1).length

    if (len > 25) {
      formattedPath = '...' + formattedPath.slice(len - 25, len + 1)
    }

    return yo`
      <div class="file">
        <i class="op ${change} fa fa-${icon}"></i>
        <a class="link" title=${d.path} href=${archiveInfo.url + d.path}>${formattedPath}</a>
      </div>`
  }

  // helper to render a kind of change (add / mod / del)
  const rChange = (change, icon, label) => {
    var files = archiveInfo.diff.filter(d => d.change === change)
    if (files.length === 0) {
      return ''
    }
    var sliceEnd = 20
    // if expanded or files.length is one item longer than limit, show all files
    if (isExpanded[change] || (files.length - sliceEnd === 1)) {
      sliceEnd = files.length
    }
    var hasMore = sliceEnd < files.length
    return yo`
      <div class="change">
        <div class="heading ${change}"><i class="fa fa-${icon} op"></i> <span>${stats[change]} ${pluralize(stats[change], label)}</span></div>
        <div class="files">
          ${files.slice(0, sliceEnd).map(rFile)}
          ${hasMore ? yo`<a class="link show-all" onclick=${onToggle(change)}>Show more</a>` : ''}
        </div>
      </div>
    `
  }

  // helper to render all
  const rChanges = () => yo`
    <div class="changes">
      <div class="actions">
        <a class="btn primary" onclick=${onPublish}>Publish changes</a>
        <a class="btn" onclick=${onRevert}>Revert changes</a>
      </div>
      <div>
        ${rChange('add', 'plus', 'addition')}
        ${rChange('mod', 'circle-o', 'change')}
        ${rChange('del', 'close', 'deletion')}
      </div>
    </div>
  `

  // helper to expand the changes list
  const onToggle = change => e => {
    isExpanded[change] = !isExpanded[change]
    redraw()
  }

  const redraw = () => {
    yo.update(document.querySelector('.changes'), rChanges())
  }

  return rChanges()
}