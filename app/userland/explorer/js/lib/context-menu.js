import { html } from '../../vendor/lit-element/lit-element.js'
import { writeToClipboard } from '../lib/clipboard.js'
import * as toast from '../com/toast.js'
import { joinPath } from './strings.js'
import * as loc from './location.js'

export function constructItems (app) {
  var items = []
  if (app.selection.length === 1 || app.pathInfo.isFile()) {
    let sel = app.selection[0] || app.locationAsItem
    let writable = app.selection.reduce((acc, v) => acc && v.drive.writable, true)
    items.push({
      icon: 'fas fa-fw fa-external-link-alt',
      label: `${app.attachedMode ? 'Open' : 'Explore'} in new tab`,
      click: () => app.goto(sel, true)
    })
    if (!app.attachedMode) {
      items.push({
        icon: 'fas fa-fw fa-desktop',
        label: 'Open',
        click: () => app.goto(app.getShareUrl(sel), true, true)
      })
    }
    items.push({
      icon: html`
        <i class="fa-stack" style="font-size: 6px">
          <span class="far fa-fw fa-hdd fa-stack-2x"></span>
          <span class="fas fa-fw fa-share fa-stack-1x" style="margin-left: -10px; margin-top: -5px; font-size: 7px"></span>
        </i>
      `,
      label: 'Copy URL',
      disabled: !app.canShare(sel),
      click: () => {
        writeToClipboard(sel.shareUrl)
        toast.create('Copied to clipboard')
      }
    })
    items.push({
      icon: 'custom-path-icon',
      label: `Copy ${sel.stat.isFile() ? 'file' : 'folder'} path`,
      click: () => {
        var path = app.selection[0] ? sel.path : loc.getPath()
        writeToClipboard(path)
        toast.create('Copied to clipboard')
      }
    })
    if (!app.isViewingQuery) {
      items.push('-')
      if (sel.stat.isFile()) {
        items.push({
          icon: 'fas fa-fw fa-edit',
          label: 'Edit',
          disabled: !sel.stat.isFile(),
          click: async () => {
            let url
            if (app.selection[0]) {
              url = joinPath(loc.getOrigin(), sel.path)
            } else {
              url = loc.getUrl()
            }
            await beaker.shell.executeSidebarCommand('show-panel', 'editor-app')
            await beaker.shell.executeSidebarCommand('set-context', 'editor-app', url)
          }
        })
      }
      items.push({
        icon: 'fas fa-fw fa-i-cursor',
        label: 'Rename',
        disabled: !writable,
        click: () => app.onRename()
      })
      items.push({
        icon: 'fas fa-fw fa-trash',
        label: 'Delete',
        disabled: !writable,
        click: () => app.onDelete()
      })
      items.push('-')
      if (!sel.stat.isFile()) {
        items.push({
          icon: html`<i style="padding-left: 2px; font-size: 16px; box-sizing: border-box">◨</i>`,
          label: 'Diff / merge',
          click: () => app.doDiff(sel.url)
        })
      }
      items.push({
        icon: 'fas fa-fw fa-file-export',
        label: 'Export',
        click: () => app.onExport()
      })
    }
  } else if (app.selection.length > 1) {
    let writable = app.selection.reduce((acc, v) => acc && v.drive.writable, true)
    items.push({
      icon: 'fas fa-fw fa-trash',
      label: 'Delete',
      disabled: !writable,
      click: () => app.onDelete()
    })
    items.push({
      icon: 'fas fa-fw fa-file-export',
      label: 'Export',
      click: () => app.onExport()
    })
  } else {
    let writable = app.currentDriveInfo.writable
    items.push({
      icon: 'far fa-fw fa-file',
      label: 'New file',
      disabled: !writable,
      click: () => app.onNewFile()
    })
    items.push({
      icon: 'far fa-fw fa-folder',
      label: 'New folder',
      disabled: !writable,
      click: () => app.onNewFolder()
    })
    items.push({
      icon: 'fas fa-fw fa-long-arrow-alt-right custom-link-icon',
      label: 'New mount',
      disabled: !writable,
      click: () => app.onNewMount()
    })
    items.push('-')
    if (!app.attachedMode) {
      items.push({
        icon: 'fas fa-fw fa-desktop',
        label: 'Open',
        disabled: !app.canShare(app.locationAsItem),
        click: () => app.goto(app.getShareUrl(app.locationAsItem), true, true)
      })
    }
    items.push({
      icon: html`
        <i class="fa-stack" style="font-size: 6px">
          <span class="far fa-fw fa-hdd fa-stack-2x"></span>
          <span class="fas fa-fw fa-share fa-stack-1x" style="margin-left: -10px; margin-top: -5px; font-size: 7px"></span>
        </i>
      `,
      label: `Copy URL`,
      disabled: !app.canShare(app.locationAsItem),
      click: () => {
        writeToClipboard(app.getShareUrl(app.locationAsItem))
        toast.create('Copied to clipboard')
      }
    })
    items.push({
      icon: 'custom-path-icon',
      label: `Copy path`,
      click: () => {
        writeToClipboard(loc.getPath())
        toast.create('Copied to clipboard')
      }
    })
    items.push('-')
    items.push({
      icon: 'fas fa-fw fa-code-branch',
      label: 'Fork this drive',
      disabled: !app.canShare(app.locationAsItem),
      click: () => app.onForkDrive()
    })
    items.push({
      icon: html`<i style="padding-left: 2px; font-size: 16px; box-sizing: border-box">◨</i>`,
      label: 'Diff / merge',
      click: () => app.doDiff(loc.getUrl())
    })
    items.push({
      icon: 'fas fa-fw fa-file-import',
      label: 'Import file(s)',
      disabled: !writable,
      click: () => app.onImportFiles()
    })
    items.push({
      icon: 'fas fa-fw fa-file-import',
      label: 'Import folder(s)',
      disabled: !writable,
      click: () => app.onImportFolders()
    })
    items.push({
      icon: 'fas fa-fw fa-file-export',
      label: 'Export files',
      click: () => app.onExport()
    })
  }
  return items
}