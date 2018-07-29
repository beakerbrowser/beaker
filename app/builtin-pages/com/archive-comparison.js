import _get from 'lodash.get'
import yo from 'yo-yo'
import renderDiff from './diff'
import renderArchiveSelectBtn from './archive-select-btn'
import {pluralize, shortenHash} from '../../lib/strings'

// exported api
// =

export default function renderArchiveComparison (opts = {}) {
  var {
    base,
    target,
    isLocalSyncPath,
    labels,
    revisions,
    archiveOptions,
    isRevOpen,
    onMerge,
    onChangeCompareBase,
    onChangeCompareTarget,
    onToggleRevisionCollapsed,
    onDeleteDraft,
    onSelectwitchCompareArchives
  } = opts

  labels = Object.assign({},
    {
      desc: 'Publish',
      base: 'draft',
      target: 'publishd',
      copyAll: 'Publish all revisions',
      copy: 'Publish',
      revert: 'Revert',
      count: 'unpublished revision'
    },
    labels
  )
  isRevOpen = isRevOpen || defaultIsRevOpen

  var numRevisions = revisions ? revisions.filter(r => !r.debug_shouldIgnoreChange).length : 0

  const onCopyAll = (e) => {
    e.preventDefault()
    if (confirm(`${labels.copyAll} to "${getSafeTitle(target)}"?`)) {
      onMerge(base, target)
    }
  }

  return yo`
    <div class="archive-comparison">
      <div class="compare-selection">
        <span>${labels.desc}</span>

        ${isLocalSyncPath
          ? (target && target.info ? target.info.userSettings.localSyncPath : '')
          : [
            (onChangeCompareBase
              ? renderArchiveSelectBtn(base, {archiveOptions, onSelect: onChangeCompareBase, toggleId: 'archive-comparison-base'})
              : renderArchive(base)),
            yo`
              <span>
                to
                <i class="fa fa-arrow-right"></i>
              </span>`,
            (onChangeCompareTarget
              ? renderArchiveSelectBtn(target, {archiveOptions, onSelect: onChangeCompareTarget, toggleId: 'archive-comparison-target'})
              : renderArchive(target))
          ]}

        ${numRevisions > 0
          ? yo`
            <div class="actions">
              <button class="btn success publish" onclick=${onCopyAll}>
                ${labels.copyAll}
              </button>
            </div>`
          : ''
        }
      </div>

      ${renderRevisions({base, target, isLocalSyncPath, labels, revisions, isRevOpen, onMerge, onToggleRevisionCollapsed, onDeleteDraft})}

      <div class="compare-footer">
        ${numRevisions > 0
          ? yo`
              <span class="revisions-count">
                ${numRevisions} ${pluralize(numRevisions, labels.count)}
              </span>
            `
          : ''
        }

        <div class="links">
          ${base ? yo`<a href=${base.url} target="_blank">View ${labels.base}</a>` : ''}
          ${base && target ? yo`<span class="separator">|</span>` : ''}
          ${target ? yo`<a href=${target.url} target="_blank">View ${labels.target}</a>` : ''}
          ${isLocalSyncPath ? yo`<span class="separator">|</span>` : ''}
          ${isLocalSyncPath ? yo`<a class="link" onmousedown=${onOpenPreview} target="_blank">View preview</a>` : ''}
        </div>
      </div>
    </div>`
}

// internal methods
// =

function renderArchive (archive) {
  if (!archive) return ''
  return yo`
    <span>
      <img class="favicon" src="beaker-favicon:${archive.url}" /> ${getSafeTitle(archive)}
    </span>
  `
}

