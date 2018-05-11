import * as services from '../services'
import * as servicesDb from '../dbs/services'

// exported api
// =

export default {
  // internal methods

  fetchPSADoc: services.fetchPSADoc,
  makeAPIRequest: services.makeAPIRequest,
  
  registerHashbase: services.registerHashbase,

  login: services.login,
  logout: services.logout,

  // db methods

  addService: servicesDb.addService,
  removeService: servicesDb.removeService,

  addAccount: servicesDb.addAccount,
  removeAccount: servicesDb.removeAccount,

  getService: servicesDb.getService,
  getAccount: servicesDb.getAccount,

  listServices: servicesDb.listServices,
  listAccounts: servicesDb.listAccounts,
  listServiceLinks: servicesDb.listServiceLinks,
  listServiceAccounts: servicesDb.listServiceAccounts
}
