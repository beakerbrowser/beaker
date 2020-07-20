import { joinPath } from './strings.js'

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

export function getSubicon (item) {
  // TODO any?
}

async function doCopyOrMove ({sourceItem, targetFolder}, op) {
  let sourceItemParsed = new URL(sourceItem)
  var sourceDrive = beaker.hyperdrive.drive(sourceItemParsed.hostname)
  let targetFolderParsed = new URL(targetFolder)
  var targetDrive = beaker.hyperdrive.drive(targetFolderParsed.hostname)

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

export function doImport (targetFolder, fileOrFolder) {
  let targetFolderParsed = new URL(targetFolder)
  var targetDrive = beaker.hyperdrive.drive(targetFolderParsed.hostname)

  const handleFileOrFolder = (entry, path = '') => {
    if (entry.isDirectory) {
      return handleFolder(entry, path)
    } else if (entry.isFile) {
      return handleFile(entry, path)
    }
  }

  const handleFolder = (folderEntry, path) => {
    return new Promise((resolve, reject) => {
      var dirReader = folderEntry.createReader()
      dirReader.readEntries(async (entries) => {
        try {
          var name = folderEntry.name
          var targetPath = joinPath(path, name)
          var targetSt = await (targetDrive.stat(targetPath).catch(e => undefined))
          if (targetSt) {
            if (!confirm(`${name} already exists in the target folder. Overwrite?`)) {
              throw new Error('Canceled')
            }
            if (targetSt.isFile()) {
              await targetDrive.unlink(targetPath)
            } else {
              await targetDrive.rmdir(targetPath, {recursive: true})
            }
          }
          await targetDrive.mkdir(targetPath)
          for (let entry of entries) {
            await handleFileOrFolder(entry, targetPath)
          }
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  const handleFile = (fileEntry, path) => {
    return new Promise((resolve, reject) => {
      fileEntry.file(file => {
        let reader = new FileReader()
        reader.readAsArrayBuffer(file)
        reader.onloadend = async () => {
          try {
            var name = file.name
            var targetPath = joinPath(path, name)
            var targetSt = await (targetDrive.stat(targetPath).catch(e => undefined))
            if (targetSt) {
              if (targetSt.isFile() && !confirm(`${name} already exists in the target folder. Overwrite?`)) {
                throw new Error('Canceled')
              } else if (targetSt.isDirectory()) {
                alert(`A folder named "${name}" already exists in the target folder and cannot be overwritten.`)
                throw new Error('Canceled')
              }
            }
            await targetDrive.writeFile(targetPath, reader.result, 'buffer')
            resolve()
          } catch (e) {
            reject(e)
          }
        }
      })
    })
  }
  
  handleFileOrFolder(fileOrFolder.webkitGetAsEntry(), targetFolderParsed.pathname || '')
}

export async function canWriteTo (url) {
  let urlp = new URL(url)
  let drive = beaker.hyperdrive.drive(urlp.host)
  let acc = []
  for (let segment of urlp.pathname.split('/')) {
    acc.push(segment)
    let st = await drive.stat(acc.join('/'))
    if (st.mount && st.mount.key) {
      drive = beaker.hyperdrive.drive(st.mount.key)
      acc = []
    }
  }
  return (await drive.getInfo()).writable
}