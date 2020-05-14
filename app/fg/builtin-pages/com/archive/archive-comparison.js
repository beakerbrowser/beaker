/* globals confirm CustomEvent */

import _get from 'lodash.get'
import yo from 'yo-yo'
import renderDiff from './diff'
import renderArchiveSelectBtn from './archive-select-btn'
import renderBackLink from '../back-link'
import {pluralize, shortenHash} from '../../../../lib/strings'

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
      target: 'published',
      copyAll: 'Publish all',
      copy: 'Publish',
      revert: 'Revert',
      revertAll: 'Revert all',
      things: 'revisions',
      count: 'unpublished revision'
    },
    labels
  )
  isRevOpen = isRevOpen || defaultIsRevOpen

  var numRevisions = revisions ? revisions.filter(r => !r.debug_shouldIgnoreChange).length : 0

  const onCopyAll = (e) => {
    e.preventDefault()
    if (confirm(`${labels.copyAll} ${labels.things} to "${getSafeTitle(target)}"?`)) {
      onMerge(base, target, {shallow: false})
    }
  }

  const onRevertAll = (e) => {
    e.preventDefault()
    if (confirm(`${labels.revertAll} ${labels.things} "${getSafeTitle(target)}"?`)) {
      onMerge(target, base, {shallow: false})
    }
  }

  return yo`
    <div class="archive-comparison">
      ${isLocalSyncPath ? renderBackLink('#', 'Back') : ''}

      ${numRevisions > 0
        ? yo`
          <div class="compare-selection">
            <span class="revisions-count">
              ${numRevisions} ${pluralize(numRevisions, labels.count)}
            </span>

            ${isLocalSyncPath
              ? (_get(target, 'info.userSettings.localSyncPath', ''))
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
              ]
            }

            <div class="actions">
              <button
                class="btn revert tooltip-container"
                onclick=${onRevertAll}
                data-tooltip="Revert all changes">
                  ${labels.revertAll}
              </button>

              <button
                class="btn success publish tooltip-container"
                onclick=${onCopyAll}
                data-tooltip="${labels.copyAll} ${labels.things}">
                  ${labels.copyAll}
              </button>
            </div>
          </div>`
        : ''
      }

      ${renderRevisions({base, target, isLocalSyncPath, labels, revisions, isRevOpen, onMerge, onToggleRevisionCollapsed, onDeleteDraft})}

      <div class="compare-footer">
        ${!isLocalSyncPath
          ? yo`
            <div class="links">
              ${base ? yo`<a href=${base.url} target="_blank">View ${labels.base}</a>` : ''}
              ${base && target ? yo`<span class="separator">|</span>` : ''}
              ${target ? yo`<a href=${target.url} target="_blank">View ${labels.target}</a>` : ''}
            </div>`
          : numRevisions > 0
            ?
              yo`
                <div class="links">
                  <a
                    href="${target.checkout().url}"
                    target="_blank">
                    Published version
                  </a>
                  <span class="separator">|</span>
                  <a
                    href="${target.checkout('preview').url}"
                    target="_blank">
                    Local preview
                  </a>
                </div>
              `
            : ''
          }
      </div>
    </div>`
}

// internal methods
// =

function renderArchive (archive) {
  if (!archive) return ''
  return yo`
    <span>
      <img class="favicon" src="beaker-favicon:${archive.url}" /> ${getSafeTitleHTML(archive)}
    </span>
  `
}

function renderRevisions ({base, target, isLocalSyncPath, labels, revisions, isRevOpen, onToggleRevisionCollapsed, onMerge, onDeleteDraft}) {
  let either = target || base
  if (!isLocalSyncPath && either && (!target || !base)) {
    return yo`
      <div class="empty">
        <div class="empty-header">
          <i class="fas fa-copy"></i>
          <div class="label">Compare archives</div>
        </div>
        <p>
          <a class="link" onclick=${onTriggerSelectAnArchive}>Select an archive</a>
          to compare with <a href=${either.url} target="_blank">${getSafeTitleHTML(either)}</a>.
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
            <div class="label">No unpublished changes</div>
          </div>

          ${target.info.userSettings.localSyncPath
            ? yo`
                <p class="empty-description">
                  The files in <a href="beaker://library/${target.url}" onclick=${gotoHomeView}>${getSafeTitleHTML(target)}</a>
                  are in sync with the files in
                  <span onclick=${() => onOpenFolder(target.info.userSettings.localSyncPath)} class="link">${target.info.userSettings.localSyncPath}</span>.
                </p>`
            : yo`
                <p class="empty-description">
                  All the files in <a href="beaker://library/${target.url}" onclick=${gotoHomeView}>${getSafeTitleHTML(target)}</a> have been published to the network.
                </p>`
          }

          <a href="${target.url}" target="_blank" class="btn open-link primary">
            <span class="fas fa-external-link-alt"></span>
            Open ${getSafeTitleHTML(target)}
          </a>
        </div>`
    } else {
      return yo`
        <div class="empty">
          <div class="empty-header">
            <i class="fa fa-check"></i>
            <div class="label">You${"'"}re all set!</div>
          </div>

          <p>
            The files in <a href="beaker://library/${base.url}" target="_blank">${getSafeTitleHTML(base)}</a>
            are in sync with the files in
            <a class="link" href="beaker://library/${target.url}" target="_blank">${getSafeTitleHTML(target)}</a>.
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
    var path = rev.path.startsWith('/') ? rev.path.slice(1, rev.path.length) : rev.path

    if (confirm(`${labels.copy} the ${labels.things} in ${path} to "${getSafeTitle(target)}"?`)) {
      var paths = [rev.path + (rev.type === 'dir' ? '/' : '')] // trailing slash indicates directory
      onMerge(base, target, {paths, shallow: false})
    }
  }

  const onRevertRevision = (e, rev) => {
    e.stopPropagation()
    var path = rev.path.startsWith('/') ? rev.path.slice(1, rev.path.length) : rev.path

    if (confirm(`${labels.revert} the ${labels.things} to ${path}?`)) {
      var paths = [rev.path + (rev.type === 'dir' ? '/' : '')] // trailing slash indicates directory
      onMerge(target, base, {paths, shallow: false})
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
    } else if (!rev.diff) {
      el = yo`
        <div class="empty">
          <p>Loading...</p>
        </div>`
    } else if (!(rev.diffAdditions || rev.diffDeletions)) {
      el = yo`
        <div class="empty">
          <p>Empty file</p>
        </div>`
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

          ${isRevOpen(rev) && rev.diffAdditions
            ? yo`<div class="changes-count additions">+${rev.diffAdditions}</div>`
            : ''
          }

          ${isRevOpen(rev) && rev.diffDeletions
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
  return _get(archive, 'info.title', '').trim() || 'Untitled'
}

function getSafeTitleHTML (archive) {
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

function onOpenFolder (path) {
  document.body.dispatchEvent(
    new CustomEvent(
      'custom-open-local-folder',
      {'detail': {path}}
    )
  )
}

function gotoHomeView (e) {
  e.preventDefault()
  var detail = {
    href: e.currentTarget.getAttribute('href'),
    view: 'files'
  }
  document.body.dispatchEvent(new CustomEvent('custom-set-view', {detail}))
}
