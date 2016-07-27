import * as yo from 'yo-yo'

// helper to add toggle behaviors
// give class .toggleable, .toggleon, or .toggleoff to trigger
// include data-toggle-on="event", where `event` sets what triggers toggle (default click)
export default function toggleable (el) {
  Array.from(el.querySelectorAll('.toggleable')).forEach(el2 => {
    el2.addEventListener(el2.dataset.toggleOn||'click', onToggle)
  })
  Array.from(el.querySelectorAll('.toggleon')).forEach(el2 => {
    el2.addEventListener(el2.dataset.toggleOn||'click', onToggleOn)
  })
  Array.from(el.querySelectorAll('.toggleoff')).forEach(el2 => {
    el2.addEventListener(el2.dataset.toggleOn||'click', onToggleOff)
  })
  function onToggle (e) {
    el.classList.toggle('open')
  }
  function onToggleOn (e) {
    el.classList.add('open')
  }
  function onToggleOff (e) {
    el.classList.remove('open')
  }
  return el
}

// NOTE
// look through the commit history for a much nicer version of this
// there was an edgecase in the old version that I couldnt make work
// so, here we are, with 'data-toggle-on' and shit
// -prf