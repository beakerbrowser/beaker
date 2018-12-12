const FEED_DIR = '/data/posts'
const site = new DatArchive(window.location)

export class Feed {
  static async list ({limit, reverse} = {}) {
    limit = limit || 20
    var postNames = await site.readdir(FEED_DIR)
    postNames.sort()
    if (reverse) postNames.reverse()
    postNames = postNames.slice(0, limit)
    return Promise.all(postNames.map(async (filename) => {
      var path = FEED_DIR + '/' + filename
      var post = JSON.parse(await site.readFile(path))
      return {filename, url: window.location.origin + path, ...post}
    }))
  }
}
