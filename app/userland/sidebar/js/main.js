import 'beaker://editor/js/main.build.js'
import 'beaker://webterm/js/main.js'
import './files-explorer.js'

/**
 * NOTE
 * Any changes to sidebar state should be routed through
 * the background process via `executeSidebarCommand` as
 * the background-process tracks some state and needs to
 * be kept in sync with the frontend.
 */

const PANELS_ORDER = ['files-explorer-app', 'editor-app', 'web-term']
const MIN_PANEL_HEIGHT = 50

class SidebarApp extends HTMLElement {
  createRenderRoot () {
    return this // no shadow dom
  }

  constructor () {
    super()

    this.panels = []
    this.dragmode = undefined
    window.sidebar = this // DEBUG

    // API called by the background process
    window.showPanel = (panel, url, opts) => this.addPanel(panel, url, opts)
    window.togglePanel = (panel, url) => this.hasPanel(panel) ? this.removePanel(panel) : this.addPanel(panel, url)
    window.hidePanel = panel => this.removePanel(panel)
    window.setFocus = panel => this.hasPanel(panel) ? this.querySelector(panel).setFocus() : undefined
    window.setContext = (panel, url) => this.hasPanel(panel) ? this.querySelector(panel).load(url) : undefined
    window.setAllContexts = (url) => this.panels.forEach(panel => this.querySelector(panel.tagName).load(url))

    this.addEventListener('mousemove', this.onMousemove.bind(this))
    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  getPanelEl (i) {
    return this.querySelectorAll('.panel')[i]
  }

  hasPanel (tagName) {
    return this.panels.find(p => p.tagName === tagName)
  }

  async addPanel (tagName, url, opts) {
    // NOTE for now, there are only 3 panels 
    // and they are hardcoded with specific orders

    // no duplicates
    if (!this.panels.find(p => p.tagName === tagName)) {
      var panel = {tagName, height: 0}
      this.panels.push(panel)
      this.panels.sort((a, b) => PANELS_ORDER.indexOf(a.tagName) - PANELS_ORDER.indexOf(b.tagName))
      var panelIndex = this.panels.indexOf(panel)

      await this.addPanelEls(panelIndex)
      this.redistributeHeights()
      this.updateElementHeights()

      if (url) await this.querySelector(tagName).load(url)
    }

    try {
      this.querySelector(tagName).setFocus()
    } catch (e) {
    }
  }

  removePanel (tagName) {
    var i
    if (tagName === 'focused') {
      let panelEls = Array.from(this.querySelectorAll('.panel'))
      let focusedPanelEl = panelEls.find(el => el.contains(document.activeElement))
      if (!focusedPanelEl) focusedPanelEl = panelEls[0]
      i = panelEls.findIndex(el => el === focusedPanelEl)
      tagName = this.panels[i].tagName
    } else {
      i = this.panels.findIndex(p => p.tagName === tagName)
      if (i === -1) return
    }
    this.querySelector(tagName).teardown()
    this.removePanelEls(i)
    this.panels.splice(i, 1)

    if (this.panels.length === 0) {
      return beaker.browser.executeSidebarCommand('close')
    }

    this.redistributeHeights()
    this.updateElementHeights()
  }

  redistributeHeights () {
    var height = document.body.clientHeight / (this.panels.length)
    for (let p of this.panels) p.height = height
  }

  // rendering
  // =

  async addPanelEls (panelIndex) {
    let panel = this.panels[panelIndex]

    var appEl = document.createElement(panel.tagName)
    appEl.classList.add('sidebar')

    let closeBtnEl = document.createElement('button')
    closeBtnEl.className = 'panel-btn close-btn'
    closeBtnEl.setAttribute('title', 'Close panel')
    closeBtnEl.innerHTML = '<span class="fas fa-times"></span>'
    closeBtnEl.addEventListener('click', e => beaker.browser.executeSidebarCommand('hide-panel', panel.tagName))

    let detachBtnEl = document.createElement('button')
    detachBtnEl.className = 'panel-btn detach-btn'
    detachBtnEl.setAttribute('title', 'Detach panel')
    detachBtnEl.innerHTML = '<span class="far fa-clone"></span>'
    detachBtnEl.addEventListener('click', async (e) => {
      this.openDetached(panel, true)
      beaker.browser.executeSidebarCommand('hide-panel', panel.tagName)
    })

    let panelEl = document.createElement('div')
    panelEl.className = `panel for-${panel.tagName}`
    panelEl.append(closeBtnEl)
    if (detachBtnEl) panelEl.append(detachBtnEl)
    panelEl.append(appEl)

    this.insertBefore(panelEl, this.getPanelEl(panelIndex))

    let dividerEl = document.createElement('div')
    dividerEl.className = 'divider'
    dividerEl.addEventListener('mousedown', e => this.onMousedownDivider(e, panel))
    this.insertBefore(dividerEl, panelEl.nextElementSibling)
    // await new Promise(r => setTimeout(r, 30)) // wait for dom to update
  }

  removePanelEls (panelIndex) {
    let panelEl = this.getPanelEl(panelIndex)
    var dividerEl = panelEl.nextElementSibling
    if (dividerEl && dividerEl.classList.contains('divider')) {
      dividerEl.remove()
    }
    panelEl.remove()
  }

  updateElementHeights (e) {
    for (let i = 0; i < this.panels.length; i++) {
      let el = this.getPanelEl(i)
      let isLast = (i === this.panels.length - 1)
      if (isLast) {
        el.style.height = 'initial'
        el.style.flex = '1'
      } else {
        el.style.flex = 'initial'
        el.style.height = this.panels[i].height + 'px'
      }
    }
  }

  openDetached (panel, newWindow) {
    var ctx = this.querySelector(panel.tagName).getContext()
    var url
    switch (panel.tagName) {
      case 'editor-app': url = `beaker://editor/?url=${encodeURI(ctx)}`; break
      case 'files-explorer-app': url = `beaker://explorer/${encodeURI(ctx.slice('hyper://'.length))}`; break
      case 'web-term': url = `beaker://webterm/?url=${encodeURI(ctx)}`; break
    }
    if (!url) return
    if (newWindow) {
      let width = panel.tagName === 'files-explorer-app' ? 1000 : 600
      let height = panel.tagName === 'files-explorer-app' ? 800 : 500
      beaker.browser.newWindow({pages: [url], width, height, isAppWindow: true})
    } else {
      beaker.browser.openUrl(url, {setActive: true, adjacentActive: true})
    }
  }

  // events
  // =

  onMousedownDivider (e, panel) {
    var panelIndex = this.panels.indexOf(panel)
    this.dragmode = {
      panelIndex,
      startY: e.clientY,
      startHeight: this.panels[panelIndex].height,
      nextPanelStartHeight: this.panels[panelIndex + 1].height
    }
  }

  onMousemove (e) {
    if (this.dragmode !== undefined) {
      if (!e.buttons) {
        this.dragmode = undefined
      } else {
        let panel = this.panels[this.dragmode.panelIndex]
        let nextPanel = this.panels[this.dragmode.panelIndex + 1]

        let heightChange = (e.clientY - this.dragmode.startY)
        let availableReducedHeight = MIN_PANEL_HEIGHT - this.dragmode.startHeight
        let availableAddedHeight = this.dragmode.nextPanelStartHeight - MIN_PANEL_HEIGHT

        heightChange = clamp(heightChange, availableReducedHeight, availableAddedHeight)

        panel.height = this.dragmode.startHeight + heightChange
        nextPanel.height = this.dragmode.nextPanelStartHeight - heightChange

        this.getPanelEl(this.dragmode.panelIndex).style.height = panel.height + 'px'
        this.getPanelEl(this.dragmode.panelIndex + 1).style.height = nextPanel.height + 'px'
      }
    }
  }

  onWindowResize (e) {
    var totalHeightUsed = this.panels.reduce((acc, panel) => acc + panel.height, 0)
    if (totalHeightUsed < document.body.clientHeight) {
      this.panels[this.panels.length - 1].height += document.body.clientHeight - totalHeightUsed
    } else if (totalHeightUsed > document.body.clientHeight) {
      var reduceBy = (totalHeightUsed - document.body.clientHeight) / this.panels.length
      for (let p of this.panels) p.height -= reduceBy
    }
    this.updateElementHeights()
  }
}

customElements.define('sidebar-app', SidebarApp)

function clamp (v, min, max) {
  return Math.min(Math.max(v, min), max)
}