import EventEmitter from 'events'

export class BaseSidebar extends EventEmitter {
  static shouldRender (page) {
    // override this method
    return false
  }

  render () {
    // override this method
    return 'BaseSidebar'
  }

  rerender () {
    this.emit('rerender')
  }
}