import * as yo from 'yo-yo'
import {writeToClipboard} from '../../lib/fg/event-handlers'

const IS_HASHBASE_AVAILABLE = false

var steps = [
  {
    title: 'The peer-to-peer Web',
    sections: [
      {
        title: 'What is a peer-to-peer Web site?',
        description: () => yo`<div class="description"><p>Peer-to-peer Web sites are just like any other Web site -- a collection of files.</p><p>But in Beaker, peer-to-peer sites are transported with <a href="https://github.com/datproject/dat/">Dat</a>, a new protocol for efficiently sharing, syncing, and verifying files across a network.</p></div>`,
        screenshot: 'tour-intro.png',
      },
      {
        title: 'Browsing the peer-to-peer Web',
        description: () => yo`<div class="description"><p>With Beaker, you can browse peer-to-peer sites like any other Web site. But instead of being served from a datacenter, files are hosted by peers on your network.</p></div>`,
        screenshot: 'tour-view-site.png',
      },
      {
        title: 'Viewing network activity',
        description: () => yo`<div class="description"><p>You can even see how many peers are hosting the site’s files at any given moment!</p></div>`,
        screenshot: 'tour-site-peer-count.png',
      },
    ]
  },
  {
    title: 'Rehosting files',
    sections: [
      {
        title: 'Saving sites to your Library',
        description: () => yo`<div class="description"><p>If you want to help host a site, simply save it to your Library.</p></div>`,
        screenshot: 'tour-save-to-library.png'
      },
      {
        title: 'Saving site files to your computer',
        description: () => yo`<div class="description"><p>If you save a site to your Library, its files will be saved to your computer, and visitors to the site can fetch its files from your device when you’re online.</p></div>`,
        screenshot: 'tour-site-files.png'
      },
      {
        title: 'Removing a site from your Library',
        description: () => yo`<div class="description"><p>If you don’t want to help rehost the site’s files, simply remove it from your Library.</p></div>`,
        screenshot: 'tour-remove-from-library.png'
      }
    ]
  },
  {
    title: 'Publishing with Beaker',
    sections: [
      {
        title: 'Creating a peer-to-peer Web site',
        description: () => yo`<div class="description"><p>With Beaker, you can publish your own peer-to-peer Web sites. Click the "New site" button in the dropdown menu.</p></div>`,
        screenshot: 'tour-new-site.png'

      },
      {
        title: 'Choosing your site’s files',
        description: () => yo`<div class="description"><p>Choose a directory on your computer that will house your site, and Beaker will initialize a Dat archive inside that directory.</p></div>`,
        screenshot: 'tour-new-site-modal.png'
      },
      {
        title: 'Publishing your site',
        description: () => yo`<div class="description"><p>Review your files, and when you’re ready, publish your site on the network!</p></div>`,
        screenshot: 'tour-new-site-publish.png'
      },
      {
        title: 'Beaker’s staging area',
        description: () => yo`<div class="description"><p>Any time you add, delete, or change your site’s files, you can review your changes before you publish them.</p><p>If you make a mistake, just revert your changes!</p></div>`,
        screenshot: 'tour-new-site-publish-changes.png'
      },
      {
        title: 'Sharing your site',
        description: () => yo`<div class="description"><p>The URL for Dat  archives are unguessable, so your files can only be seen by people you share the URL with.</p></div>`,
        screenshot: 'tour-share-site.png'
      }
    ]
  },
  {
    title: 'History and versions',
    sections: [
      {
        title: 'Viewing a site’s history',
        description: () => yo`<div class="description"><p>Every addition, deletion, and modification to your site is added to your site’s history log. You can review every change in the "History" section in your Library.</p></div>`,
        screenshot: 'tour-site-history.png'
      },
      {
        title: 'Site versions',
        description: () => yo`<div class="description"><p>Each revision made to a site creates a new version of the site. You can view any version of a site by adding <code>+\${versionNumber}</code> to the end of the URL.</p></div>`,
        screenshot: 'tour-site-versions.png'
      }
    ]
  },
  {
    title: 'Forking a site',
    sections: [
      {
        title: 'How to fork a site',
        description: () => yo`<div class="description"><p>You can also fork other peoples’ sites! Forking saves an editable copy of the site to your library.</p></div>`,
        screenshot: 'tour-fork.png',
      },
      {
        title: 'Choose a location for your forked site',
        description: () => yo`<div class="description"><p>Choose a destination directory, and Beaker will make a new directory within it to hold your copy of the site’s files.</p></div>`,
        screenshot: 'tour-fork-modal.png'
      }
    ]
  },
  {
    title: 'Availability and reliability',
    sections: [
      {
        title: 'Cloud hosting',
          description: () => yo`<div class="description"><p>Availability is not guaranteed for sites transported with a peer-to-peer protocol like <a href="https://github.com/datproject/dat">Dat</a>. If no peers are actively hosting your files, then your site won’t be available to visitors.</p><p>You can use a cloud host which acts like a "super peer" and makes sure your files are always available.</p><p>In addition to rehosting your files, services like <a href="https://hashbase.io">Hashbase</a> provide unique short names, like <code>dat://mysite.hashbase.io</code> and HTTP mirroring.</p><p>Get started: <ul><li onclick=${createSite}><a>Create a site</a></li><li><a href="beaker://start">Go to the start page</a></li></ul></p></div>`,
        screenshot: '',
      }
    ]
  }
]

