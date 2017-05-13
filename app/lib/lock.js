var AwaitLock = require('await-lock')

// wraps await-lock in a simpler interface, with many possible locks
// usage:
/*
var lock = require('./lock')
async function foo () {
  var release = await lock('bar')
  // ...
  release()
}
*/

var locks = {}
export default async function (key) {
  if (!(key in locks)) locks[key] = new AwaitLock()

  var lock = locks[key]
  await lock.acquireAsync()
  return lock.release.bind(lock)
}
