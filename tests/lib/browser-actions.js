exports.navigateTo = function (app, url) {
  app.client.windowByIndex(0)
  return app.client.waitForExist('.nav-location-input')
    .then(() => app.client.click('.nav-location-input'))
    .then(() => app.client.setValue('.nav-location-input', url))
    .then(() => app.client.pause(500)) // need to wait a sec for the UI to catch up
    .then(() => app.client.keys('\uE007')) // enter
}
