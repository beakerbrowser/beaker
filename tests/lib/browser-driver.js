exports.navigateTo = function (app, url) {
  return app.client.windowByIndex(0)
    .then(() => app.client.waitForExist('.toolbar-actions:not(.hidden) .nav-location-input', 10e3))
    .then(() => {
      return app.client.click('.toolbar-actions:not(.hidden) .nav-location-pretty')
      .catch(() => app.client.click('.toolbar-actions:not(.hidden) .nav-location-input'))
    })
    .then(() => app.client.setValue('.toolbar-actions:not(.hidden) .nav-location-input', url))
    .then(() => app.client.pause(500)) // need to wait a sec for the UI to catch up
    .then(() => app.client.keys('\uE007')) // enter
}

exports.newTab = function (app) {
  var index
  return app.client.windowByIndex(0)
    .then(() => app.client.getWindowCount())
    .then(count => {
      index = count
      return app.client.click('.chrome-tab-add-btn')
    })
    .then(() => app.client.waitUntilWindowLoaded(index))
    .then(() => index)
}
