import {cbPromise} from '../../../lib/functions'

const SESSION_COOKIE_NAME = 'dat_user_session_id'

// exported api
// =

export async function get (wc) {
  var sessionId = await getCookieSessionID(wc)
  // TODO
}

export async function create (wc, opts) {
  // TODO

  // store in the cookies
  await setCookieSessionID(wc, sessionId)
}

export async function destroy (wc) {
  await clearCookieSessionID(wc)
  // TODO
}

// cookie utils
// =

async function getCookieSessionID (wc) {
  var cookies = await cbPromise(cb => wc.session.cookies.get({
    url: wc.getURL(),
    name: SESSION_COOKIE_NAME
  }, cb))
  return cookies.length === 1 ? cookies[0].value : null
}

async function setCookieSessionID (wc, sessionId) {
  await clearCookieSessionID(wc)
  await cbPromise(cb => wc.session.cookies.set({
    url: wc.getURL(),
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true
  }, cb))
}

async function clearCookieSessionID (wc) {
  await cbPromise(cb => session.cookies.remove(wc.getURL(), SESSION_COOKIE_NAME, cb))
}