const PAGES_DIR = '/data/pages'
const site = new DatArchive(window.location)

export class Pages {
  static async list ({limit, reverse} = {}) {
    limit = limit || 20
    var pageNames = await site.readdir(PAGES_DIR)
    pageNames.sort()
    if (reverse) pageNames.reverse()
    pageNames = pageNames.slice(0, limit)
    return Promise.all(pageNames.map(async (filename) => {
      var path = PAGES_DIR + '/' + filename
      var page = JSON.parse(await site.readFile(path))
      return {filename, url: window.location.origin + path, ...page}
    }))
  }
}
