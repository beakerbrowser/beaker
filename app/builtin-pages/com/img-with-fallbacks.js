import yo from 'yo-yo'

// to try /avatar.png, /avatar.jpg, /avatar.gif, in that order:
// imgWithFallbacks(`${f.url}/avatar`, ['png', 'jpg', 'gif'], {cls: 'avatar'})
export default function imgWithFallbacks (baseSrc, exts, {cls} = {}) {
  var el = render(baseSrc, exts, cls)
  return el
}

function render (baseSrc, exts, cls) {
  const nextExt = exts.shift()
  const url = `${baseSrc}.${nextExt}`
  return yo`
    <img class=${cls} src=${url} onerror=${(e) => onerror(e, baseSrc, exts, cls)} />
  `
}

function onerror (e, baseSrc, exts, cls) {
  if (exts.length > 0) {
    yo.update(e.target, render(baseSrc, exts, cls))
  }
}
