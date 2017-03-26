import * as yo from 'yo-yo'
import DatProfileSite from 'dat-profile-site'
import {writeToClipboard} from '../../lib/fg/event-handlers'
var Croppie = require('../../lib/fg/croppie')

const SUGGESTED_SITES = [
  {img: 'beaker://assets/logo.png', name: 'Beaker News', description: 'The latest updates on your favorite p2p browser.'},
  {img: 'beaker://assets/logo.png', name: 'Beaker News', description: 'The latest updates on your favorite p2p browser.'},
  {img: 'beaker://assets/logo.png', name: 'Beaker News', description: 'The latest updates on your favorite p2p browser.'}
]
const IS_HASHBASE_AVAILABLE = false

var currentStep
var profileDat
var imageURL, imageName
var croppie
setup()

// rendering
// =

function render () {
  yo.update(document.querySelector('main'), steps[currentStep]())

  if (currentStep === 3 && imageURL) {
    var el = document.querySelector('.filled-picture')
    croppie = new Croppie(el, {
        viewport: {width: 256, height: 256},
        boundary: {width: 300, height: 300},
        showZoomer: true
    });
    croppie.bind({url: imageURL})
    //on button click
    // vanilla.result('blob').then(function(blob) {
        // do something with cropped blob
    // });
  }
}

var steps = {
  1: () => yo`
    <main class="step1">
      <div>
        <img src="beaker://assets/logo.png" />
        <h1>Welcome</h1>
        <p>Let${"'"}s create your personal website.</p>
        <p><a onclick=${advanceStep}>Get Started</a></p>
      </div>
    </main>
  `,
  2: () => yo`
    <main class="step2">
      <div>
        <h1>Profile</h1>
        <form>
          <p>
            <label for="name">Your name</label>
            <input id="name" name="name" type="text" placeholder="Alice Roberts" autofocus />
          </p>
          <p>
            <label for="bio">Your bio</label>
            <textarea id="bio" name="bio" placeholder="Optional"></textarea>
          </p>
        </form>
        <p>
          <a class="btn" onclick=${onSubmitStep2}>Save</a>
        </p>
      </div>
    </main>
  `,
  3: () => {
    if (imageURL) {
      return yo`
        <main class="step3">
          <div class="nocenter">
            <h1>Picture</h1>
            <div class="filled-picture"></div>
            <p>
              <a class="btn" onclick=${onStep3SelectFile}>Change File</a>
              <a class="btn" onclick=${onStep3Submit}>Save</a>
            </p>
            <p><a class="link" onclick=${advanceStep}>Skip <i class="fa fa-angle-right"></i></a></p>
          </div>
        </main>
      `
    }
    return yo`
      <main class="step3">
        <div>
          <h1>Picture</h1>
          <div class="empty-picture">
            <a class="btn" onclick=${onStep3SelectFile}>Select File</a>
          </div>
          <p><a class="link" onclick=${advanceStep}>Skip <i class="fa fa-angle-right"></i></a></p>
        </div>
      </main>
    `
  },
  4: () => yo`
    <main class="step4">
      <div>
        <h1>Ok!</h1>
        <p>Your personal website is now being hosted by Beaker<br />on the peer-to-peer network.</p>
        <div class="icon-btns">
          <a href="${profileDat.url}" target="_blank">
            <i class="fa fa-external-link"></i>
            <span>View site</span>
          </a>
          <a href="beaker://editor/${profileDat.url.slice('dat://'.length)}" target="_blank">
            <i class="fa fa-pencil-square-o"></i>
            <span>Edit site</span>
          </a>
          <a onclick=${onCopyLink}>
            <i class="fa fa-clipboard"></i>
            <span class="copy-link-text">Copy link</span>
          </a>
        </div>
        <p>
          <a class="btn" onclick=${advanceStep}>Next</a>
        </p>
      </div>
    </main>
  `,
  5: () => yo`
    <main class="step5">
      <div>
        <h1>First post</h1>
        <p>Sites in Beaker can be followed, just like a social media account.<br />Why not say hello to your fans?</p>
        <form>
          <p>
            <label for="post">Your post</label>
            <textarea id="post" name="post" placeholder="Hello, world!"></textarea>
          </p>
        </form>
        <p>
          <a class="btn" onclick=${onSubmitStep5}>Publish</a>
        </p>
        <p>
          <a class="link" onclick=${advanceStep}>Skip <i class="fa fa-angle-right"></i></a>
        </p>
      </div>
    </main>
  `,
  6: () => yo`
    <main class="step6">
      <div>
        <h1>Follow sites</h1>
        <p>Here are some sites you might want to follow!</p>
        <div class="suggested-follows">
          ${SUGGESTED_SITES.map(site => yo`
            <div>
              <img src=${site.img} />
              <h2>${site.name}</h2>
              <p>${site.description}</p>
              <a class="btn">Follow</a>
            </div>
          `)}
        </div>
        <p>
          <a class="btn" onclick=${advanceStep}>Next</a>
        </p>
      </div>
    </main>
  `,
  7: () => yo`
    <main class="step7">
      <div>
        <h1>Your URL</h1>
        <p>This is the URL for your profile. Share it with friends<br />so they can find your site.</p>
        <div class="your-url">
          <a class="link" href="${profileDat.url}" target="_blank">${profileDat.url}</a>
        </div>
        ${IS_HASHBASE_AVAILABLE ? yo`
          <p class="muted">
            You can get a personalized URL like <a class="link" href="dat://paul.hashbase.io" target="_blank">paul.hashbase.io</a><br />
            by joining a cloud host. <a class="link" href="https://hashbase.io" target="_blank">Learn more.</a>
          </p>
        ` : ''}
        <p>
          <a class="btn" onclick=${finish}>Finish</a>
        </p>
      </div>
    </main>
  `
}

