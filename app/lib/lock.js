import AwaitLock from 'await-lock'

// wraps await-lock in a simpler interface, with many possible locks
var locks = {}

/**
 * Create a new lock
 * @example
 * var lock = require('./lock')
 * async function foo () {
 *   var release = await lock('bar')
 *   // ...
 *   release()
 * }
 * @param {string} key
 * @returns {Promise<function(): void>}
 */
export default async function (key) {
  if (!(key in locks)) locks[key] = new AwaitLock()

  var lock = locks[key]
  await lock.acquireAsync()
  return lock.release.bind(lock)
};
