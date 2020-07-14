import { BrowserView } from 'electron'
import emitStream from 'emit-stream'
import * as tabManager from '../../ui/tabs/manager'
import { PermissionsError } from 'beaker-error-constants'

export default {
  createEventStream () {
    var {tab, senderPane} = getPaneObjects(this.sender)
    return emitStream(senderPane.attachedPaneEvents)
  },

  setAttachable () {
    var {tab, senderPane} = getPaneObjects(this.sender)
    senderPane.wantsAttachedPane = true
  },
  
  getAttachedPane () {
    var {tab, senderPane} = getPaneObjects(this.sender)
    var attachedPane = senderPane.attachedPane
    if (!attachedPane) return undefined
    return toPaneResponse(attachedPane)
  },

  attachToLastActivePane () {
    // TODO perms prompt
    var {tab, senderPane} = getPaneObjects(this.sender)

    var attachedPane = senderPane.attachedPane
    if (attachedPane) {
      return toPaneResponse(attachedPane)
    }

    // try to find a pane that's not our builtin tools or already attached to anything, if possible
    // if not, stick with the candidate
    var candidatePane = tab.getLastActivePane()
    const isUndesirable = pane => /^beaker:\/\/(webterm|editor|explorer)/.test(pane.url) || pane.attachedPane || pane === senderPane
    if (!candidatePane || isUndesirable(candidatePane)) {
      candidatePane = tab.panes.find(p => !isUndesirable(p))
    }
    if (!candidatePane || candidatePane === senderPane) {
      return undefined
    }

    senderPane.setAttachedPane(candidatePane)
    return toPaneResponse(candidatePane)
  },

  create (url, opts) {
    // TODO perms prompt
    opts = opts && typeof opts === 'object' ? opts : {}
    var {tab, senderPane} = getPaneObjects(this.sender)
    var newPane = tab.createPane({url, setActive: true})
    if (opts.attach) {
      senderPane.setAttachedPane(newPane)
      return toPaneResponse(newPane)
    }
  },

  async navigate (paneId, url) {
    var {attachedPane} = getAttachedPaneById(this.sender, paneId)
    if (!url || typeof url !== 'string') throw new Error('Invalid URL')
    await attachedPane.loadURL(url)
  },

  async executeJavaScript (paneId, script) {
    // TODO perms prompt
    var {attachedPane} = getAttachedPaneById(this.sender, paneId)
    await attachedPane.webContents.executeJavaScript(script)
  },

  async injectCss (paneId, css) {
    // TODO perms prompt
    var {attachedPane} = getAttachedPaneById(this.sender, paneId)
    return attachedPane.webContents.injectCss(css)
  },

  async uninjectCss (paneId, cssId) {
    // TODO perms prompt
    var {attachedPane} = getAttachedPaneById(this.sender, paneId)
    await attachedPane.webContents.uninjectCss(cssId)
  }
}

function getPaneObjects (sender) {
  var view = BrowserView.fromWebContents(sender)
  var tab = tabManager.findContainingTab(view)
  if (!tab) throw new Error('Requesting pane not active')
  var senderPane = tab.findPane(view)
  if (!senderPane) throw new Error('Requesting pane not active')
  return {tab, senderPane}
}

function getAttachedPaneById (sender, paneId) {
  var {tab, senderPane} = getPaneObjects(sender)
  if (!senderPane.attachedPane || senderPane.attachedPane.id !== paneId) {
    throw new PermissionsError('Can only managed the attached pane')
  }
  var attachedPane = senderPane.attachedPane
  return {tab, senderPane, attachedPane}
}

function toPaneResponse (pane) {
  return {
    id: pane.id,
    url: pane.url || pane.loadingURL
  }
}