const site = new DatArchive(window.location)

export class SiteInfo {
  static async fetch () {
    var info = await site.getInfo()
    console.log(info)
    return {
      isOwner: info.isOwner,
      title: info.title,
      description: info.description,
      domain: (new URL(window.location)).hostname,
      thumbUrl: '/thumb.jpg'
    }
  }
}
