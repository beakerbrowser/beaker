import { h } from './util.js'

export class DrivePosts extends HTMLElement {
  constructor () {
    super()
    this.load()
  }

  get mode () {
    var {pathname} = location
    if (pathname === '/') return 'recent'
    if (pathname === '/posts/') return 'all'
    if (pathname.startsWith('/posts/')) return 'topic'
  }

  get topic () {
    var {pathname} = location
    return pathname.split('/').filter(Boolean)[1]
  }

  async load () {
    this.info = await hyperdrive.self.getInfo()
    var path = this.mode === 'topic' ? `/posts/${this.topic}/*` : '/posts/*/*'
    this.posts = await hyperdrive.self.query({
      type: 'file',
      path,
      sort: 'ctime',
      reverse: true,
      limit: this.mode === 'recent' ? 10 : undefined
    })
    this.render()
  }

  render () {
    for (let post of this.posts) {
      let href = post.stat.metadata.href || post.url
      let link = h('h3', {}, h('a', {href}, post.stat.metadata.title))

      let topic = post.path.split('/').slice(-2, -1)[0]
      let topicA = h('a', {className:' topic', href: `/posts/${topic}/`}, topic)
      let details = h('div', {className: 'details'}, [
        '[', topicA, `] Posted ${post.stat.ctime.toLocaleString()}`
      ])

      this.append(h('div', {className: 'post'}, [
        link,
        details
      ]))
    }
  }
}
customElements.define('drive-posts', DrivePosts)