import { joinPath } from 'beaker://app-stdlib/js/strings.js'

export async function diff (baseDrive, initBasePath, targetDrive, initTargetPath, opts) {
  opts = opts || {}
  var compareContentCache = opts.compareContentCache
  var seen = new Set()
  var changes = []
  await walk(initBasePath, initTargetPath)
  return changes

  async function walk (basePath, targetPath) {
    // get files in folder
    var [baseNames, targetNames] = await Promise.all([
      baseDrive.readdir(basePath),
      targetDrive.readdir(targetPath)
    ])

    // run ops based on set membership
    var ps = []
    console.debug('walk', basePath, baseNames, targetPath, targetNames)
    baseNames.forEach(name => {
      if (targetNames.indexOf(name) === -1) {
        ps.push(addRecursive(joinPath(basePath, name), joinPath(targetPath, name)))
      } else {
        ps.push(diff(joinPath(basePath, name), joinPath(targetPath, name)))
      }
    })
    targetNames.forEach(name => {
      if (baseNames.indexOf(name) === -1) {
        ps.push(delRecursive(joinPath(basePath, name), joinPath(targetPath, name)))
      } else {
        // already handled
      }
    })
    return Promise.all(ps)
  }

  async function diff (basePath, targetPath) {
    console.debug('diff', basePath, targetPath)
    if (opts.filter && !(opts.filter(basePath) || opts.filter(targetPath))) {
      return
    }
    // stat the entry
    var [baseStat, targetStat] = await Promise.all([
      baseDrive.stat(basePath),
      targetDrive.stat(targetPath)
    ])
    // check for cycles
    checkForCycle(baseStat, basePath)
    checkForCycle(targetStat, targetPath)
    // both a file
    if (baseStat.isFile() && targetStat.isFile()) {
      return diffFile(basePath, baseStat, targetPath, targetStat)
    }
    // both a dir
    if (baseStat.isDirectory() && !baseStat.mount && targetStat.isDirectory() && !targetStat.mount) {
      return walk(basePath, targetPath)
    }
    // both a mount
    if (baseStat.mount && targetStat.mount) {
      if (baseStat.mount.key !== targetStat.mount.key) {
        changes.push({change: 'mod', type: 'mount', basePath, targetPath, baseMountKey: baseStat.mount.key, targetMountKey: targetStat.mount.key})
      }
      return
    }
    // incongruous, remove all in left then add all in right
    await delRecursive(basePath, targetPath, true)
    await addRecursive(basePath, targetPath, true)
  }

  async function diffFile (basePath, baseStat, targetPath, targetStat) {
    console.debug('diffFile', basePath, targetPath)
    var isEq = (
      (baseStat.size === targetStat.size) &&
      (isTimeEqual(baseStat.mtime, targetStat.mtime))
    )
    if (!isEq && opts.compareContent) {
      // try the cache
      let cacheHit = false
      if (compareContentCache) {
        let cacheEntry = compareContentCache[basePath]
        if (cacheEntry && cacheEntry.baseMtime === +baseStat.mtime && cacheEntry.targetMtime === +targetStat.mtime) {
          isEq = cacheEntry.isEq
          cacheHit = true
        }
      }

      // actually compare the files
      if (!cacheHit) {
        let [ls, rs] = await Promise.all([
          baseDrive.readFile(basePath, 'utf8'),
          targetDrive.readFile(targetPath, 'utf8')
        ])
        isEq = ls === rs
      }

      // store in the cache
      if (compareContentCache && !cacheHit) {
        compareContentCache[basePath] = {
          baseMtime: +baseStat.mtime,
          targetMtime: +targetStat.mtime,
          isEq
        }
      }
    }
    if (!isEq) {
      changes.push({change: 'mod', type: 'file', basePath, targetPath})
    }
  }

  async function addRecursive (basePath, targetPath, isFirstRecursion = false) {
    console.debug('addRecursive', basePath, targetPath)
    if (opts.filter && !(opts.filter(basePath) || opts.filter(targetPath))) {
      return
    }
    // find everything at and below the current path in staging
    // they should be added
    var st = await baseDrive.stat(basePath)
    if (!isFirstRecursion /* when first called from diff(), dont check for a cycle again */) {
      checkForCycle(st, basePath)
    }
    if (st.mount) {
      changes.push({change: 'add', type: 'mount', basePath, targetPath, baseMountKey: st.mount.key})
    } else if (st.isFile()) {
      changes.push({change: 'add', type: 'file', basePath, targetPath})
    } else if (st.isDirectory()) {
      // add dir first
      changes.push({change: 'add', type: 'dir', basePath, targetPath})
      // add children second
      if (!opts.shallow) {
        var children = await baseDrive.readdir(basePath)
        await Promise.all(children.map(name => addRecursive(joinPath(basePath, name), joinPath(targetPath, name))))
      }
    }
  }

  async function delRecursive (basePath, targetPath, isFirstRecursion = false) {
    console.debug('delRecursive', basePath, targetPath)
    if (opts.filter && !(opts.filter(basePath) || opts.filter(targetPath))) {
      return
    }
    // find everything at and below the current path in the drive
    // they should be removed
    var st = await targetDrive.stat(targetPath)
    if (!isFirstRecursion /* when first called from diff(), dont check for a cycle again */) {
      checkForCycle(st, targetPath)
    }
    if (st.mount) {
      changes.push({change: 'del', type: 'mount', basePath, targetPath, targetMountKey: st.mount.key})
    } else if (st.isFile()) {
      changes.push({change: 'del', type: 'file', basePath, targetPath})
    } else if (st.isDirectory()) {
      // del children first
      if (!opts.shallow) {
        var children = await targetDrive.readdir(targetPath)
        await Promise.all(children.map(name => delRecursive(joinPath(basePath, name), joinPath(targetPath, name))))
      }
      // del dir second
      changes.push({change: 'del', type: 'dir', basePath, targetPath})
    }
  }

  function checkForCycle (st, path) {
    return
    // TODO needed to handle symlinks
    var id = path
    if (seen.has(id)) {
      throw new CycleError(path)
    }
    seen.add(id)
  }
}

