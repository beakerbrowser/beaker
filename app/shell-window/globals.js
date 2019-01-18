// globals
// =

var currentUserSession

// exported api
// =

export async function setup () {
  currentUserSession = await beaker.browser.getUserSession()
}

export function getCurrentUserSession () {
  return currentUserSession
}