import * as drives from './drives'
import * as assets from './assets'
import * as debug from './debugging'
import dns from './dns'
import * as protocol from './protocol'
import * as watchlist from './watchlist'

export default {
  drives,
  assets,
  debug,
  dns,
  protocol,
  watchlist,
  async setup (opts) {
    await this.drives.setup(opts)
    await this.watchlist.setup()
  }
}
