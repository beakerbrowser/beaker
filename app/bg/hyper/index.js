import * as drives from './drives'
import * as assets from './assets'
import * as debug from './debugging'
import * as dns from './dns'
import * as watchlist from './watchlist'
import * as daemon from './daemon'

export default {
  drives,
  assets,
  debug,
  dns,
  watchlist,
  daemon,
  async setup (opts) {
    await this.drives.setup(opts)
    await this.watchlist.setup()
  }
}