export async function applyRight (baseDrive, targetDrive, changes) {
  // copies can be done in parallel
  var promises = []

  // apply changes
  console.debug('applyRight', changes)
  for (let i = 0; i < changes.length; i++) {
    let d = changes[i]
    let op = d.change + d.type
    if (op === 'adddir') {
      console.debug('mkdir', d.targetPath)
      await targetDrive.mkdir(d.targetPath)
    }
    if (op === 'deldir') {
      console.debug('rmdir', d.targetPath)
      await targetDrive.rmdir(d.targetPath)
    }
    if (op === 'addfile' || op === 'modfile') {
      console.debug('copy', d.basePath, d.targetPath)
      promises.push(copy(baseDrive, d.basePath, targetDrive, d.targetPath))
    }
    if (op === 'addmount') {
      console.debug('mount', d.targetPath)
      await targetDrive.mount(d.targetPath, d.baseMountKey)
    }
    if (op === 'modmount') {
      console.debug('mount', d.targetPath)
      await targetDrive.unmount(d.targetPath)
      await targetDrive.mount(d.targetPath, d.baseMountKey)
    }
    if (op === 'delfile') {
      console.debug('unlink', d.targetPath)
      await targetDrive.unlink(d.targetPath)
    }
    if (op === 'delmount') {
      console.debug('unmount', d.targetPath)
      await targetDrive.unmount(d.targetPath)
    }
  }
  return Promise.all(promises)
}

export async function applyLeft (baseDrive, targetDrive, changes) {
  // copies can be done in parallel
  var promises = []

  // apply opposite changes, in reverse
  console.debug('applyLeft', changes)
  for (let i = changes.length - 1; i >= 0; i--) {
    let d = changes[i]
    let op = d.change + d.type
    if (op === 'adddir') {
      console.debug('rmdir', d.basePath)
      await baseDrive.rmdir(d.basePath)
    }
    if (op === 'deldir') {
      console.debug('mkdir', d.basePath)
      await baseDrive.mkdir(d.basePath)
    }
    if (op === 'addfile') {
      console.debug('unlink', d.basePath)
      await baseDrive.unlink(d.basePath)
    }
    if (op === 'addmount') {
      console.debug('unmount', d.basePath)
      await baseDrive.unmount(d.basePath)
    }
    if (op === 'modmount') {
      console.debug('mount', d.basePath)
      await baseDrive.unmount(d.basePath)
      await baseDrive.mount(d.basePath, d.targetMountKey)
    }
    if (op === 'delmount') {
      console.debug('mount', d.basePath)
      await baseDrive.mount(d.basePath, d.targetMountKey)
    }
    if (op === 'modfile' || op === 'delfile') {
      console.debug('copy', d.path)
      promises.push(copy(targetDrive, d.targetPath, baseDrive, d.basePath))
    }
  }
  return Promise.all(promises)
}

function isTimeEqual (a, b) {
  return (+a) === (+b)
}

async function copy (srcDrive, srcPath, dstDrive, dstPath) {
  let [srcStat, srcContent] = await Promise.all([
    srcDrive.stat(srcPath),
    srcDrive.readFile(srcPath, 'buffer')
  ])
  await dstDrive.writeFile(dstPath, srcContent, {metadata: srcStat.metadata})
}

class CycleError extends Error {
  constructor (path) {
    var msg = `Aborting file-tree comparison, a symlink or hardlink loop was detected at ${path}`
    super(msg)
    this.name = 'CycleError'
    this.message = msg
  }
}