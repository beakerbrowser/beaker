import Shepherd from '../../lib/fg/shepherd'

export function startViewDatTour (isOwner) {
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
    showCancelLink: true
  })

  if (isOwner) {
    tour.addStep('owner', {
      text: 'You own this archive! That means you can make changes.',
      attachTo: '#owner-label bottom'
    })

    tour.addStep('upload-files', {
      text: 'Add files by clicking here.',
      attachTo: '#add-files-btn bottom'
    })

    tour.addStep('edit-details', {
      text: 'You can change the title and description here.',
      attachTo: '#edit-dat-btn bottom'
    })

    tour.addStep('edit-details2', {
      text: 'You can also change the title here.',
      attachTo: '#owner-label bottom'
    })
  } else {
    tour.addStep('owner', {
      text: 'You don\'t own this archive. That means it\'s read-only.',
      attachTo: '#owner-label bottom'
    })
  }

  tour.addStep('share', {
    text: 'Press "Share" to host the archive for other people.',
    attachTo: '#share-btn bottom'
  })

  tour.addStep('unshare', {
    text: 'Press the button again to stop sharing.',
    attachTo: '#share-btn bottom'
  })

  tour.addStep('pin', {
    text: 'Pin an archive to keep it.',
    attachTo: '.save-btn bottom'
  })

  tour.addStep('unpin', {
    text: 'Unpin to let it be deleted.',
    attachTo: '.save-btn bottom'
  })

  tour.addStep('copy-link', {
    text: 'Press "Copy Link" to get the URL.',
    attachTo: '#copy-link-btn bottom'
  })

  tour.addStep('copy-link2', {
    text: 'Archive URLs are secret!<br>Only people who have the URL can access the archive.',
    attachTo: '#copy-link-btn bottom'
  })

  tour.addStep('copy-link2', {
    text: 'You can export the downloaded files in a Zip.',
    attachTo: '#export-zip-btn bottom'
  })

  tour.addStep('end', {
    title: 'That\'s it!',
    text: 'Check out the <a href="https://beakerbrowser.com/docs/" target="_blank">Documentation</a> if you need more help.',
    buttons: [{
      text: 'End Tour',
      action: tour.next
    }]
  })

  var wasSharing = false
  tour.on('show', e => {
    if (e.step.id == 'unshare') {
      // fake the sharing state
      var shareBtn = document.querySelector('#share-btn')
      wasSharing = shareBtn.classList.contains('glowing')
      if (!wasSharing) {
        shareBtn.classList.add('btn-primary')
        shareBtn.classList.add('glowing')
        shareBtn.innerHTML = '<span class="icon icon-share"></span> Sharing'
      }
    }
    if (e.step.id == 'pin' && !wasSharing) {
      // unfake the sharing state
      var shareBtn = document.querySelector('#share-btn')
      shareBtn.classList.remove('btn-primary')
      shareBtn.classList.remove('glowing')
      shareBtn.innerHTML = '<span class="icon icon-share"></span> Share'
    }
  })

  var cover = document.createElement('div')
  cover.classList.add('modal-wrapper')
  cover.classList.add('modal-wrapper-light')
  document.body.appendChild(cover)
  tour.on('complete', () => document.body.removeChild(cover))
  tour.on('cancel', () => document.body.removeChild(cover))

  tour.start()
}
