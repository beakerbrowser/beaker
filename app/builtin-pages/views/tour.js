import * as yo from 'yo-yo'
import {writeToClipboard} from '../../lib/fg/event-handlers'

const IS_HASHBASE_AVAILABLE = false

var steps = [
  {
    title: 'The peer-to-peer Web',
    sections: [
      {
        title: 'What is a peer-to-peer Web site?',
        description: () => yo`<div class="description">
          <p>Peer-to-peer sites are just like any other Web site. But instead of being served from a datacenter, files are hosted by peers on your network.</p>
          <p>This makes it easy for anybody to host a site!</p>
        </div>`,
        screenshot: 'tour-intro.png',
      },
      {
        title: 'Browsing the peer-to-peer network',
        description: () => yo`<div class="description"><p>You can see how many peers are hosting the site’s files. When you navigate to a site, you${"'"}ll automatically share the files you download for a short period.</p></div>`,
        screenshot: 'tour-site-peer-count.png',
      },
    ]
  },
  {
    title: 'Publishing with Beaker',
    sections: [
      {
        title: 'Creating a new Web site',
        description: () => yo`<div class="description"><p>With Beaker, you can publish your own peer-to-peer Web sites. Click the "New site" button in the dropdown menu.</p></div>`,
        screenshot: 'tour-new-site.png'

      },
      {
        title: 'Setting a title and description',
        description: () => yo`<div class="description"><p>Choose a title for your site. You can also set a longer description of what the site will contain.</p></div>`,
        screenshot: 'tour-set-site-info.png'
      },
      {
        title: 'Beaker’s library view',
        description: () => yo`<div class="description">
          <p>Beaker will open the library view, where you can modify the site.</p>
        </div>`,
        screenshot: 'tour-new-site-in-library.png'
      },
      {
        title: 'Adding and publishing files',
        description: () => yo`<div>
        <div class="screenshot-container">
          <img class="screenshot" src="beaker://assets/tour-new-site-publish1.png"/>
        </div>
        <div class="description">
          <p>Click "Open folder."<br /><br /></p>
        </div>
        <div class="screenshot-container">
          <img class="screenshot" src="beaker://assets/tour-new-site-publish2.png"/>
        </div>
        <div class="description">
          <p>Add the files you want to publish to that folder.</p>
        </div>
        <div class="screenshot-container">
          <img class="screenshot" src="beaker://assets/tour-new-site-publish3.png"/>
        </div>
        <div class="description">
          <p>Then click "Publish." Other users can now browse to the files in the site.</p>
        </div>`,
      },
      {
        title: 'Sharing your site',
        description: () => yo`<div class="description">
          <p>Share the URL with friends, and keep Beaker online, so that your friends can download the site.</p>
          <p>The URL for Dat  archives are unguessable, and your files can only be seen by people you share the URL with.</p>
        </div>`,
        screenshot: 'tour-share-site.png'
      }
    ]
  },
  {
    title: 'Managing your sites',
    sections: [
      {
        title: 'Beaker’s library',
        description: () => yo`<div class="description">
          <p>The library stores all the sites you have saved and created.</p>
        </div>`,
        screenshot: 'tour-library-view.png'
      },
      {
        title: 'The site staging area',
        description: () => yo`<div class="description">
          <p>Any time you add, delete, or change your site’s files, you can review your changes before you publish them.</p>
          <p>If you make a mistake, just revert your changes!</p>
        </div>`,
        screenshot: 'tour-staging-area.png'
      },
      {
        title: 'Unpublished changes',
        description: () => yo`<div class="description">
          <p>You can open the site prior to publishing and see the changes in progress. Until published, only you will see the changes.</p>
        </div>`
      }
    ]
  },
  {
    title: 'Saving sites you visit',
    sections: [
      {
        title: 'Saving a site to your Library',
        description: () => yo`<div class="description">
          <p>If you want to keep a site you visit, simply save it to your Library. This will store a read-only version of the site, which will automatically update as the owner makes changes.</p>
        </div>`,
        screenshot: 'tour-save-to-library.png'
      },
      {
        title: 'Forking a site',
        description: () => yo`<div class="description">
          <p>If you want to create an editable copy of a site you visit, you can "fork" the site. Forking creates a new, editable duplicate of the site in your library. You will own the new site, and have the ability to publish changes to it.</p>
          <p>Forked sites are given an entirely new URL, which you control.</p>
        </div>`,
        screenshot: 'tour-fork.png',
      }
    ]
  },
  {
    title: 'History and versions',
    sections: [
      {
        title: 'Viewing a site’s history',
        description: () => yo`<div class="description">
          <p>Every addition, deletion, and modification to your site is added to your site’s history log. You can review every change in the "History" section in your Library.</p>
        </div>`,
        screenshot: 'tour-site-history.png'
      },
      {
        title: 'Site versions',
        description: () => yo`<div class="description">
          <p>Each revision made to a site creates a new version of the site. You can view any version of a site by adding <code>+\${versionNumber}</code> to the end of the domain.</p>
        </div>`,
        screenshot: 'tour-site-versions.png'
      }
    ]
  },
  {
    title: 'Availability and reliability',
    sections: [
      {
        title: 'Public peers',
          description: () => yo`<div class="description"><p>Uptime is not guaranteed for sites transported with a peer-to-peer protocol like <a href="https://github.com/datproject/dat">Dat</a>. If no peers are actively hosting your files, then your site won’t be available to visitors.</p><p>You can use a public peer service which makes sure your files are always available.</p><p>The Beaker team runs an open-source, self-deployable public peer service called <a href="https://hashbase.io">Hashbase</a>. In addition to rehosting your files, <a href="https://hashbase.io">Hashbase</a> provides short URLs like <code>dat://mysite.hashbase.io</code>, plus HTTPs mirroring.</p></div>`,
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
      ${screenshot}
      <div class="info">
        ${currentSection.description()}
      </div>
      <div class="navigation">
        ${renderBackBtn()}
        ${renderNextBtn()}
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
  var isLastStep = (
    currentStepIdx === steps.length - 1 &&
    currentSectionIdx === steps[currentStepIdx].sections.length - 1
  )

  return yo`
    <a class="next btn primary thick" onclick=${onClickNext}>
      ${isLastStep ? 'End Tour' : 'Next'}
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

  if (currentStepIdx >= steps.length) {
    window.location = 'beaker://start'
  } else {
    render()
  }
}

async function createSite () {
  var archive = await DatArchive.create()
  window.location = 'beaker://library/' + archive.url.slice('dat://'.length)
}
