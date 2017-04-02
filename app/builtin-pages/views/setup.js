import * as yo from 'yo-yo'
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

  if (currentStep === 4 && imageURL) {
    var el = document.querySelector('.filled-picture')
    croppie = new Croppie(el, {
        viewport: {width: 256, height: 256},
        boundary: {width: 300, height: 300},
        showZoomer: true
    });
    croppie.bind({url: imageURL})
  }
}

var activeHowtoIdx = 0
var howtos = [
  { title: 'The Beaker editor',
    img: '',
    steps: [
      'step 1',
      'step 2',
      'step 3'
    ]
  },
  { title: 'Sharing files',
    img: '',
    steps: [
      'test' 
    ]
  },
  { title: 'Forking a site',
    img: '',
    steps: [
      'test2' 
    ]
  },
  { title: 'Sharing a note',
    img: '',
    steps: []
  }
]

var steps = {
  1: () => yo`
    <main class="welcome">
      <div>
        <img src="beaker://assets/logo.png" />
        <h1>Welcome</h1>
        <p>Let${"'"}s create your personal website.</p>
        <p><a onclick=${advanceStep}>Get Started</a></p>
      </div>
    </main>
  `,
  2: () => yo`
    <main class="overview">
      <div>
        <p class="intro">
          Beaker is a browser for the peer-to-peer Web.
        </p>

        <div class="screenshots">
          <a class="screenshot">
            <h2>Share files</h2>
            <img src="beaker://assets/share-files.png" onclick=${setActiveScreenshot}/>
            <p class="description">
              Share files on the Dat peer-to-peer network. Just choose your files then share the link!
            </p>
          </a>
          <a class="screenshot active"> 
            <h2>Host your website</h2>
            <img src="beaker://assets/website.png" onclick=${setActiveScreenshot} />
            <p class="description">
              Host your website with the <a href="https://datproject.org">Dat protocol</a>. Peers on the network host your site${"'"}s files, so publishing your site is totally free.
            </p>
          </a>
          <a class="screenshot">
            <h2>Rehost sites you like</h2>
            <img src="beaker://assets/network.png" onclick=${setActiveScreenshot} />
            <p class="description">
              Keep track of how many peers are hosting your files, and which sites you${"'"}re hosting on the network.
            </p>
          </a>
        </div>

        <p>
          <button class="btn next" onclick=${advanceStep}>Next</button>
        </p>

      </div>
    </main>
  `,
  3: () => yo`
    <main class="create-profile">
      <div>
        <h1>Create your profile site</h1>
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
          <button class="btn next" onclick=${onSubmitStep2}>Next</button>
        </p>
      </div>
    </main>
  `,
  4: () => {
    if (imageURL) {
      return yo`
        <main class="upload-avatar">
          <div class="nocenter">
            <h1>Crop and adjust your photo</h1>
            <div class="filled-picture"></div>
            <p>
              <a class="btn" onclick=${onStep3SelectFile}>Change File</a>
              <a class="btn next" onclick=${onStep3Submit}>Next</a>
            </p>
            <p><a class="link" onclick=${advanceStep}>Skip <i class="fa fa-angle-right"></i></a></p>
          </div>
        </main>
      `
    }
    return yo`
      <main class="upload-avatar">
        <div>
          <h1>Set your profile picture</h1>
          <p class="intro">
            Add a photo to your profile site.
          </p>
          <div class="empty-picture">
            <a class="btn" onclick=${onStep3SelectFile}>Select File</a>
          </div>
          <p><a class="link" onclick=${advanceStep}>Skip <i class="fa fa-angle-right"></i></a></p>
        </div>
      </main>
    `
  },
  5: () => yo`
    <main class="call-to-action">
      <div>
        <h1>Success!</h1>
        <p class="intro">
          Your profile site is now being hosted by Beaker on the peer-to-peer network.
        </p>

        <a class="dat-url" href=${profileDat.url} target="_blank">${profileDat.url}</a>

        <p>
          <a class="btn next" onclick=${advanceStep}>Get started</a>
        </p>
      </div>
    </main>
  `,
  6: () => yo`
    <main class="howto">
      <div>
        <ul class="links">
          ${howtos.map((howto, idx) => yo`<li data-idx=${idx} onclick=${setActiveHowto}>${howto.title}</li>`)}
        </ul>
        <div class="howtos">
          ${howtos.map((howto, idx) => renderHowto(howto, idx))}
        </div>
      </div>
    </main>
  `,
  7: () => yo`
    <main class="finish">
      <div>
        <h1>Your URL</h1>
        <p>This is the URL for your profile. Share it with friends<br />so they can find your site.</p>
        <div class="your-url">
          <a class="link" href="${profileDat.url}" target="_blank">${profileDat.url}</a>
        </div>
        ${IS_HASHBASE_AVAILABLE ? yo`
          <p>
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
    profileDat = new DatArchive((await beaker.profiles.get(0)).url)
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
  profileDat = await beaker.archives.create({
    title: values.name || 'Personal Website',
    description: values.description || ''
  })

  // update the profile
  await beaker.profiles.update(0, {url: profileDat.url})

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
  profileDat.writeFile(`/${imageName}`, imageBase64, 'base64')

  advanceStep()
}

function onCopyLink () {
  writeToClipboard(profileDat.url)
  document.querySelector('.copy-link-text').textContent = 'Copied!'
}

function setActiveScreenshot (e) {
  var screenshots = document.querySelectorAll('.overview .screenshot')
  screenshots.forEach(s => s.classList.remove('active'))

  e.target.parentNode.classList.add('active')
}

function renderHowto (howto, idx) {
  var isActive = activeHowtoIdx == idx ? 'active': ''

  return yo`
    <div class="howto ${isActive}">
      <img src=${howto.img}/>
      <h3>${howto.title}</h3>
      <ol class="steps">
        ${howto.steps.map(step => yo`<li>${step}</li>`)}
      </ol>
    </div>
  `
}

function setActiveHowto (e) {
  activeHowtoIdx = e.target.dataset.idx
  render()
}
