import {getAppPermissions} from '../dbs/sitedata'

// exported api
// =

export default {
  // fetch the sender's session data
  async fetch () {
    return {
      permissions: await getAppPermissions(this.sender.getURL())
    }
  }
}
