import * as yo from 'yo-yo'
import {BaseSiteInfo} from './base'

// exported api
// =

export class ExampleSiteInfo extends BaseSiteInfo {
  static shouldRender (page) {
    var url = new URL(page.getIntendedURL())
    // makes sense, right?
    return url.hostname === 'example.com'
  }

  constructor (page) {
    super(page)
    this.i = 0
  }

  render () {
    return yo`
      <div style="padding: 10px 20px 6px">
        <h3>Example Site Info</h3>
        <p>
          Hello world! <a class="link" onclick=${() => this.onIncrement()}>Click me (${this.i} clicks)</a>
        </p>
      </div>`
  }

  onIncrement () {
    this.i++
    this.rerender()
  }
}