function renderRevisions ({base, target, isLocalSyncPath, labels, revisions, isRevOpen, onToggleRevisionCollapsed, onMerge, onDeleteDraft}) {
  let either = target || base
  if (!isLocalSyncPath && either && (!target || !base)) {
    return yo`
      <div class="empty">
        <div class="empty-header">
          <i class="fa fa-files-o"></i>
          <div class="label">Compare archives</div>
        </div>
        <p>
          <a class="link" onclick=${onTriggerSelectAnArchive}>Select an archive</a>
          to compare with <a href=${either.url} target="_blank">${getSafeTitle(either)}</a>.
          You can review the differences and merge them together.
        </p>
      </div>`
  }

  if (!revisions) {
    return 'Loading...'
  }

  if (!revisions.length) {
    if (isLocalSyncPath) {
      return yo`
        <div class="empty">
          <div class="empty-header">
            <i class="fa fa-check"></i>
            <div class="label">You${"'"}re all set!</div>
          </div>

          <p>
            The files in <a href="beaker://library/${target.url}" onclick=${gotoHomeView}>${getSafeTitle(target)}</a>
            are in sync with the files in
            <span>${target.info.userSettings.localSyncPath}</span>.
          </p>
        </div>`
    } else {
      return yo`
        <div class="empty">
          <div class="empty-header">
            <i class="fa fa-check"></i>
            <div class="label">You${"'"}re all set!</div>
          </div>

          <p>
            The files in <a href="beaker://library/${base.url}" target="_blank">${getSafeTitle(base)}</a>
            are in sync with the files in
            <a href="beaker://library/${target.url}" target="_blank">${getSafeTitle(target)}</a>.
          </p>

          ${onDeleteDraft
            ? yo`
              <button class="btn delete-draft-btn" onclick=${e => onDeleteDraft(e, base, false)}>
                Delete draft
              </button>`
            : ''}
        </div>`
    }
  }

  const onCopy = (e, rev) => {
    e.stopPropagation()
    const path = rev.path.startsWith('/') ? rev.path.slice(1, rev.path.length) : rev.path

    if (confirm(`${labels.copy} the changes in ${path} to "${getSafeTitle(target)}"?`)) {
      onMerge(base, target, {paths: [rev.path]})
    }
  }

  const onRevertRevision = (e, rev) => {
    e.stopPropagation()
    const path = rev.path.startsWith('/') ? rev.path.slice(1, rev.path.length) : rev.path

    if (confirm(`${labels.revert} the changes to ${path}?`)) {
      onMerge(target, base, {paths: [rev.path]})
    }
  }

  const renderRevisionContent = rev => {
    let el = ''

    if (!isRevOpen(rev)) {
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
        <div class="revision-header ${isRevOpen(rev) ? '' : 'collapsed'}" onclick=${() => onToggleRevisionCollapsed(rev)}>
          <div class="revision-indicator ${rev.change}"></div>

          <span class="path">
            ${rev.type === 'file' ? rev.path.slice(1) : rev.path}
          </span>

          ${rev.diffAdditions
            ? yo`<div class="changes-count additions">+${rev.diffAdditions}</div>`
            : ''
          }

          ${rev.diffDeletions
            ? yo`<div class="changes-count deletions">-${rev.diffDeletions}</div>`
            : ''
          }

          <div class="actions">
            <button class="btn tooltip-container" data-tooltip=${labels.revert} onclick=${e => onRevertRevision(e, rev)}>
              <span class="fa fa-undo"></span>
            </button>

            <button class="btn" onclick=${e => onCopy(e, rev)}>
              ${labels.copy}
            </button>

            <div class="btn plain">
              <i class="fa fa-chevron-${isRevOpen(rev) ? 'down' : 'up'}"></i>
            </div>
          </div>
        </div>
        ${renderRevisionContent(rev)}
      </div>
    `
  )

  function onTriggerSelectAnArchive (e) {
    e.preventDefault()
    e.stopPropagation()
    // trigger the dropdown
    if (target) {
      document.querySelector('[data-toggle-id="archive-comparison-base"] .btn').click()
    } else {
      document.querySelector('[data-toggle-id="archive-comparison-target"] .btn').click()
    }
  }

  var numModifications = revisions.filter(r => r.change === 'mod').length
  var numAdditions = revisions.filter(r => r.change === 'add').length
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
      </div>

      ${revisions.length
        ? yo`<div class="archive-comparison-list">${revisions.map(renderRevision)}</div>`
        : ''
      }
    </div>
  `
}

// helpers
// =

function getSafeTitle (archive) {
  return _get(archive, 'info.title', '').trim() || yo`<em>Untitled</em>`
}

function defaultIsRevOpen (rev) {
  return rev.isOpen
}

function onOpenPreview (e) {
  if (e.which == 1 || e.which == 2) {
    // left or middle
    document.body.dispatchEvent(new CustomEvent('custom-open-preview-dat'))
  }
}

function gotoHomeView (e) {
  e.preventDefault()
  var detail = {
    href: e.currentTarget.getAttribute('href'),
    view: 'files'
  }
  document.body.dispatchEvent(new CustomEvent('custom-set-view', {detail}))
}
