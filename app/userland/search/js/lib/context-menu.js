import { html } from '../../vendor/lit-element/lit-element.js'
import { writeToClipboard } from '../lib/clipboard.js'
import * as toast from '../com/toast.js'

export function constructItems (app) {
  var items = []
  if (app.selection.length === 1 || app.pathInfo.isFile()) {
    let sel = app.selection[0] || app.locationAsItem
    items.push({
      icon: 'fas fa-fw fa-desktop',
      label: 'Open in New Tab',
      click: () => app.goto(app.getShareUrl(sel), true, true)
    })
    items.push({
      icon: html`
        <i class="fa-stack" style="font-size: 6px">
          <span class="far fa-fw fa-hdd fa-stack-2x"></span>
          <span class="fas fa-fw fa-share fa-stack-1x" style="margin-left: -10px; margin-top: -5px; font-size: 7px"></span>
        </i>
      `,
      label: 'Copy Address',
      disabled: !app.canShare(sel),
      click: () => {
        writeToClipboard(sel.shareUrl)
        toast.create('Copied to clipboard')
      }
    })
    items.push({
      icon: 'custom-path-icon',
      label: `Copy Path`,
      click: () => {
        var path = app.selection[0] ? sel.path : loc.getPath()
        writeToClipboard(path)
        toast.create('Copied to clipboard')
      }
    })
    items.push({type: 'separator', ctxOnly: true})
  }
  items.push({id: 'builtin:inspect-element', ctxOnly: true})
  return items
}