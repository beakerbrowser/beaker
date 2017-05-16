import * as yo from 'yo-yo'
import {writeToClipboard} from '../../lib/fg/event-handlers'

const IS_HASHBASE_AVAILABLE = false

var steps = [
  {
    title: 'The peer-to-peer Web',
    sections: [
      {
        title: 'What is a peer-to-peer Web site?',
        description: yo`<div class="description"><p>Peer-to-peer Web sites are just like any other Web site -- a collection of files.</p><p>But in Beaker, peer-to-peer sites are transported with Dat, a new protocol for efficiently sharing, syncing, and verifying files across a network.</p></div>`,
        screenshot: 'setup-site-files.png',
      },
      {
        title: 'Browsing the peer-to-peer Web',
        description: yo`<div class="description"><p>With Beaker, you can browse peer-to-peer sites like any other Web site. But instead of being served from a datacenter, files are hosted by peers on your network.</p></div>`,
        screenshot: 'setup-view-site.png',
      },
      {
        title: 'Viewing network activity',
        description: yo`<div class="description"><p>You can even see how many peers are hosting the site’s files at any given moment!</p></div>`,
        screenshot: 'setup-site-peer-count.png',
      },
    ]
  },
  {
    title: 'Rehosting files',
    sections: [
      {
        title: 'Saving sites to your Library',
        description: yo`<div class="description"><p>If you want to help host a site, simply save it to your Library.</p></div>`,
        screenshot: 'setup-save-to-library.png'
      },
      {
        title: 'TODO',
        description: yo`<div class="description"><p>The site’s files will be saved to your computer, and visitors to the site can fetch its files from your device when you’re online.</p></div>`,
        screenshot: 'setup-library-view.png'
      },
      {
        title: 'Removing a site from your Library',
        description: yo`<div class="description"><p>If you don’t want to help rehost the site’s files, simply remove it from your Library.</p></div>`,
        screenshot: 'setup-remove-from-library.png'
      }
    ]
  },
  {
    title: 'Publishing with Beaker',
    sections: [
      {
        title: 'Creating a peer-to-peer Web site',
        description: yo`<div class="description"><p>With Beaker, you can publish your own peer-to-peer Web sites. Simply choose a directory on your computer, and Beaker will set up a Dat archive.</p></div>`,
        screenshot: 'setup-new-site.png'

      },
      {
        title: 'Choosing your site’s files',
        description: yo`<div class="description"><p>modal</p></div>`,
        screenshot: 'setup-new-site-modal.png'
      },
      {
        title: 'Publishing your site',
        description: yo`<div class="description"><p>Review your files, and when you’re ready, publish your site on the network!</p></div>`,
        screenshot: 'setup-new-site-publish.png'
      },
      {
        title: 'Beaker’s staging area',
        description: yo`<div class="description"><p>Any time you add, delete, or change your site’s files, you can review your changes before you publish them.</p><p>If you make a mistake, just revert your changes!</p></div>`,
        screenshot: 'setup-new-site-publish-changes.png'
      },
      {
        title: 'TODO',
        description: yo`<div class="description"><p>versions</p></div>`,
        screenshot: ''
      },
      {
        title: 'Sharing your site',
        description: yo`<div class="description"><p>The URL for Dat  archives are unguessable, so your files can only be seen by people you share the URL with.</p></div>`,
        screenshot: 'setup-share-site.png'
      }
    ]
  },
  {
    title: 'Forking a site',
    sections: [
      {
        title: 'How to fork a site',
        description: yo`<div class="description"><p>You can also fork other peoples’ sites! Forking saves an editable copy of the site to your library.</p></div>`,
        screenshot: 'setup-fork.png',
      },
      {
        title: 'todo',
        description: yo`<div class="description"><p>fork modal</p></div>`,
        screenshot: 'setup-fork-modal.png'
      }
    ]
  },
  {
    title: 'Availability and reliability',
    sections: [
      {
        title: 'todo',
        description: yo`<div class="description"><p>availability</p></div>`,
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
          return yo`
            <li onclick=${e => {e.stopPropagation(); onSwitchSection(stepIdx, idx)}}>
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

  return yo`
    <div class="step">
      <h2 class="title">${currentSection.title}</h2>
      <div class="info">
        <div class="description">
          ${currentSection.description}
        </div>
        <div class="navigation">
          ${renderBackBtn()}
          ${renderNextBtn()}
        </div>
      </div>
      <div class="screenshot-container">
        <img class="screenshot" src="beaker://assets/${currentSection.screenshot}"/>
      </div>
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
