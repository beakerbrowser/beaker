import * as yo from 'yo-yo'
import {BaseModal} from './base'

// exported api
// =

export class TutorialModal extends BaseModal {
  constructor (opts) {
    super(opts)
    this.screen = opts.screen
    this.button = opts.button || 'Next'
  }

  render () {
    return yo`
      <div style="padding: 10px 20px 6px; width: 500px; text-align: center; line-height: 2">
        ${SCREENS[this.screen].call(this)}
        <p style="text-align: right">
          <a class="btn primary" onclick=${() => this.close()}>${this.button}</a>
        </p>
      </div>`
  }
}

const SCREENS = {
  intro () {
    return yo`
      <div>
        <h3>Welcome to Beaker <span style="color: blue">Blue</span></h3>
        <p>
          This is a preview build.
        </p>
      </div>`
  },
  userSite () {
    return yo`
      <div>
        <h3>Your Website</h3>
        <p>
          This is your personal Website. Let${"'"}s set it up.
        </p>
      </div>`
  },
  userSiteCanBeChanged () {
    return yo`
      <div>
        <h3>Looks good!</h3>
        <p>
          You can change your details at any time. Just visit your site and click "Edit Profile" on the left.
        </p>
      </div>`  
  },
  userSiteSource () {
    return yo`
      <div>
        <h3>Viewing source</h3>
        <p>
          This is the source code to your personal Website. You can access it by right clicking your site and choosing "View Source."
        </p>
        <p>
          <small>(Hint: if you${"'"}re a developer, you can customize your site by editing the HTML.)</small>
        </p>
      </div>`
  },
  feed () {
    return yo`
      <div>
        <h3>Social feed</h3>
        <p>
          This is your feed. Use it to post and read status updates.
        </p>
        <p>
          <small>(All of your posts will be automatically published to your website.)</small>
        </p>
      </div>`
  },
  followSomeone () {
    return yo`
      <div>
        <h3>Following other users</h3>  
        <p>
          You can follow other Beaker sites. Why don${"'"}t you follow us?
        </p>
      </div>`
  },
  crawler () {
    return yo`
      <div>
        <h3>Web crawler</h3>  
        <p>
          Like a search engine, Beaker crawls the sites you follow.
          You can see the progress it${"'"}s making now.
        </p>
      </div>`
  },
  populatedFeed () {
    return yo`
      <div>
        <h3>More data!</h3>
        <p>
          Your feed should now have posts from the Beaker site.
        </p>
      </div>`
  },
  populatedSearch () {
    return yo`
      <div>
        <h3>Search results</h3>
        <p>
          Your searches will have results from the sites you follow. This is a good way to find people and information.
        </p>
      </div>`
  },
  goodbye () {
    return yo`
      <div>
        <h3>Welcome to the P2P Web!</h3>
        <p>
          We hope you enjoy this preview build.
        </p>
      </div>`
  },
  todo () {
    return yo`
      <div>
        TODO
      </div>`
  }
}
