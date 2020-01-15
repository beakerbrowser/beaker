import { joinPath } from 'beaker://app-stdlib/js/strings.js'

export async function diff (leftDrive, initLeftPath, rightDrive, initRightPath, opts) {
  opts = opts || {}
  var compareContentCache = opts.compareContentCache
  var seen = new Set()
  var changes = []
  await walk(initLeftPath, initRightPath)
  return changes

  async function walk (leftPath, rightPath) {
    // get files in folder
    var [leftNames, rightNames] = await Promise.all([
      leftDrive.readdir(leftPath),
      rightDrive.readdir(rightPath)
    ])

    // run ops based on set membership
    var ps = []
    console.debug('walk', leftPath, leftNames, rightPath, rightNames)
    leftNames.forEach(name => {
      if (rightNames.indexOf(name) === -1) {
        ps.push(addRecursive(joinPath(leftPath, name), joinPath(rightPath, name)))
      } else {
        ps.push(diff(joinPath(leftPath, name), joinPath(rightPath, name)))
      }
    })
    rightNames.forEach(name => {
      if (leftNames.indexOf(name) === -1) {
        ps.push(delRecursive(joinPath(leftPath, name), joinPath(rightPath, name)))
      } else {
        // already handled
      }
    })
    return Promise.all(ps)
  }

  async function diff (leftPath, rightPath) {
    console.debug('diff', leftPath, rightPath)
    if (opts.filter && !(opts.filter(leftPath) || opts.filter(rightPath))) {
      return
    }
    // stat the entry
    var [leftStat, rightStat] = await Promise.all([
      leftDrive.stat(leftPath),
      rightDrive.stat(rightPath)
    ])
    // check for cycles
    checkForCycle(leftStat, leftPath)
    checkForCycle(rightStat, rightPath)
    // both a file
    if (leftStat.isFile() && rightStat.isFile()) {
      return diffFile(leftPath, leftStat, rightPath, rightStat)
    }
    // both a dir
    if (leftStat.isDirectory() && !leftStat.mount && rightStat.isDirectory() && !rightStat.mount) {
      return walk(leftPath, rightPath)
    }
    // both a mount
    if (leftStat.mount && rightStat.mount) {
      if (leftStat.mount.key !== rightStat.mount.key) {
        changes.push({change: 'mod', type: 'mount', leftPath, rightPath, leftMountKey: leftStat.mount.key, rightMountKey: rightStat.mount.key})
      }
      return
    }
    // incongruous, remove all in left then add all in right
    await delRecursive(leftPath, rightPath, true)
    await addRecursive(leftPath, rightPath, true)
  }

  async function diffFile (leftPath, leftStat, rightPath, rightStat) {
    console.debug('diffFile', leftPath, rightPath)
    var isEq = (
      (leftStat.size === rightStat.size) &&
      (isTimeEqual(leftStat.mtime, rightStat.mtime))
    )
    if (!isEq && opts.compareContent) {
      // try the cache
      let cacheHit = false
      if (compareContentCache) {
        let cacheEntry = compareContentCache[leftPath]
        if (cacheEntry && cacheEntry.leftMtime === +leftStat.mtime && cacheEntry.rightMtime === +rightStat.mtime) {
          isEq = cacheEntry.isEq
          cacheHit = true
        }
      }

      // actually compare the files
      if (!cacheHit) {
        let [ls, rs] = await Promise.all([
          leftDrive.readFile(leftPath, 'utf8'),
          rightDrive.readFile(rightPath, 'utf8')
        ])
        isEq = ls === rs
      }

      // store in the cache
      if (compareContentCache && !cacheHit) {
        compareContentCache[leftPath] = {
          leftMtime: +leftStat.mtime,
          rightMtime: +rightStat.mtime,
          isEq
        }
      }
    }
    if (!isEq) {
      changes.push({change: 'mod', type: 'file', leftPath, rightPath})
    }
  }

  async function addRecursive (leftPath, rightPath, isFirstRecursion = false) {
    console.debug('addRecursive', leftPath, rightPath)
    if (opts.filter && !(opts.filter(leftPath) || opts.filter(rightPath))) {
      return
    }
    // find everything at and below the current path in staging
    // they should be added
    var st = await leftDrive.stat(leftPath)
    if (!isFirstRecursion /* when first called from diff(), dont check for a cycle again */) {
      checkForCycle(st, leftPath)
    }
    if (st.mount) {
      changes.push({change: 'add', type: 'mount', leftPath, rightPath, leftMountKey: st.mount.key})
    } else if (st.isFile()) {
      changes.push({change: 'add', type: 'file', leftPath, rightPath})
    } else if (st.isDirectory()) {
      // add dir first
      changes.push({change: 'add', type: 'dir', leftPath, rightPath})
      // add children second
      if (!opts.shallow) {
        var children = await leftDrive.readdir(leftPath)
        await Promise.all(children.map(name => addRecursive(joinPath(leftPath, name), joinPath(rightPath, name))))
      }
    }
  }

  async function delRecursive (leftPath, rightPath, isFirstRecursion = false) {
    console.debug('delRecursive', leftPath, rightPath)
    if (opts.filter && !(opts.filter(leftPath) || opts.filter(rightPath))) {
      return
    }
    // find everything at and below the current path in the archive
    // they should be removed
    var st = await rightDrive.stat(rightPath)
    if (!isFirstRecursion /* when first called from diff(), dont check for a cycle again */) {
      checkForCycle(st, rightPath)
    }
    if (st.mount) {
      changes.push({change: 'del', type: 'mount', leftPath, rightPath, rightMountKey: st.mount.key})
    } else if (st.isFile()) {
      changes.push({change: 'del', type: 'file', leftPath, rightPath})
    } else if (st.isDirectory()) {
      // del children first
      if (!opts.shallow) {
        var children = await rightDrive.readdir(rightPath)
        await Promise.all(children.map(name => delRecursive(joinPath(leftPath, name), joinPath(rightPath, name))))
      }
      // del dir second
      changes.push({change: 'del', type: 'dir', leftPath, rightPath})
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

export async function applyRight (leftDrive, rightDrive, changes) {
  // copies can be done in parallel
  var promises = []

  // apply changes
  console.debug('applyRight', changes)
  for (let i = 0; i < changes.length; i++) {
    let d = changes[i]
    let op = d.change + d.type
    if (op === 'adddir') {
      console.debug('mkdir', d.rightPath)
      await rightDrive.mkdir(d.rightPath)
    }
    if (op === 'deldir') {
      console.debug('rmdir', d.rightPath)
      await rightDrive.rmdir(d.rightPath)
    }
    if (op === 'addfile' || op === 'modfile') {
      console.debug('copy', d.leftPath, d.rightPath)
      promises.push(copy(leftDrive, d.leftPath, rightDrive, d.rightPath))
    }
    if (op === 'addmount') {
      console.debug('mount', d.rightPath)
      await rightDrive.mount(d.rightPath, d.leftMountKey)
    }
    if (op === 'modmount') {
      console.debug('mount', d.rightPath)
      await rightDrive.unmount(d.rightPath)
      await rightDrive.mount(d.rightPath, d.leftMountKey)
    }
    if (op === 'delfile') {
      console.debug('unlink', d.rightPath)
      await rightDrive.unlink(d.rightPath)
    }
    if (op === 'delmount') {
      console.debug('unmount', d.rightPath)
      await rightDrive.unmount(d.rightPath)
    }
  }
  return Promise.all(promises)
}

export async function applyLeft (leftDrive, rightDrive, changes) {
  // copies can be done in parallel
  var promises = []

  // apply opposite changes, in reverse
  console.debug('applyLeft', changes)
  for (let i = changes.length - 1; i >= 0; i--) {
    let d = changes[i]
    let op = d.change + d.type
    if (op === 'adddir') {
      console.debug('rmdir', d.leftPath)
      await leftDrive.rmdir(d.leftPath)
    }
    if (op === 'deldir') {
      console.debug('mkdir', d.leftPath)
      await leftDrive.mkdir(d.leftPath)
    }
    if (op === 'addfile') {
      console.debug('unlink', d.leftPath)
      await leftDrive.unlink(d.leftPath)
    }
    if (op === 'addmount') {
      console.debug('unmount', d.leftPath)
      await leftDrive.unmount(d.leftPath)
    }
    if (op === 'modmount') {
      console.debug('mount', d.leftPath)
      await leftDrive.unmount(d.leftPath)
      await leftDrive.mount(d.leftPath, d.rightMountKey)
    }
    if (op === 'delmount') {
      console.debug('mount', d.leftPath)
      await leftDrive.mount(d.leftPath, d.rightMountKey)
    }
    if (op === 'modfile' || op === 'delfile') {
      console.debug('copy', d.path)
      promises.push(copy(rightDrive, d.rightPath, leftDrive, d.leftPath))
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