/*
This wrapper provides a Hyperdrive interface for non-dat sites
so that errors can be smoothly generated
*/

export function createDrive (url) {
  if (url.startsWith('hd:')) {
    return new Hyperdrive(url)
  }
  return new OtherOrigin(url)
}

class OtherOrigin {
  constructor (url) {
    this.url = url
    for (let k of Object.getOwnPropertyNames(Hyperdrive.prototype)) {
      if (!this[k] && typeof Hyperdrive.prototype[k] === 'function') {
        this[k] = this.doThrow.bind(this)
      }
    }
  }

  stat () {
    // fake response to just let stat() callers pass through
    return {
      isUnsupportedProtocol: true,
      isDirectory: () => true,
      isFile: () => true
    }
  }

  async doThrow () {
    let urlp = new URL(this.url)
    throw new Error(`${urlp.protocol} does not support this command`)
  }
}