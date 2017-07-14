
// exported api
// =

// this method gets called by the background process after load
window.setup = function (opts) {
  console.log('SETUP!', opts)
  document.querySelector('main').textContent = 'test mode, redirecting with session in 3 seconds...'

  setTimeout(() => {
    UserSession.createSession({
      returnURL: opts.requester.url
    })
  }, 3e3)
}