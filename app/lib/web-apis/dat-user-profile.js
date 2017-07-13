import DatArchive from './dat-archive'

// readonly form
export class DatUserProfile extends DatArchive {
  constructor(url) {
    super(url)
  }

  async getProfileJson () {
    // read the file
    var obj = await this.readFile('/profile.json', 'utf8')
    obj = JSON.parse(obj)

    // normalize
    return {
      display_name: normalizeString(obj.display_name),
      bio: normalizeString(obj.bio),
      avatar: normalizeString(obj.avatar),
      datasets: normalizeDatasets(obj.datasets)
    }
  }

  async getDataset (type) {
    // normalize the input param to improve matching
    type = normalizeURL(type)

    // fetch the profile.json
    var profileJson = await this.getProfileJson()

    // find the first matching dataset
    return profileJson.datasets.find(dataset => dataset.type === type)
  }
}

// writable form
export class DatUserProfileWritable extends DatUserProfile {
  constructor(url) {
    super(url)
  }

  async setProfileJson (obj) {
    // normalize
    obj = {
      display_name: normalizeString(obj.display_name),
      bio: normalizeString(obj.bio),
      avatar: normalizeString(obj.avatar),
      datasets: normalizeDatasets(obj.datasets)
    }

    // write
    await this.writeFile('/profile.json', JSON.stringify(obj))
    await this.commit()
  }

  async addDataset (dataset) {
    // verify
    try { new URL(dataset.type) }
    catch (e) { throw new Error('Invalid type attribute, must provide URL') }
    try { new URL(dataset.url) }
    catch (e) { throw new Error('Invalid url attribute, must provide URL') }

    // TODO this needs locking!
    var obj = await this.getProfileJson()
    obj.datasets.push(dataset)
    await this.setProfileJson(obj)
  }
}

function normalizeDatasets (datasets) {
  // falsy
  if (!datasets) {
    return []
  }

  // make an array
  if (!Array.isArray(datasets)) {
    datasets = [datasets]
  }

  // normalize
  return datasets
    .filter(d => d && typeof d === 'object')
    .map(d => ({
      title: normalizeString(d.title),
      type: normalizeURL(d.type),
      url: normalizeString(d.url)
    }))
    .filter(d => d.type && d.url)
}

function normalizeString (str) {
  return (str || '').toString()
}

function normalizeURL (url) {
  // convert to {hostname}/{pathname}
  try {
    var urlp = new URL(url)
    return urlp.hostname + urlp.pathname
  } catch (e) {
    console.error('Invalid URL', url, e)
  }
}