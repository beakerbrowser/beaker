import EventEmitter from 'events'

export class BaseSidebar extends EventEmitter {
  static shouldRender (page) {
    // override this method
    return false
  }

  constructor (page) {
    super()
    this.page = page
  }

  render () {
    // override this method
    return 'BaseSidebar'
  }

  rerender () {
    this.emit('rerender')
  }
}