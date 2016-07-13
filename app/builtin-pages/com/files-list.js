export function archives (entries, opts={}) {

  var head = ''
  if (opts.showHead) {
    head = yo`<div class="fl-head">
      <div class="fl-name">Name</div>
      <div class="fl-author">Author</div>
      <div class="fl-updated">Last Updated</div>
      <div class="fl-version">Version</div>
      <div class="fl-size">Size</div>
      <div class="fl-status">Status</div>
    </div>`
  }

  return yo`<div class="files-list">
    ${head}
    <div class="fl-rows">
      ${archives.map((archive, index) => {
        // is the selected archive?
        var isSelected = index === opts.selectedIndex

        // status column
        var status = ''
        if (archive.isDownloading)
          status = 'Downloading'
        else if (archive.isSharing)
          status = 'Sharing'

        // render row
        return yo`<div class=${"fl-row"+(isSelected?' selected':'')} onclick=${onClick(index)}>
          <div class="fl-name">${archive.name||'Untitled'}</div>
          <div class="fl-author">${archive.author ? archive.author.name : ''}</div>
          <div class="fl-updated">${archive.mtime ? ucfirst(niceDate(archive.mtime)) : '--'}</div>
          <div class="fl-version">${archive.version || '--'}</div>
          <div class="fl-size">${archive.size ? prettyBytes(archive.size) : '--'}</div>
          <div class="fl-status">${status}</div>
        </div>`
      })}
    </div>
  </div>`
}

export function archiveEntries (archive, entries, opts={}) {
  var head = ''
  if (opts.showHead) {
    head = yo`<div class="fl-head">
      <div class="fl-name">Name</div>
      <div class="fl-updated">Last Updated</div>
      <div class="fl-size">Size</div>
      <div class="fl-progress">Progress</div>
    </div>`
  }

  return yo`<div class="files-list">
    ${head}
    <div class="fl-rows">
      ${entries.map(entry => {
        return yo`<div class="fl-row">
          <div class="fl-name"><a href="dat://${archive.key}/${entry.name}">${entry.name}</a></div>
          <div class="fl-updated">${entry.mtime ? niceDate(entry.mtime) : ''}</div>
          <div class="fl-size">${entry.length ? prettyBytes(entry.length) : ''}</div>
          <div class="fl-progress"><progress value="100" max="100">100 %</progress></div>
        </div>`
      })}
    </div>
  </div>`
}