var currentStepIdx = 0
var currentSectionIdx = 0
render()

// rendering
// =

function render () {
  yo.update(
    document.querySelector('main'),
    yo`
      <main>
        <div class="links">
          <ol>${steps.map(renderStepLink)}</ol>
        </div>
        ${renderStep(steps[currentStepIdx])}
      </main>
    `
  )
}

function renderStepLink (step) {
  var stepIdx = steps.indexOf(step)
  var step = steps[stepIdx]
  var cls = currentStepIdx === stepIdx ? 'active' : ''

  return yo`
    <li onclick=${e => onSwitchSection(stepIdx, 0)} class="step-link ${cls}">
      <span class="title">${step.title}</span>
      <ul class="subnav">
        ${step.sections.map((section, idx) => {
          var isActive = currentStepIdx === stepIdx && currentSectionIdx === idx
          return yo`
            <li
              class=${isActive ? 'active' : ''}
              onclick=${e => {e.stopPropagation(); onSwitchSection(stepIdx, idx)}}
            >
              ${isActive ? yo`<i class="fa fa-caret-right"/>` : ''}
              ${section.title}
            </li>
          `
        })}
      </ul>
    </li>
  `
}

function renderStep (step) {
  var currentSection = step.sections[currentSectionIdx]

  var screenshot
  if (currentSection.screenshot) {
    screenshot = yo`
      <div class="screenshot-container">
        <img class="screenshot" src="beaker://assets/${currentSection.screenshot}"/>
      </div>
    `
  }

  return yo`
    <div class="step">
      <h2 class="title">${currentSection.title}</h2>
      <div class="info">
        <div class="description">
          ${currentSection.description()}
        </div>
        <div class="navigation">
          ${renderBackBtn()}
          ${renderNextBtn()}
        </div>
      </div>
      ${screenshot}
    </div>
  `
}

function renderBackBtn () {
  // is very first step
  if (currentSectionIdx === 0 && currentStepIdx === 0) return ''

  return yo`
    <a class="back" onclick=${onClickBack}>
      <i class="fa fa-angle-double-left"></i>
      Previous
    </a>
  `
}

function renderNextBtn () {
  // is very last step
  if (currentStepIdx === steps.length - 1 && currentSectionIdx === steps[currentStepIdx].sections.length - 1) return ''

  return yo`
    <a class="next" onclick=${onClickNext}>
      Next
      <i class="fa fa-angle-double-right"></i>
    </a>
  `
}


// event handlers

function onSwitchSection (newStep, newStepSection) {
  currentSectionIdx = newStepSection
  currentStepIdx = newStep
  render()
}

function onClickBack () {
  if (currentSectionIdx === 0) {
    currentStepIdx = currentStepIdx - 1
    currentSectionIdx = steps[currentStepIdx].sections.length - 1
  } else {
    currentSectionIdx = currentSectionIdx - 1
  }
  render()
}

function onClickNext () {
  var lastStepSection = steps[currentStepIdx].sections.length - 1

  if (currentSectionIdx === lastStepSection) {
    currentStepIdx = currentStepIdx + 1
    currentSectionIdx = 0
  } else {
    currentSectionIdx = currentSectionIdx + 1
  }
  render()
}

async function createSite () {
  var archive = await DatArchive.create()
  window.location = 'beaker://library/' + archive.url.slice('dat://'.length)
}
