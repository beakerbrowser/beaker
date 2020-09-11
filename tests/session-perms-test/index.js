async function main () {
  var sess = await beaker.session.get()
  console.log(sess)

  var btn = document.createElement('button')
  if (sess) {
    btn.textContent = 'Log out'
    btn.onclick = async () => console.log(await beaker.session.destroy())
  } else {
    btn.textContent = 'Log in'
    btn.onclick = async () => {
      await doLog(false, 'bad session request', beaker.session.request({
        permissions: {
          publicFiles: [
            {prefix: '/pages', extension: '.md', access: 'read'},
            {prefix: '/comments', extension: '.md', access: 'read'},
            {prefix: '/test', extension: '.txt', access: 'write'}
          ],
          privateFiles: [
            {prefix: '/pages', extension: '.md', access: 'read'},
            {prefix: '/test', extension: '.txt', access: 'write'}
          ]
        }
      }))
      await doLog(false, 'bad session request', beaker.session.request({
        permissions: {
          publicFiles: [
            {prefix: '/pages', extension: '.md', access: 'read'},
            {prefix: '/comments', extension: '.md', access: 'read'},
            {prefix: '/test/test', extension: '.txt', access: 'write'}
          ],
          privateFiles: [
            {prefix: '/pages', extension: '.md', access: 'read'},
            {prefix: '/test/test', extension: '.txt', access: 'write'}
          ]
        }
      }))
      await doLog(true, 'good session request', beaker.session.request({
        permissions: {
          publicFiles: [
            {prefix: '/pages', extension: '.md', access: 'read'},
            {prefix: '/comments', extension: '.md', access: 'read'},
            {prefix: '/beaker-tests/test', extension: '.txt', access: 'write'}
          ],
          privateFiles: [
            {prefix: '/pages', extension: '.md', access: 'read'},
            {prefix: '/beaker-tests/test', extension: '.txt', access: 'write'}
          ]
        }
      }))
    }
  }
  document.body.append(btn)

  doLog(true, 'listRecords() /pages .md', beaker.index.listRecords({file: {prefix: '/pages', extension: '.md'}}))
  doLog(true, 'listRecords() /microblog .md', beaker.index.listRecords({file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'listRecords() private /pages .md', beaker.index.listRecords({site: 'hyper://private', file: {prefix: '/pages', extension: '.md'}}))
  doLog(false, 'listRecords() private /microblog .md', beaker.index.listRecords({site: 'hyper://private', file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'listRecords() private,public /pages .md', beaker.index.listRecords({site: ['hyper://private', 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/pages', extension: '.md'}}))
  doLog(false, 'listRecords() private,public /microblog .md', beaker.index.listRecords({site: ['hyper://private', 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'listRecords() public /pages .md', beaker.index.listRecords({site: ['hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/pages', extension: '.md'}}))
  doLog(true, 'listRecords() public /microblog .md', beaker.index.listRecords({site: ['hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'listRecords() /pages,/microblog .md', beaker.index.listRecords({file: [{prefix: '/pages', extension: '.md'}, {prefix: '/microblog', extension: '.md'}]}))
  doLog(false, 'listRecords() public,private /pages,/microblog .md', beaker.index.listRecords({site: ['hyper://private', 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: [{prefix: '/pages', extension: '.md'}, {prefix: '/microblog', extension: '.md'}]}))

  doLog(true, 'countRecords() /pages .md', beaker.index.countRecords({file: {prefix: '/pages', extension: '.md'}}))
  doLog(true, 'countRecords() /microblog .md', beaker.index.countRecords({file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'countRecords() private /pages .md', beaker.index.countRecords({site: 'hyper://private', file: {prefix: '/pages', extension: '.md'}}))
  doLog(false, 'countRecords() private /microblog .md', beaker.index.countRecords({site: 'hyper://private', file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'countRecords() private,public /pages .md', beaker.index.countRecords({site: ['hyper://private', 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/pages', extension: '.md'}}))
  doLog(false, 'countRecords() private,public /microblog .md', beaker.index.countRecords({site: ['hyper://private', 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'countRecords() public /pages .md', beaker.index.countRecords({site: ['hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/pages', extension: '.md'}}))
  doLog(true, 'countRecords() public /microblog .md', beaker.index.countRecords({site: ['hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'countRecords() /pages,/microblog .md', beaker.index.countRecords({file: [{prefix: '/pages', extension: '.md'}, {prefix: '/microblog', extension: '.md'}]}))
  doLog(false, 'countRecords() public,private /pages,/microblog .md', beaker.index.countRecords({site: ['hyper://private', 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: [{prefix: '/pages', extension: '.md'}, {prefix: '/microblog', extension: '.md'}]}))

  doLog(true, 'searchRecords() /pages .md', beaker.index.searchRecords('t', {file: {prefix: '/pages', extension: '.md'}}))
  doLog(true, 'searchRecords() /microblog .md', beaker.index.searchRecords('t', {file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'searchRecords() private /pages .md', beaker.index.searchRecords('t', {site: 'hyper://private', file: {prefix: '/pages', extension: '.md'}}))
  doLog(false, 'searchRecords() private /microblog .md', beaker.index.searchRecords('t', {site: 'hyper://private', file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'searchRecords() private,public /pages .md', beaker.index.searchRecords('t', {site: ['hyper://private', 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/pages', extension: '.md'}}))
  doLog(false, 'searchRecords() private,public /microblog .md', beaker.index.searchRecords('t', {site: ['hyper://private', 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'searchRecords() public /pages .md', beaker.index.searchRecords('t', {site: ['hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/pages', extension: '.md'}}))
  doLog(true, 'searchRecords() public /microblog .md', beaker.index.searchRecords('t', {site: ['hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: {prefix: '/microblog', extension: '.md'}}))
  doLog(true, 'searchRecords() /pages,/microblog .md', beaker.index.searchRecords('t', {file: [{prefix: '/pages', extension: '.md'}, {prefix: '/microblog', extension: '.md'}]}))
  doLog(false, 'searchRecords() public,private /pages,/microblog .md', beaker.index.searchRecords('t', {site: ['hyper://private', 'hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39'], file: [{prefix: '/pages', extension: '.md'}, {prefix: '/microblog', extension: '.md'}]}))

  doLog(true, 'getRecord() public /pages/test-page.md', beaker.index.getRecord('hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39/pages/test-page.md'))
  doLog(true, 'getRecord() private /pages/sessions-api.md', beaker.index.getRecord('hyper://private/pages/sessions-api.md'))
  doLog(true, 'getRecord() public /microblog/*.md', beaker.index.getRecord('hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39/microblog/1599085611199.md'))
  doLog(false, 'getRecord() private /comments/*.md', beaker.index.getRecord('hyper://private/comments/1599076506408.md'))
  doLog(false, 'getRecord() private /index.json', beaker.index.getRecord('hyper://private/index.json'))
  doLog(false, 'getRecord() private /pages/foo.json', beaker.index.getRecord('hyper://private/pages/foo.json'))

  var priv = beaker.hyperdrive.drive('hyper://private')
  var pub = beaker.hyperdrive.drive('hyper://6900790c2dba488ca132a0ca6d7259180e993b285ede6b29b464b62453cd5c39/')
  doLog(false, 'readdir(/) private', priv.readdir('/'))
  doLog(true, 'readdir(/) public', pub.readdir('/'))
  doLog(false, 'readdir(/blog) private', priv.readdir('/blog'))
  doLog(true, 'readdir(/blog) public', pub.readdir('/blog'))
  doLog(true, 'readdir(/pages) private', priv.readdir('/pages'))
  doLog(true, 'readdir(/pages) public', pub.readdir('/pages'))
  doLog(false, 'stat(/index.json) private', priv.stat('/index.json'))
  doLog(true, 'stat(/index.json) public', pub.stat('/index.json'))
  doLog(true, 'stat(/pages/decribing-beaker.md) private', priv.stat('/pages/decribing-beaker.md'))
  doLog(false, 'stat(/pages/foo.json) private', priv.stat('/pages/foo.json'))
  doLog(true, 'stat(/pages/test-page.md) public', pub.stat('/pages/test-page.md'))
  doLog(false, 'readFile(/index.json) private', priv.readFile('/index.json'))
  doLog(true, 'readFile(/index.json) public', pub.readFile('/index.json'))
  doLog(true, 'readFile(/pages/decribing-beaker.md) private', priv.readFile('/pages/decribing-beaker.md'))
  doLog(false, 'readFile(/pages/foo.json) private', priv.readFile('/pages/foo.json'))
  doLog(true, 'readFile(/pages/test-page.md) public', pub.readFile('/pages/test-page.md'))
  doLog(false, 'query(/pages) private', priv.query({path: '/pages/*'}))

  await doLog(true, 'writeFile(/beaker-tests/test/hello.txt) private', priv.writeFile('/beaker-tests/test/hello.txt', 'world'))
  await doLog(true, 'writeFile(/beaker-tests/test/hello.txt) public', pub.writeFile('/beaker-tests/test/hello.txt', 'world'))
  await doLog(false, 'writeFile(/beaker-tests/test/hello.json) private', priv.writeFile('/beaker-tests/test/hello.json', 'world'))
  await doLog(false, 'writeFile(/beaker-tests/test/hello.json) public', pub.writeFile('/beaker-tests/test/hello.json', 'world'))
  await doLog(false, 'writeFile(/pages/hello.md) private', priv.writeFile('/pages/hello.md', 'world'))
  await doLog(false, 'writeFile(/pages/hello.md) public', pub.writeFile('/pages/hello.md', 'world'))

  await doLog(true, 'copy(/beaker-tests/test/hello.txt, /beaker-tests/test/hello2.txt) private', priv.copy('/beaker-tests/test/hello.txt', '/beaker-tests/test/hello2.txt'))
  await doLog(true, 'copy(/beaker-tests/test/hello.txt, /beaker-tests/test/hello2.txt) public', pub.copy('/beaker-tests/test/hello.txt', '/beaker-tests/test/hello2.txt'))
  await doLog(true, 'rename(/beaker-tests/test/hello2.txt, /beaker-tests/test/hello3.txt) private', priv.rename('/beaker-tests/test/hello2.txt', '/beaker-tests/test/hello3.txt'))
  await doLog(true, 'rename(/beaker-tests/test/hello2.txt, /beaker-tests/test/hello3.txt) public', pub.rename('/beaker-tests/test/hello2.txt', '/beaker-tests/test/hello3.txt'))
  await doLog(true, 'unlink(/beaker-tests/test/hello3.txt) private', priv.unlink('/beaker-tests/test/hello3.txt'))
  await doLog(true, 'unlink(/beaker-tests/test/hello3.txt) public', pub.unlink('/beaker-tests/test/hello3.txt'))

  await doLog(false, 'copy(/beaker-tests/test/hello.txt, /pages/hello.md) private', priv.copy('/beaker-tests/test/hello.txt', '/pages/hello.md'))
  await doLog(false, 'copy(/beaker-tests/test/hello.txt, /pages/hello.md) public', pub.copy('/beaker-tests/test/hello.txt', '/pages/hello.md'))

  await doLog(false, 'symlink(/index.json, /beaker-tests/test/index.txt) private', priv.symlink('/index.json', '/beaker-tests/test/index.txt'))
  await doLog(true, 'symlink(/index.json, /beaker-tests/test/index.txt) public', pub.symlink('/index.json', '/beaker-tests/test/index.txt'))
  await doLog(true, 'unlink(/beaker-tests/test/index.txt) public', pub.unlink('/beaker-tests/test/index.txt'))

  await doLog(false, 'symlink(/beaker-tests/test/hello.txt, /pages/hello.md) private', priv.symlink('/beaker-tests/test/hello.txt', '/pages/hello.md'))
  await doLog(false, 'symlink(/beaker-tests/test/hello.txt, /pages/hello.md) public', pub.symlink('/beaker-tests/test/hello.txt', '/pages/hello.md'))

  await doLog(true, 'copy(/pages/decribing-beaker.md, /beaker-tests/test/describing-beaker.txt) private', priv.copy('/pages/decribing-beaker.md', '/beaker-tests/test/describing-beaker.txt'))
  await doLog(true, 'copy(/pages/test-page.md, /beaker-tests/test/test-page.txt) public', pub.copy('/pages/test-page.md', '/beaker-tests/test/test-page.txt'))

  await doLog(true, 'unlink(/beaker-tests/test/hello.txt) private', priv.unlink('/beaker-tests/test/hello.txt'))
  await doLog(true, 'unlink(/beaker-tests/test/hello.txt) public', pub.unlink('/beaker-tests/test/hello.txt'))
  await doLog(false, 'unlink(/beaker-tests/test/hello.json) private', priv.unlink('/beaker-tests/test/hello.json'))
  await doLog(false, 'unlink(/beaker-tests/test/hello.json) public', pub.unlink('/beaker-tests/test/hello.json'))
  await doLog(false, 'unlink(/pages/hello.md) private', priv.unlink('/pages/hello.md'))
  await doLog(false, 'unlink(/pages/hello.md) public', pub.unlink('/pages/hello.md'))

  await doLog(false, 'mkdir(/beaker-tests/test/sub)', priv.mkdir('/beaker-tests/test/sub'))
  await doLog(false, 'mkdir(/beaker-tests/test/sub)', pub.mkdir('/beaker-tests/test/sub'))
  await doLog(false, 'rmdir(/test)', priv.rmdir('/test'))
  await doLog(false, 'rmdir(/test)', pub.rmdir('/test'))
}

async function doLog (shouldSucceed, text, promise) {
  try {
    var res = await promise
    if (!shouldSucceed) {
      console.error('❌', text, res)
    } else {
      console.log('✅', text)
    }
  } catch (e) {
    if (shouldSucceed) {
      console.error('❌', text, e)
    } else {
      console.log('✅', text, e)
    }
  }
}

main()