import EventEmitter from 'events'

export class BaseSiteInfo extends EventEmitter {
  static shouldRender (page) {
    // override this method
    return false
  }

  constructor (page) {
    super()
    this.page = page
    this.url = new URL(page.url)
  }

  reload () {
    // override this method
  }

  render () {
    // override this method
    return 'BaseSiteInfo'
  }

  rerender () {
    this.emit('rerender')
  }

  // helpers
  // =

  renderHostname () {
    return (this.page.protocolInfo) ? this.page.protocolInfo.hostname : ''
  }

  renderUrl () {
    return (this.page.protocolInfo) ? this.page.protocolInfo.url : ''
  }

  renderTitle () {
    var title = ''
    if (this.page.siteInfoOverride && this.page.siteInfoOverride.title) {
      title = this.page.siteInfoOverride.title
    } else if (this.page.siteInfo && this.page.siteInfo.title) {
      title = this.page.siteInfo.title
    } else if (this.page.protocolInfo && this.page.protocolInfo.scheme === 'dat:') {
      title = 'Untitled'
    }
    return title
  }
}