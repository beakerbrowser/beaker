// convert and resize an image url to a data url
export function urlToData (url, width, height, cb) {
  var img = new Image()
  img.onload = e => cb(null, imgToData(img, width, height))
  img.onerror = cb
  img.src = url
}

// convert and resize an <img> to a data url
export function imgToData (img, width, height) {
  var ratio = img.width / img.height
  if (width / height > ratio)
    height = width / ratio
  else
    width = height * ratio
  
  var canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  var ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}
