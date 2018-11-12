const rpc = require('pauls-electron-rpc')

rpc.exportAPI('test-hidden-process', {
  foo1: 'promise',
  foo2: 'promise',
  stream: 'readable'
}, {
  async foo1 () {
    return 'hello world!'
  },
  async foo2 () {
    await new Promise(r => setTimeout(r, 2e3))
    return 'foo2!'
  },
  stream () {
    throw new Error('todo')
  }
})