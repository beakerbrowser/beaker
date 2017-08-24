import yo from 'yo-yo'

// to try /avatar.png, /avatar.jpg, /avatar.gif, in that order:
// imgWithFallbacks(`${f.url}/avatar`, ['png', 'jpg', 'gif'], {cls: 'avatar'})
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