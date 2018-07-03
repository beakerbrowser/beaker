import yo from 'yo-yo'
import renderDiff from './diff'
import renderArchiveSelectBtn from './archive-select-btn'
import {pluralize, shortenHash} from '../../lib/strings'

// exported api
// =

export default function renderArchiveComparison ({base, target, revisions, onMerge, onChangeCompareTarget, onToggleRevisionCollapsed, onSelectwitchCompareArchives}) {
  var selectOpts = {onSelect: onChangeCompareTarget, toggleId: 'archive-comparison-target'}
  return yo`
    <div class="archive-comparison">
      <div class="compare-selection">
        Publish
        ${renderArchiveSelectBtn(base, selectOpts)}

        <i class="fa fa-arrow-right"></i>
        ${renderArchiveSelectBtn(target, selectOpts)}
      </div>

      ${renderRevisions({base, target, revisions, onMerge, onToggleRevisionCollapsed})}
    </div>`
}

// internal methods
// =

function renderRevisions ({base, target, revisions, onToggleRevisionCollapsed, onMerge}) {
  if (!target) {
    return yo`
      <div class="empty">
        <i class="fa fa-files-o"></i>
        <div class="label">Compare archives</div>
        <p>
          <a class="link" onclick=${onTriggerSelectAnArchive}>Select an archive</a>
          to compare with <a href=${base.url} target="_blank">${base.info.title}</a>.
          You can review the differences and merge them together.
        </p>
      </div>`
  }

  if (!revisions) {
    return 'Loading...'
  }

  if (!revisions.length) {
    return yo`
      <div class="empty">
        <i class="fa fa-check"></i>
        <div class="label">No differences found</div>
        <p>
          The files in <a href="beaker://library/${base.url}" target="_blank">${base.info.title}</a>
          are in sync with the files in
          <a href="beaker://library/${target.url}" target="_blank">${target.info.title}</a>.
        </p>
      </div>`
  }

  const onPublishRevision = (e, rev) => {
    onMerge(base, target, {paths: [rev.path]})
  }
  const onRevertRevision = (e, rev) => {
    onMerge(target, base, {paths: [rev.path]})
  }
  const onPublishAllRevisions = (e) => {
    e.preventDefault()
    onMerge(base, target)
  }
  const onRevertAllRevisions = (e) => {
    e.preventDefault()
    onMerge(target, base)
  }

  const renderRevisionContent = rev => {
    let el = ''

    if (!rev.isOpen) {
      return ''
    } else if (rev.diff && rev.diff.invalidEncoding) {
      el = yo`
        <div class="binary-diff-placeholder">
<code>1010100111001100
1110100101110100
1001010100010111</code>
          </div>`
    } else if (rev.type === 'dir') {
      el = yo`
        <div class="folder">
          <i class="fa fa-folder-open-o"></i>
          <p><code>${rev.path}</code></p>
        </div>`
    } else if (rev.diff && rev.diff.sourceTooLarge) {
      el = yo`
        <div class="source-too-large">
          <p>This diff is too large to display.</p>
        </div>`
    } else if (!(rev.diffAdditions || rev.diffDeletions)) {
      el = yo`
        <div class="empty">
          <i class="fa fa-code"></i>
          <p>Empty file</p>
        </div>
      `
    } else if (rev.diff) {
      el = renderDiff(rev.diff, rev.path)
    } else {
      el = yo`
        <div class="loading">
          <p>Loading diff...</p>
          <div class="spinner"></div>
        </div>`
    }

    return yo`<div class="revision-content">${el}</div>`
  }

  const renderRevision = rev => (
    yo`
      <div class="revision">
        <div class="revision-header ${rev.isOpen ? '' : 'collapsed'}" onclick=${() => onToggleRevisionCollapsed(rev)}>
          <div class="revision-type ${rev.change}"></div>
          <code class="path">
            ${rev.type === 'file' ? rev.path.slice(1) : rev.path}
          </code>
          ${rev.diffAdditions
            ? yo`<div class="changes-count additions">+${rev.diffAdditions}</div>`
            : ''
          }
          ${rev.diffDeletions
            ? yo`<div class="changes-count deletions">-${rev.diffDeletions}</div>`
            : ''
          }
          <div class="actions">
            <div class="btn-group">
              <button class="btn" data-tooltip="Revert" onclick=${e => onRevertRevision(e, rev)}>
                <i class="fa fa-undo"></i>
              </button>
              <button class="btn" data-tooltip="Publish" onclick=${e => onPublishRevision(e, rev)}>
                <i class="fa fa-check"></i>
              </button>
            </div>
            <div class="btn plain">
              <i class="fa fa-chevron-${rev.isOpen ? 'down' : 'up'}"></i>
            </div>
          </div>
        </div>
        ${renderRevisionContent(rev)}
      </div>
    `
  )

  var numAdditions = revisions.filter(r => r.change === 'add').length
  var numModifications = revisions.filter(r => r.change === 'mod').length
  var numDeletions = revisions.filter(r => r.change === 'del').length

  return yo`
    <div>
      <div class="archive-comparison-header">
        <span>Showing</span>
        ${numAdditions
          ? yo`
            <span class="change-count">
              ${numAdditions} ${pluralize(numAdditions, 'addition')}
            </span>`
          : ''
        }
        ${numAdditions && numModifications ? ' , ' : ''}
        ${numModifications
          ? yo`
            <span class="change-count">
              ${numModifications} ${pluralize(numModifications, 'modification')}
            </span>`
          : ''
        }
        ${numModifications && numDeletions ? ' , ' : ''}
        ${numDeletions
          ? yo`
            <span class="change-count">
              ${numDeletions} ${pluralize(numDeletions, 'deletion')}
            </span>`
          : ''
        }
        <a class="view" href="beaker://library/${target.url}" target="_blank">View target files</a>
        <div class="actions">
          <button class="btn" onclick=${onRevertAllRevisions}>
            Revert all
          </button>
          <button class="btn success publish" onclick=${onPublishAllRevisions}>
            Publish all
          </button>
        </div>
      </div>
      ${revisions.length
        ? yo`<div class="archive-comparison-list">${revisions.map(renderRevision)}</div>`
        : ''
      }
    </div>
  `
}

// event handlers
// =

function onTriggerSelectAnArchive (e) {
  e.preventDefault()
  e.stopPropagation()
  // trigger the dropdown
  document.querySelector('.compare-selection .btn').click()
}
