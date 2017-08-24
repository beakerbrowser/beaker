import yo from 'yo-yo'

export default function imgWithFallbacks(baseSrc, exts, {cls} = {}) {
  var el = render()
  return el

  function render () {
    const nextExt = exts.shift()
    const url = `${baseSrc}.${nextExt}`
    return yo`
      <img class=${cls} src=${url} onerror=${onerror} />
    `
  }

  function onerror () {
    if (exts.length > 0) {
      yo.update(el, render())
    }
  }
}