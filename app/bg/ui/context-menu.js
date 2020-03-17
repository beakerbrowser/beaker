import { app, Menu, clipboard, BrowserWindow, dialog } from 'electron'
import path from 'path'
import * as tabManager from './tab-manager'
import { download } from './downloads'
import { getDriveConfig, configDrive, removeDrive, getDriveIdent } from '../filesystem/index'
import { runForkFlow, runDrivePropertiesFlow } from './util'
import * as spellChecker from '../web-apis/bg/spell-checker'

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
      const isMisspelled = false//TODOprops.selectionText && spellChecker.isMisspelled(props.selectionText)
      const spellingSuggestions = false//TODOisMisspelled && spellChecker.getSuggestions(props.selectionText).slice(0, 5)

      // get the focused window, ignore if not available (not in focus)
      // - fromWebContents(webContents) doesnt seem to work, maybe because webContents is often a webview?
      var targetWindow = BrowserWindow.getFocusedWindow()
      if (!targetWindow) { return }

      // ignore clicks on the shell window
      if (props.pageURL == 'beaker://shell-window/') { return }

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
      if (props.linkURL && props.mediaType === 'none') {
        menuItems.push({ label: 'Open Link in New Tab', click: (item, win) => tabManager.create(win, props.linkURL, {setActive: true, adjacentActive: true}) })
        menuItems.push({ label: 'Copy Link Address', click: () => clipboard.writeText(props.linkURL) })
        menuItems.push({ type: 'separator' })
      }

      // images
      if (props.mediaType == 'image') {
        menuItems.push({ label: 'Save Image As...', click: downloadPrompt('srcURL') })
        menuItems.push({ label: 'Copy Image', click: () => webContents.copyImageAt(props.x, props.y) })
        menuItems.push({ label: 'Copy Image URL', click: () => clipboard.writeText(props.srcURL) })
        menuItems.push({ label: 'Open Image in New Tab', click: (item, win) => tabManager.create(win, props.srcURL, {adjacentActive: true}) })
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
        for (let i in spellingSuggestions) {
          menuItems.push({ label: spellingSuggestions[i], click: (item, win) => webContents.replaceMisspelling(item.label, {adjacentActive: true}) })
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
        var query = 'https://duckduckgo.com/?q=' + encodeURIComponent(props.selectionText.substr(0, 500)) // Limit query to prevent too long query error from DDG
        menuItems.push({ label: 'Search DuckDuckGo for "' + searchPreviewStr, click: (item, win) => tabManager.create(win, query, {adjacentActive: true}) })
        menuItems.push({ type: 'separator' })
      }

      if (!props.linkURL && props.mediaType === 'none' && !hasText) {
        menuItems.push({
          label: 'Back',
          enabled: webContents.canGoBack(),
          click: () => webContents.goBack()
        })
        menuItems.push({
          label: 'Forward',
          enabled: webContents.canGoForward(),
          click: () => webContents.goForward()
        })
        menuItems.push({
          label: 'Reload',
          click: () => webContents.reload()
        })
        menuItems.push({ type: 'separator' })
        if (isHyperdrive) {
          let driveInfo = tabManager.getActive(targetWindow).driveInfo
          let key = driveInfo ? driveInfo.key : undefined
          let driveCfg = getDriveConfig(key)
          let driveIdent = getDriveIdent(`hyper://${key}`)
          menuItems.push({
            label: 'Host This Drive',
            type: 'checkbox',
            checked: (driveCfg && driveCfg.seeding) || driveIdent.user,
            enabled: !driveIdent.system,
            click: (item, win) => {
              configDrive(key, {seeding: !(driveCfg && driveCfg.seeding)})
            }
          })
          menuItems.push({
            label: 'Save to My Library',
            type: 'checkbox',
            checked: !!driveCfg || driveIdent.system,
            enabled: !driveIdent.system,
            click: (item, win) => {
              if (!driveCfg) configDrive(key, {seeding: false})
              else removeDrive(key)
            }
          })
          menuItems.push({ type: 'separator' })
          menuItems.push({
            label: 'Fork This Drive',
            click: async (item, win) => {
              var driveUrlp = new URL(await runForkFlow(win, key))
              var pageUrlp = new URL(props.pageURL)
              pageUrlp.hostname = driveUrlp.hostname
              tabManager.create(win, pageUrlp.toString(), {setActive: true})
            }
          })
          menuItems.push({ label: 'Diff / Merge', click: (item, win) => { tabManager.create(win, `beaker://diff/?base=${props.pageURL}`, {setActive: true, adjacentActive: true}) } })
          menuItems.push({ type: 'separator' })
          menuItems.push({
            label: 'Sidebar: Drive Info',
            click: async (item, win) => {
              tabManager.getActive(win).executeSidebarCommand('show-panel', 'drive-info-app')
            }
          })
          menuItems.push({
            label: 'Sidebar: Explore Files',
            click: async (item, win) => {
              tabManager.getActive(win).executeSidebarCommand('show-panel', 'files-explorer-app')
            }
          })
        }
        menuItems.push({
          label: 'Sidebar: Editor',
          click: async (item, win) => {
            tabManager.getActive(win).executeSidebarCommand('show-panel', 'editor-app')
          }
        })
        menuItems.push({
          label: 'Sidebar: Terminal',
          click: async (item, win) => {
            tabManager.getActive(win).executeSidebarCommand('show-panel', 'web-term')
          }
        })
        menuItems.push({ type: 'separator' })
        menuItems.push({
          label: 'Save Page As...',
          click: downloadPrompt('pageURL', '.html')
        })
        menuItems.push({
          label: 'Print...',
          click: () => webContents.print()
        })
        menuItems.push({ type: 'separator' })
      }

      menuItems.push({ type: 'separator' })
      menuItems.push({
        label: 'Inspect Element',
        click: item => {
          webContents.inspectElement(props.x, props.y)
          if (webContents.isDevToolsOpened()) { webContents.devToolsWebContents.focus() }
        }
      })

      // show menu
      menuInstance = Menu.buildFromTemplate(menuItems)
      menuInstance.popup({ window: targetWindow })
    })
  })
}
