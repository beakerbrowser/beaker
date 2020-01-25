import { DrivePosts } from './posts.js'
import { DriveFiles } from './files.js'
import { h } from './util.js'
import MarkdownIt from './markdown-it.js'

const md = MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: true,
  langPrefix: 'language-',
  linkify: false,
  typographer: true,
  quotes: '“”‘’',
  highlight: undefined
})

export class DrivePage extends HTMLElement {
  constructor () {
    super()
    this.load()
  }

  async load () {
    var {pathname} = location
    this.self = new Hyperdrive(location)
    this.stat = await this.self.stat(pathname).catch(e => undefined)

    if (this.stat && this.stat.isFile()) {
      if (/\.(png|jpe?g|gif)/i.test(pathname)) {
        this.append(h('img', {className: 'content', src: pathname, title: pathname.split('/').pop()}))
      } else if (/\.(mp4|webm|mov)/i.test(pathname)) {
        this.append(h('video', {className: 'content', controls: true}, h('source', {src: pathname})))
      } else if (/\.(mp3|ogg)/i.test(pathname)) {
        this.append(h('audio', {className: 'content', controls: true}, h('source', {src: pathname})))
      } else {
        let text = await this.self.readFile(pathname)
        if (pathname.endsWith('.md')) {
          let content = h('div', {className: 'content'})
          content.innerHTML = md.render(text)
          this.append(content)
        } else {
          this.append(h('pre', {className: 'content'}, text))
        }
      }
    } else if (!this.stat && pathname !== '/') {
      // 404 todo
    } else {
      if (pathname === '/' || pathname.startsWith('/posts/')) {
        this.append(new DrivePosts())
      }
      this.append(new DriveFiles())
    }
  }
}
customElements.define('drive-page', DrivePage)