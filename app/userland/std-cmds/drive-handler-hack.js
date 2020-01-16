// massive hack
// overwrite Hyperdrive to provide information about myself
// so that the drive-handler script can render our ui
window.Hyperdrive = class {
  constructor () {
  }

  async getInfo () {
    return {
      type: 'webterm.sh/cmd-pkg',
      title: 'Standard Commands'
    }
  }

  async readFile (path) {
    return (await fetch(path)).text()
  }
}