// this script cant depend on any modules except what's bundled with node
var path = require('path')
var fs = require('fs')
var run = require('./util-run')
var _0666 = parseInt('666', 8)
// for EMFILE handling
var timeout = 0

var isWindows = (process.platform === "win32")

function main () {
  var projectDir = __dirname.split(path.sep).filter(Boolean).slice(0, -2).join(path.sep)
  if (!isWindows) projectDir = path.sep + projectDir
  var appDir = path.join(projectDir, 'app')
  var scriptsDir = path.join(projectDir, 'scripts')
  rmNodeModules(scriptsDir)
  rmNodeModules(appDir)
  rmPackageLock(scriptsDir)
  rmPackageLock(appDir)
  run('npm install', {shell: true}, function () {
    run('npm run rebuild', {shell: true}, function () {
      run('npm run build', {shell: true}, function () {
        process.exit(0)
      })
    })
  })
}

function rmNodeModules (dir) {
  dir = path.join(dir, 'node_modules')
  console.log('rm -rf', dir)
  rimrafSync(dir)
}

function rmPackageLock (dir) {
  var file = path.join(dir, 'package-lock.json')
  console.log('rm', file)
  rimrafSync(file)
}

main()

// rimrafSync, pulled from rimraf

function rimrafSync (p) {
  try {
    var st = fs.lstatSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return

    // Windows can EPERM on stat.  Life is suffering.
    if (er.code === "EPERM" && isWindows)
      fixWinEPERMSync(p, er)
  }

  try {
    // sunos lets the root user unlink directories, which is... weird.
    if (st && st.isDirectory())
      rmdirSync(p, null)
    else
      fs.unlinkSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return
    if (er.code === "EPERM")
      return isWindows ? fixWinEPERMSync(p, er) : rmdirSync(p, er)
    if (er.code !== "EISDIR")
      throw er

    rmdirSync(p, er)
  }
}

function rmdirSync (p, originalEr) {
  try {
    fs.rmdirSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return
    if (er.code === "ENOTDIR")
      throw originalEr
    if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
      rmkidsSync(p)
  }
}

function rmkidsSync (p) {
  fs.readdirSync(p).forEach(function (f) {
    rimrafSync(path.join(p, f))
  })

  // We only end up here once we got ENOTEMPTY at least once, and
  // at this point, we are guaranteed to have removed all the kids.
  // So, we know that it won't be ENOENT or ENOTDIR or anything else.
  // try really hard to delete stuff on windows, because it has a
  // PROFOUNDLY annoying habit of not closing handles promptly when
  // files are deleted, resulting in spurious ENOTEMPTY errors.
  var retries = isWindows ? 100 : 1
  var i = 0
  do {
    var threw = true
    try {
      var ret = fs.rmdirSync(p)
      threw = false
      return ret
    } finally {
      if (++i < retries && threw)
        continue
    }
  } while (true)
}

function fixWinEPERMSync (p, er) {
  try {
    fs.chmodSync(p, _0666)
  } catch (er2) {
    if (er2.code === "ENOENT")
      return
    else
      throw er
  }

  try {
    var stats = fs.statSync(p)
  } catch (er3) {
    if (er3.code === "ENOENT")
      return
    else
      throw er
  }

  if (stats.isDirectory())
    rmdirSync(p, er)
  else
    fs.unlinkSync(p)
}