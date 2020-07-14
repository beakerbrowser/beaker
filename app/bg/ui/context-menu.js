import { app, Menu, clipboard, BrowserWindow, BrowserView, dialog } from 'electron'
import path from 'path'
import * as tabManager from './tabs/manager'
import * as modals from './subwindows/modals'
import { toggleShellInterface, getAddedWindowSettings } from './windows'
import { download } from './downloads'
import * as settingsDb from '../dbs/settings'
import { runDrivePropertiesFlow } from './util'

// NOTE
// subtle but important!!
// the menu instance needs to be kept in the global scope
// otherwise the JS GC will kick in and clean up the menu object
// which causes the context-menu to destroy prematurely
// see https://github.com/electron/electron/issues/19424
// -prf
var menuInstance

export default function registerContextMenu () {
  // register the context menu on every created webContents
  app.on('web-contents-created', (e, webContents) => {
    webContents.on('context-menu', async (e, props) => {
      var menuItems = []
      const { mediaFlags, editFlags } = props
      const isHyperdrive = props.pageURL.startsWith('hyper://')
      const hasText = props.selectionText.trim().length > 0
      const can = type => editFlags[`can${type}`] && hasText
      const isMisspelled = props.misspelledWord
      const spellingSuggestions = props.dictionarySuggestions
      // get the focused window, ignore if not available (not in focus)
      // - fromWebContents(webContents) doesnt seem to work, maybe because webContents is often a webview?
      var targetWindow = BrowserWindow.getFocusedWindow()
      if (!targetWindow) { return }
      var targetTab = tabManager.getActive(targetWindow)

      // handle shell UI specially
      if (props.pageURL == 'beaker://shell-window/') { return }
      if (props.pageURL.startsWith('beaker://modals')) {
        return modals.handleContextMenu(webContents, targetWindow, can, props)
      }

      // helper to call code on the element under the cursor
      const callOnElement = js => webContents.executeJavaScript(`
        var el = document.elementFromPoint(${props.x}, ${props.y})
        new Promise(resolve => { ${js} })
      `)

      // helper to run a download prompt for media
      const downloadPrompt = (field, ext) => async (item, win) => {
        var defaultPath = path.join(app.getPath('downloads'), path.basename(props[field]))
        if (ext && defaultPath.split('/').pop().indexOf('.') === -1) defaultPath += ext
        var {filePath} = await dialog.showSaveDialog({ title: `Save ${props.mediaType} as...`, defaultPath })
        if (filePath) { download(win, webContents, props[field], { saveAs: filePath }) }
      }

      // links
      if (props.linkURL) {
        menuItems.push({ label: 'Open Link in New Tab', click: (item, win) => tabManager.create(win, props.linkURL, {setActiveBySettings: true, adjacentActive: true}) })
        menuItems.push({ label: 'Copy Link Address', click: () => clipboard.writeText(props.linkURL) })
        menuItems.push({ label: 'Save Link As...', click: downloadPrompt('linkURL', '.html') })
        menuItems.push({ type: 'separator' })
        menuItems.push({
          label: 'Open in Pane Right',
          click () {
            var pane = targetTab && targetTab.findPane(BrowserView.fromWebContents(webContents))
            if (targetTab && pane) {
              let lastStack = targetTab.layout.stacks[targetTab.layout.stacks.length - 1]
              if (targetTab.layout.stacks.length > 1 && !lastStack.panes.find(p => p === pane)) {
                // stack in the adjacent stack
                targetTab.createPane({url: props.linkURL, setActive: true, after: lastStack.panes[lastStack.panes.length - 1], splitDir: 'horz'})
              } else {
                // open in a new rightmost stack
                targetTab.createPane({url: props.linkURL, setActive: true, after: pane, splitDir: 'vert'})
              }
            }
          }
        })
        menuItems.push({
          label: 'Open in Pane Below',
          click () {
            var pane = targetTab && targetTab.findPane(BrowserView.fromWebContents(webContents))
            if (targetTab && pane) {
              targetTab.createPane({url: props.linkURL, setActive: true, after: pane, splitDir: 'horz'})
            }
          }
        })
        menuItems.push({ type: 'separator' })
      }

      // images
      if (props.mediaType == 'image') {
        menuItems.push({ label: 'Save Image As...', click: downloadPrompt('srcURL') })
        menuItems.push({ label: 'Copy Image', click: () => webContents.copyImageAt(props.x, props.y) })
        menuItems.push({ label: 'Copy Image URL', click: () => clipboard.writeText(props.srcURL) })
        menuItems.push({ label: 'Open Image in New Tab', click: (item, win) => tabManager.create(win, props.srcURL, {adjacentActive: true}) })
        menuItems.push({ type: 'separator' })
        menuItems.push({
          label: 'Open in Pane Right',
          click () {
            var pane = targetTab && targetTab.findPane(BrowserView.fromWebContents(webContents))
            if (targetTab && pane) {
              targetTab.createPane({url: props.srcURL, setActive: true, after: pane, splitDir: 'vert'})
            }
          }
        })
        menuItems.push({
          label: 'Open in Pane Below',
          click () {
            var pane = targetTab && targetTab.findPane(BrowserView.fromWebContents(webContents))
            if (targetTab && pane) {
              targetTab.createPane({url: props.srcURL, setActive: true, after: pane, splitDir: 'horz'})
            }
          }
        })
        menuItems.push({ type: 'separator' })
      }

      // videos and audios
      if (props.mediaType == 'video' || props.mediaType == 'audio') {
        menuItems.push({ label: 'Loop', type: 'checkbox', checked: mediaFlags.isLooping, click: () => callOnElement('el.loop = !el.loop') })
        if (mediaFlags.hasAudio) { menuItems.push({ label: 'Muted', type: 'checkbox', checked: mediaFlags.isMuted, click: () => callOnElement('el.muted = !el.muted') }) }
        if (mediaFlags.canToggleControls) { menuItems.push({ label: 'Show Controls', type: 'checkbox', checked: mediaFlags.isControlsVisible, click: () => callOnElement('el.controls = !el.controls') }) }
        menuItems.push({ type: 'separator' })
      }

      // videos
      if (props.mediaType == 'video') {
        menuItems.push({ label: 'Save Video As...', click: downloadPrompt('srcURL') })
        menuItems.push({ label: 'Copy Video URL', click: () => clipboard.writeText(props.srcURL) })
        menuItems.push({ label: 'Open Video in New Tab', click: (item, win) => tabManager.create(win, props.srcURL, {adjacentActive: true}) })
        menuItems.push({ type: 'separator' })
      }

      // audios
      if (props.mediaType == 'audio') {
        menuItems.push({ label: 'Save Audio As...', click: downloadPrompt('srcURL') })
        menuItems.push({ label: 'Copy Audio URL', click: () => clipboard.writeText(props.srcURL) })
        menuItems.push({ label: 'Open Audio in New Tab', click: (item, win) => tabManager.create(win, props.srcURL, {adjacentActive: true}) })
        menuItems.push({ type: 'separator' })
      }

      // spell check
       if (props.isMisspelled !== '' && props.isEditable) {
         menuItems.push({label: 'Add to dictionary', click: () => webContents.session.addWordToSpellCheckerDictionary(isMisspelled)})
         if (spellingSuggestions) {
           for (let i in spellingSuggestions) {
             menuItems.push({ label: spellingSuggestions[i], click: (item, win) => webContents.replaceMisspelling(item.label, {adjacentActive: true}) })
           }
         }
         menuItems.push({ type: 'separator' })
       }

      // clipboard
      if (props.isEditable) {
        menuItems.push({ label: 'Cut', role: 'cut', enabled: can('Cut') })
        menuItems.push({ label: 'Copy', role: 'copy', enabled: can('Copy') })
        menuItems.push({ label: 'Paste', role: 'paste', enabled: editFlags.canPaste })
        menuItems.push({ type: 'separator' })
      } else if (hasText) {
        menuItems.push({ label: 'Copy', role: 'copy', enabled: can('Copy') })
        menuItems.push({ type: 'separator' })
      }

      // web search
      if (hasText) {
        var searchPreviewStr = props.selectionText.substr(0, 30) // Trim search preview to keep it reasonably sized
        searchPreviewStr = searchPreviewStr.replace(/\s/gi, ' ') // Replace whitespace chars with space
        searchPreviewStr = searchPreviewStr.replace(/[\u061c\u200E\u200f\u202A-\u202E]+/g, '') // Remove directional text control chars
        if (searchPreviewStr.length < props.selectionText.length) { // Add ellipsis if search preview was trimmed
          searchPreviewStr += '..."'
        } else {
          searchPreviewStr += '"'
        }
        var searchEngines = await settingsDb.get('search_engines')
        var searchEngine = searchEngines.find(se => se.selected) || searchEngines[0]
        var query = searchEngine.url+ '?q=' + encodeURIComponent(props.selectionText.substr(0, 500)) // Limit query to prevent too long query error from DDG
        menuItems.push({ label: 'Search ' + searchEngine.name + ' for "' + searchPreviewStr, click: (item, win) => tabManager.create(win, query, {adjacentActive: true}) })
        menuItems.push({ type: 'separator' })
      }

      if (!props.linkURL && props.mediaType === 'none' && !hasText) {
        menuItems.push(createMenuItem('back', {webContents, tab: targetTab}))
        menuItems.push(createMenuItem('forward', {webContents, tab: targetTab}))
        menuItems.push(createMenuItem('reload', {webContents, tab: targetTab}))
        menuItems.push({ type: 'separator' })
      }
      
      if (getAddedWindowSettings(targetWindow).isShellInterfaceHidden) {
        menuItems.push({
          label: 'Restore Browser UI',
          click: function () {
            toggleShellInterface(targetWindow)
          }
        })
        menuItems.push({ type: 'separator' })
      }

      menuItems.push(createMenuItem('split-pane-vert', {webContents, tab: targetTab}))
      menuItems.push(createMenuItem('split-pane-horz', {webContents, tab: targetTab}))
      if (shouldShowMenuItem('move-pane', {tab: targetTab})) {
        menuItems.push(createMenuItem('move-pane', {webContents, tab: targetTab}))
      }
      menuItems.push(createMenuItem('close-pane', {webContents, tab: targetTab}))
      menuItems.push({ type: 'separator' })
      menuItems.push({
        label: 'Export Page As...',
        click: downloadPrompt('pageURL', '.html')
      })
      menuItems.push({
        label: 'Print...',
        click: () => webContents.print()
      })
      menuItems.push({ type: 'separator' })

      if (isHyperdrive) {
        menuItems.push({
          label: 'Edit Source',
          click: async (item, win) => {
            if (targetTab) targetTab.createOrFocusPaneByOrigin({url: 'beaker://editor/', setActive: true})
          }
        })
        menuItems.push({
          label: 'Explore Files',
          click: async (item, win) => {
            if (targetTab) targetTab.createOrFocusPaneByOrigin({url: 'beaker://explorer/', setActive: true})
          }
        })
      }
      menuItems.push({ type: 'separator' })
      menuItems.push(createMenuItem('inspect-element', {webContents, tab: targetTab, x: props.x, y: props.y}))

      // show menu
      menuInstance = Menu.buildFromTemplate(menuItems)
      menuInstance.popup({ window: targetWindow })
    })
  })
}

