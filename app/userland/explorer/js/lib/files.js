const ICONS = {
  root: {
    '/library': 'fas fa-university',
    '/library/bookmarks': 'fas fa-star',
    '/library/documents': 'fas fa-file-word',
    '/library/media': 'fas fa-photo-video',
    '/library/projects': 'fas fa-coffee',
    '/settings': 'fas fa-cog'
  },
  person: {
    '/friends': 'fas fa-user-friends',
    '/feed': 'fa fa-rss'
  },
  common: {
  }
}

export function toSimpleItemGroups (items) {
  var groups = {}
  const add = (id, label, item) => {
    if (!groups[id]) groups[id] = {id, label, items: [item]}
    else groups[id].items.push(item)
  }
  for (let i of items) {
    if (i.stat.isDirectory()) {
      add('folders', 'Folders', i)
    } else {
      add('files', 'Files', i)
    }
  }

  const groupsOrder = ['folders', 'files']
  var groupsArr = []
  for (let id in groups) {
    groupsArr[groupsOrder.indexOf(id)] = groups[id]
  }
  return groupsArr
}

export function toSemanticItemGroups (items) {
  var groups = {}
  const add = (id, label, item) => {
    if (!groups[id]) groups[id] = {id, label, items: [item]}
    else groups[id].items.push(item)
  }
  for (let i of items) {
    if (i.stat.mount && i.stat.mount.key) {
      switch (i.mountInfo.type) {
        case 'unwalled.garden/person': add('users', 'Users', i); break
        case 'website': add('websites', 'Websites', i); break
        case 'application': add('applications', 'Applications', i); break
        case 'webterm.sh/cmd-pkg': add('commands', 'Webterm Commands', i); break
        default: add('drives', 'Drives', i)
      }
    } else if (i.stat.isDirectory()) {
      add('folders', 'Folders', i)
    } else if (i.name.endsWith('.view')) {
      add('views', 'Views', i)
    } else {
      add('files', 'Files', i)
    }
  }

  const groupsOrder = ['folders', 'users', 'websites', 'applications', 'commands', 'drives', 'views', 'files']
  var groupsArr = []
  for (let id in groups) {
    groupsArr[groupsOrder.indexOf(id)] = groups[id]
  }
  return groupsArr
}

export function getSubicon (driveKind, item) {
  if (driveKind === 'root') {
    return ICONS.root[item.path] || ICONS.common[item.path]
  } else if (driveKind === 'person') {
    return ICONS.person[item.path] || ICONS.common[item.path]
  }
}