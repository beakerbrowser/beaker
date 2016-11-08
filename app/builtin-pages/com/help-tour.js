import Shepherd from '../../lib/fg/shepherd'

// hey hey hey, what you got there sugar?
const $ = sel => document.querySelector(sel)
const $$ = sel => Array.from(document.querySelectorAll(sel))

export function startViewDatTour (isOwner, rerender, isFirst) {
  let tour = new Shepherd.Tour({
    defaults: {
      classes: 'shepherd-theme-arrows',
      advanceOn: '.docs-link click',
      showCancelLink: false
    }
  })

  tour.addStep('welcome', {
    title: 'Welcome!',
    text: 'Here\'s a quick tour to help you get started.',
    showCancelLink: true,
    buttons: [
      { text: 'Cancel', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  })

  if (isOwner) {
    tour.addStep('owner', {
      text: 'You own this archive! That means you can make changes.',
      attachTo: '#owner-label left'
    })
  } else {
    tour.addStep('owner', {
      text: 'You don\'t own this archive. That means it\'s read-only.',
      attachTo: '#owner-label left'
    })
  }

  tour.addStep('fork', {
    text: 'Press "Fork" to create a new copy of the archive.',
    attachTo: '#fork-btn bottom'
  })

  tour.addStep('share', {
    text: 'Press "Host" to serve the archive over the network.',
    attachTo: '#host-btn bottom'
  })

  tour.addStep('copy-link', {
    text: 'Archive URLs are secret!<br>Only people who have the URL can access the files.',
    attachTo: '#host-btn bottom'
  })

  if (isOwner) {
    tour.addStep('upload-files', {
      text: 'Add files by clicking here.',
      attachTo: '.archive-add-files a bottom'
    })

    tour.addStep('edit-details', {
      text: 'Change the title and description by clicking here.',
      attachTo: '#edit-dat-btn bottom'
    })
  }

  tour.addStep('end', {
    title: 'That\'s it!',
    text: 'Check out the <a href="https://beakerbrowser.com/docs/" target="_blank">Documentation</a> if you need more help.',
    buttons: [{
      text: 'End Tour',
      action: tour.next
    }],
    when: { 'before-show': () => rerender() }
  })


  var cover = document.createElement('div')
  cover.classList.add('modal-wrapper')
  cover.classList.add('modal-wrapper-light')
  document.body.appendChild(cover)
  tour.on('complete', () => document.body.removeChild(cover))
  tour.on('cancel', () => document.body.removeChild(cover))

  tour.start()
}
