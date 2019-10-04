import * as archives from './archives'
import * as assets from './assets'
import * as debug from './debugging'
import dns from './dns'
import * as protocol from './protocol'
import * as watchlist from './watchlist'

export default {
  archives,
  assets,
  debug,
  dns,
  protocol,
  watchlist,
  async setup (opts) {
    await this.archives.setup(opts)
    await this.watchlist.setup()
  }
}
