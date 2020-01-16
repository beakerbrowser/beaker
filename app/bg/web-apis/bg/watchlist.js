import * as hyperWatchlist from '../../hyper/watchlist'

// exported api
// =

export default {
  async add (url, opts) {
    return hyperWatchlist.addSite(0, url, opts)
  },

  async list () {
    return hyperWatchlist.getSites(0)
  },

  async update (site) {
    return hyperWatchlist.updateWatchlist(0, site)
  },

  async remove (url) {
    return hyperWatchlist.removeSite(0, url)
  },

  // events
  // =

  createEventsStream () {
    return hyperWatchlist.createEventsStream()
  }
}
