import EventEmitter from 'events'

export class BaseModal extends EventEmitter {
  render () {
    // override this method
    return 'BaseModal'
  }

  rerender () {
    this.emit('rerender')
  }

  close (err, res) {
    this.emit('close', err, res)
  }

  postFirstRender () {
    // override this method
  }
}