import * as datWatchlist from '../../dat/watchlist'

// exported api
// =

export default {
  async add (url, opts) {
    return datWatchlist.addSite(0, url, opts)
  },

  async list () {
    return datWatchlist.getSites(0)
  },

  async update (site) {
    return datWatchlist.updateWatchlist(0, site)
  },

  async remove (url) {
    return datWatchlist.removeSite(0, url)
  },

  // events
  // =

  createEventsStream () {
    return datWatchlist.createEventsStream()
  }
}
