import * as yo from 'yo-yo'

// exported api
// =

export default function renderChanges (archiveInfo) {
  var isExpanded = {add: false, mod: false, del: false}

  // no changes
  if (archiveInfo.diff.length === 0) {
    return yo`<em>No changes have been made.</em>`
  }

  var numColumns = 0
  numColumns += archiveInfo.diff.find(d => d.change === 'add') ? 1 : 0
  numColumns += archiveInfo.diff.find(d => d.change === 'mod') ? 1 : 0
  numColumns += archiveInfo.diff.find(d => d.change === 'del') ? 1 : 0
  var maxLen = ([100, 35, 20])[numColumns - 1]

  // helper to render files
  const rFile = (d, icon, change) => {
    var formattedPath = d.path.slice(1)
    var len = d.path.slice(1).length

    if (len > maxLen) {
      formattedPath = '...' + formattedPath.slice(len - maxLen, len + 1)
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
      <div class="files">
        ${files.slice(0, sliceEnd).map(d => rFile(d, icon, change))}
        ${hasMore ? yo`<a class="link show-all" onclick=${onExpand(change)}>Show more <i class="fa fa-angle-down"></i></a>` : ''}
      </div>
    `
  }

  // helper to render all
  const rChanges = () => yo`
    <div class="changes-list">
      ${rChange('add', 'plus', 'addition')}
      ${rChange('mod', 'circle-o', 'change')}
      ${rChange('del', 'close', 'deletion')}
    </div>
  `

  // helper to expand the changes list
  const onExpand = change => e => {
    isExpanded[change] = !isExpanded[change]
    redraw()
  }

  const redraw = () => {
    yo.update(document.querySelector('.changes-list'), rChanges())
  }

  return rChanges()
}
