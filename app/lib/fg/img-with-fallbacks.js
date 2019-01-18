import yo from 'yo-yo'

// to try /avatar.png, /avatar.jpg, /avatar.gif, in that order:
// imgWithFallbacks([`${f.url}/avatar.png`, `${f.url}/avatar.jpg`, `${f.url}/avatar.gif`], {cls: 'avatar'})
export function imgWithFallbacks (urls, {cls} = {}) {
  const url = urls.shift()
  return yo`
    <img class=${cls || ''} src=${url} onerror=${(e) => onerror(e, urls, cls)} />
  `
}

function onerror (e, urls, cls) {
  if (urls.length > 0) {
    yo.update(e.target, imgWithFallbacks(urls, cls))
  }
}
