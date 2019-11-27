import { joinPath } from 'beaker://app-stdlib/js/strings.js'

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
      switch (i.mount.type) {
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
    return ICONS.root[item.realPath] || ICONS.common[item.realPath]
  } else if (driveKind === 'person') {
    return ICONS.person[item.realPath] || ICONS.common[item.realPath]
  }
}

async function doCopyOrMove ({sourceItem, targetFolder}, op) {
  let sourceItemParsed = new URL(sourceItem)
  var sourceDrive = new DatArchive(sourceItemParsed.hostname)
  let targetFolderParsed = new URL(targetFolder)
  var targetDrive = new DatArchive(targetFolderParsed.hostname)

  var name = sourceItemParsed.pathname.split('/').pop()
  var targetPath = joinPath(targetFolderParsed.pathname, name)
  var targetSt = await (targetDrive.stat(targetPath).catch(e => undefined))
  if (targetSt) {
    if (targetSt.isFile() && !confirm(`${name} already exists in the target folder. Overwrite?`)) {
      throw new Error('Canceled')
    } else if (targetSt.isDirectory()) {
      alert(`A folder named "${name}" already exists in the target folder and cannot be overwritten.`)
      throw new Error('Canceled')
    }
  }

  return op(sourceDrive, sourceItemParsed.pathname, targetDrive, targetPath)
}

export async function doCopy (params) {
  return doCopyOrMove(params, (sourceDrive, sourcePath, targetDrive, targetPath) => sourceDrive.copy(sourcePath, joinPath(targetDrive.url, targetPath)))
}

export async function doMove (params) {
  return doCopyOrMove(params, (sourceDrive, sourcePath, targetDrive, targetPath) => sourceDrive.rename(sourcePath, joinPath(targetDrive.url, targetPath)))
}

export async function canWriteTo (url) {
  let urlp = new URL(url)
  let drive = new DatArchive(urlp.host)
  let acc = []
  for (let segment of urlp.pathname.split('/')) {
    acc.push(segment)
    let st = await drive.stat(acc.join('/'))
    if (st.mount && st.mount.key) {
      drive = new DatArchive(st.mount.key)
      acc = []
    }
  }
  return (await drive.getInfo()).writable
}