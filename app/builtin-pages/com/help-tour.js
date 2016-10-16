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

  if (isFirst) {
    if (isOwner) {
      tour.addStep('welcome', {
        title: 'Owned Archives',
        text: 'Welcome to your first archive. Here\'s a quick tour to help you get started.',
        showCancelLink: true,
        buttons: [
          { text: 'Cancel', action: tour.cancel },
          { text: 'Next', action: tour.next }
        ]
      })
    } else {
      tour.addStep('welcome', {
        title: 'Read-only Archives',
        text: 'This is your first read-only archive. Here\'s a quick tour to help you get started.',
        showCancelLink: true,
        buttons: [
          { text: 'Cancel', action: tour.cancel },
          { text: 'Next', action: tour.next }
        ]
      })
    }

  } else {
    tour.addStep('welcome', {
      title: 'Welcome!',
      text: 'Here\'s a quick tour to help you get started.',
      showCancelLink: true,
      buttons: [
        { text: 'Cancel', action: tour.cancel },
        { text: 'Next', action: tour.next }
      ]
    })
  }

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

    tour.addStep('share', {
      text: 'Press "Share" to host the archive for other people.',
      attachTo: '#sync-btn left',
      when: {
        'before-show': () => {
          var btn = $('#sync-btn')
          btn.className = 'btn'
          btn.innerHTML = `<span class="icon icon-share"></span> Share`
        }
      }
    })

    tour.addStep('unshare', {
      text: 'Press the button again to stop sharing.',
      attachTo: '#sync-btn left',
      when: {
        'before-show': () => {
          var btn = $('#sync-btn')
          btn.className = 'btn btn-primary glowing'
          btn.innerHTML = `<span class="icon icon-share"></span> Sharing`
        }
      }
    })
  } else {
    tour.addStep('owner', {
      text: 'You don\'t own this archive. That means it\'s read-only.',
      attachTo: '#owner-label bottom'
    })

    tour.addStep('download', {
      text: 'Press this button to download the entire archive.',
      attachTo: '#sync-btn left',
      when: {
        'before-show': () => {
          var btn = $('#sync-btn')
          btn.className = 'btn'
          btn.innerHTML = `<span class="icon icon-down-circled"></span> Download`
        }
      }
    })

    tour.addStep('sync', {
      text: 'Beaker will continue to sync new changes.',
      attachTo: '#sync-btn left',
      when: {
        'before-show': () => {
          var btn = $('#sync-btn')
          btn.className = 'btn btn-primary glowing'
          btn.innerHTML = `<span class="icon icon-down-circled"></span> Syncing`
        }
      }
    })

    tour.addStep('undownload', {
      text: 'Press the button again to stop syncing.',
      attachTo: '#sync-btn left'
    })
  }

  tour.addStep('copy-link', {
    text: 'Press "Copy Link" to get the URL.',
    attachTo: '#copy-link-btn bottom',
    when: { 'before-show': () => rerender() }
  })

  tour.addStep('copy-link2', {
    text: 'Archive URLs are secret!<br>Only people who have the URL can access the archive.',
    attachTo: '#copy-link-btn bottom'
  })

  tour.addStep('open-in-finder', {
    text: 'Click here to view the files in your folder browser.',
    attachTo: '#open-in-finder-btn right',
    when: {
      'before-show': () => {
        $('.dropdown-btn-container').classList.add('open')
      }
    }
  })

  tour.addStep('delete', {
    text: 'Delete an archive when you\'re done with it.',
    attachTo: '#delete-btn right',
    when: {
      'before-show': () => {
        $('.dropdown-btn-container').classList.add('open')
      }
    }
  })

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
