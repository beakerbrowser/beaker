const APP_PERMS_DESC = {
  profiles: {
    label: 'Your Profile',
    perms: {
      'read': 'Read your public data',
      'edit-profile': 'Manage your profile details',
      'edit-social': 'Manage who you follow'
    }
  },
  bookmarks: {
    label: 'Bookmarks',
    perms: {
      'read': 'Read your private bookmarks',
      'edit-private': 'Manage your private bookmarks',
      'edit-public': 'Manage your public bookmarks'
    }
  }
}
export default APP_PERMS_DESC

// helper to get the object containing all granted perms
// eg {profiles: ['read', 'edit-profile', 'edit-social'], ...}
export function getFullGranted () {
  var obj = {}
  for (let api in APP_PERMS_DESC) {
    obj[api] = Object.keys(APP_PERMS_DESC[api].perms)
  }
  return obj
}