// state management
// =

async function setup () {
  // read status
  var status = await beakerBrowser.getUserSetupStatus()
  if (status === 'finished') {
    // reload page, setup is done
    window.location.reload()
    return
  } else if (status && status.startsWith('step')) {
    currentStep = +(/^step([\d]+)$/.exec(status)[1])
  } else {
    currentStep = 1
  }

  // read profile dat
  try {
    profileDat = new DatProfileSite((await beaker.profiles.get(0)).url)
  } catch (e) {
    // ignore
    console.debug(e)
  }
  console.debug(profileDat)

  // ready
  render()
}

async function advanceStep () {
  currentStep++
  await beakerBrowser.setUserSetupStatus('step' + currentStep)
  render()
}

async function finish () {
  await beakerBrowser.setUserSetupStatus('finished')
  window.location.reload()
}

// handlers
// =

async function onSubmitStep2 () {
  // get form values
  var form = document.querySelector('form')
  var values = {
    name: form.name.value.trim(),
    description: form.bio.value.trim()
  }

  // create the dat
  profileDat = new DatProfileSite(await beaker.archives.create({
    title: values.name || 'Personal Website',
    description: values.name ? `Personal website of ${values.name}` : ''
  }))

  // update the profile
  await beaker.profiles.update(0, {url: profileDat.url})

  // write the profile.json
  await profileDat.setProfile(values)

  console.log(profileDat.url)
  advanceStep()
}

async function onStep3SelectFile () {
  // have user select file
  var paths = await beakerBrowser.showOpenDialog({
    title: 'Select your image',
    filters: [{name: 'Images', extensions: ['png', 'jpg', 'jpeg']}],
    properties: ['openFile']
  })
  if (!paths) {
    return
  }

  // import into the user profile
  var path = paths[0]
  imageName = path.split('/').pop()
  imageURL = `${profileDat.url}/${imageName}`
  await DatArchive.importFromFilesystem({
    srcPath: paths[0],
    dst: profileDat.url,
    inplaceImport: true
  })

  // render
  render()
}

async function onStep3Submit () {
  // write file
  var format = imageName.split('.').pop()
  if (format === 'jpg') {
    format = 'jpeg'
  }
  var imageBase64 = (await croppie.result({type: 'base64', format})).split(',')[1]
  profileDat.archive.writeFile(`/${imageName}`, imageBase64, 'base64')

  // update profile
  await profileDat.setProfile({image: `/${imageName}`})

  advanceStep()
}

function onCopyLink () {
  writeToClipboard(profileDat.url)
  document.querySelector('.copy-link-text').textContent = 'Copied!'
}

async function onSubmitStep5 () {
  // get form values
  var form = document.querySelector('form')
  var values = {text: form.post.value.trim()}
  if (!values.text) {
    return
  }

  // write post
  await profileDat.broadcast(values)
  advanceStep()
}