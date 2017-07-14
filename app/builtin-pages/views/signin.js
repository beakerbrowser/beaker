const yo = require('yo-yo')


// globals
// =

var requester
var currentView = 'list'
var views = {
  list: renderList,
  create: renderCreate,
  review: renderReview
}
setup()

// main api
// =

// this method gets called by the background process after load
async function setup () {
  // read session information
  var req = await UserSession.getSessionRequest(location.pathname.slice(1))
  console.debug('setup()', req)
  requester = req.requester

  // load all profiles
  // TODO

  // render
  update()
}

function createSession () {
  UserSession.createSession({
    returnURL: requester.url
  })
}

// rendering
// =

function update () {
  yo.update(document.querySelector('main'), yo`
    <main>${views[currentView]()}</main>
  `)
}

function renderList () {
  // TODO
  return 'list TODO'
}

function renderCreate () {
  // TODO
  return 'create TODO'
}

function renderReview () {
  // TODO
  return 'review TODO'
}