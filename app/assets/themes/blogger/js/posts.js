import { h } from './util.js'

export class DrivePosts extends HTMLElement {
  constructor () {
    super()
    this.self = new Hyperdrive(location)
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
    this.info = await this.self.getInfo()
    var path = this.mode === 'topic' ? `/posts/${this.topic}/*` : '/posts/*/*'
    this.posts = await this.self.query({
      type: 'file',
      path,
      sort: 'ctime',
      reverse: true,
      limit: this.mode === 'recent' ? 10 : undefined
    })
    this.render()
  }

  render () {
    var mode = this.mode

    var header = h('header')
    if (this.info.writable) {
      header.append(h('div', {className: 'admin'}, [
        h('a', {className: 'btn', href: `https://beaker.network/compose`}, '+ New Post')
      ]))
    }
    if (mode === 'recent') header.append(h('h2', {}, 'Recent posts'))
    if (mode === 'all') header.append(h('h2', {}, 'All posts'))
    if (mode === 'topic') header.append(h('h2', {}, `"${this.topic}" posts`))
    this.append(header)

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