import yo from 'yo-yo'
import * as pages from './pages'
import * as globals from './globals'

// exported api
// =

export async function start () {
  try {
    await showTutorialModal('intro', 'Start tour')

    await gotoUserSite()
    await showTutorialModal('userSite')

    try {
      await beaker.browser.showEditProfileModal()
    } catch (e) {
      // ignore     
    }
    await refreshPage()
    await showTutorialModal('userSiteCanBeChanged')

    await viewSource()
    await showTutorialModal('userSiteSource')

    await gotoSite('beaker://feed')
    await showTutorialModal('feed')

    await gotoSite('dat://beakerbrowser.com')
    await showTutorialModal('followSomeone', 'Follow beakerbrowser.com')

    await gotoSite('beaker://settings/#crawler')
    await showTutorialModal('crawler')

    await gotoSite('beaker://feed')
    await showTutorialModal('populatedFeed')

    await gotoSite('beaker://search')
    await showTutorialModal('populatedSearch')

    await gotoSite('beaker://start')
    await showTutorialModal('goodbye', 'End tour')
  } catch (e) {
    if (e.message === 'Canceled') {
      await showTutorialModal('canceled', 'Close')
    }
  }
}

// internal methods
// =

async function showTutorialModal (screen, button) {
  await beaker.browser.showShellModal('tutorial', {screen, button})
}

async function refreshPage () {
  var page = pages.getActive()
  await gotoSite(page.url)
}

async function viewSource () {
  var page = pages.getActive()
  await gotoSite('beaker://library/' + page.url)
}

async function gotoSite (url) {
  return new Promise((resolve, reject) => {
    var page = pages.getActive()
    function onDidStopLoading (p) {
      if (p !== page) return
      pages.removeListener('did-stop-loading', onDidStopLoading)
      resolve()
    }
    pages.on('did-stop-loading', onDidStopLoading)
    page.loadURL(url)
  })
}

async function gotoUserSite () {
  await gotoSite(globals.getCurrentUserSession().url)
}