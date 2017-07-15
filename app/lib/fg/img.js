/* globals Image */

import ColorThief from './color-thief'

const colorThief = new ColorThief()

// convert and resize an image url to a data url
export function urlToData (url, width, height, cb) {
  var img = new Image()
  img.onload = e => cb(null, {
    url: imgToData(img, width, height),
    dominantColor: colorThief.getColor(img, 10)
  })
  img.onerror = cb
  img.src = url
}

// like urlToData, but loads all images and takes the one that fits the target dimensions best
export async function urlsToData (urls, width, height) {
  // load all images
  var imgs = await Promise.all(urls.map(url => {
    return new Promise(resolve => {
      var img = new Image()
      img.onload = e => resolve(img)
      img.onerror = () => resolve(false)
      img.src = url
    })
  }))

  // filter out failures and abort if none loaded
  imgs = imgs.filter(Boolean)
  if (!imgs.length) {
    return false
  }

  // choose the image with the closest dimensions to our target
  var bestImg = imgs[0]
  var bestDist = dist(imgs[0].width, imgs[0].height, width, height)
  for (var i = 1; i < imgs.length; i++) {
    let imgDist = dist(imgs[i].width, imgs[i].height, width, height)
    if (imgDist < bestDist) {
      bestImg = imgs[i]
      bestDist = imgDist
    }
  }
  return {
    url: bestImg.src,
    dataUrl: imgToData(bestImg, width, height)
  }
}

// convert and resize an <img> to a data url
export function imgToData (img, width, height) {
  var ratio = img.width / img.height
  if (width / height > ratio) { height = width / ratio } else { width = height * ratio }

  var canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  var ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

function dist (x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}
