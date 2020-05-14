class AwaitLock {
  constructor() {
      this._acquired = false;
      this._waitingResolvers = [];
  }
  /**
   * Acquires the lock, waiting if necessary for it to become free if it is already locked. The
   * returned promise is fulfilled once the lock is acquired.
   *
   * After acquiring the lock, you **must** call `release` when you are done with it.
   */
  acquireAsync() {
      if (!this._acquired) {
          this._acquired = true;
          return Promise.resolve();
      }
      return new Promise(resolve => {
          this._waitingResolvers.push(resolve);
      });
  }
  /**
   * Acquires the lock if it is free and otherwise returns immediately without waiting. Returns
   * `true` if the lock was free and is now acquired, and `false` otherwise
   */
  tryAcquire() {
      if (!this._acquired) {
          this._acquired = true;
          return true;
      }
      return false;
  }
  /**
   * Releases the lock and gives it to the next waiting acquirer, if there is one. Each acquirer
   * must release the lock exactly once.
   */
  release() {
      if (this._waitingResolvers.length > 0) {
          let resolve = this._waitingResolvers.shift();
          resolve();
      }
      else {
          this._acquired = false;
      }
  }
}

var locks = {}
export async function lock (key) {
  if (!(key in locks)) locks[key] = new AwaitLock()

  var lock = locks[key]
  await lock.acquireAsync()
  return lock.release.bind(lock)
};