export function shouldShowMenuItem (id, {tab, webContents}) {
  switch (id) {
    case 'move-pane':
      return (tab.panes.length > 1)
    default:
      return true
  }
}

export function createMenuItem (id, {tab, webContents, x, y}) {
  switch (id) {
    case 'back':
      return {
        label: 'Back',
        enabled: webContents.canGoBack(),
        click: () => webContents.goBack()
      }
    case 'forward':
      return {
        label: 'Forward',
        enabled: webContents.canGoForward(),
        click: () => webContents.goForward()
      }
    case 'reload':
      return {
        label: 'Reload',
        click: () => webContents.reload()
      }
    case 'split-pane-vert':
      return {
        label: 'Split Pane Vertically',
        click () {
          var pane = tab && tab.findPane(BrowserView.fromWebContents(webContents))
          if (tab && pane) tab.splitPane(pane, 'vert')
        }
      }
    case 'split-pane-horz':
      return {
        label: 'Split Pane Horizontally',
        click () {
          var pane = tab && tab.findPane(BrowserView.fromWebContents(webContents))
          if (tab && pane) tab.splitPane(pane, 'horz')
        }
      }
    case 'move-pane':
      return {
        type: 'submenu',
        label: 'Move Pane',
        submenu: [{
          label: 'To a New Tab',
          click () {
            var pane = tab && tab.findPane(BrowserView.fromWebContents(webContents))
            if (tab && pane) {
              tab.detachPane(pane)
              tabManager.create(tab.browserWindow, null, {setActive: true, initialPanes: [pane]})
            }
          }
        }, {
          type: 'separator'
        }, {
          label: 'Up',
          click () {
            var pane = tab && tab.findPane(BrowserView.fromWebContents(webContents))
            if (tab && pane) tab.movePane(pane, 'up')
          }
        }, {
          label: 'Down',
          click () {
            var pane = tab && tab.findPane(BrowserView.fromWebContents(webContents))
            if (tab && pane) tab.movePane(pane, 'down')
          }
        }, {
          label: 'Left',
          click () {
            var pane = tab && tab.findPane(BrowserView.fromWebContents(webContents))
            if (tab && pane) tab.movePane(pane, 'left')
          }
        }, {
          label: 'Right',
          click () {
            var pane = tab && tab.findPane(BrowserView.fromWebContents(webContents))
            if (tab && pane) tab.movePane(pane, 'right')
          }
        }]
      }
    case 'close-pane':
      return {
        label: 'Close Pane',
        click () {
          var pane = tab && tab.findPane(BrowserView.fromWebContents(webContents))
          if (tab && pane) tab.removePane(pane)
        }
      }
    case 'inspect-element':
      return {
        label: 'Inspect Element',
        click: item => {
          webContents.inspectElement(x, y)
          if (webContents.isDevToolsOpened()) { webContents.devToolsWebContents.focus() }
        }
      }
  }
}