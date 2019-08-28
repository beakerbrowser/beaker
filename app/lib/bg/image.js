/**
 * @description
 * Takes in a bitmap buffer (from NativeImage) and finds the dimensions
 * of the actual image content, effectively trimming all whitespace.
 *
 * @param {Buffer} buf
 * @param {Object} size
 * @param {number} size.width
 * @param {number} size.height
 * @returns {Object}
 */
export function findImageBounds (buf, {width, height}) {
  function pixelHasValue (x, y) {
    let i = (x + y * width) << 2
    return (buf[i + 3] > 0 && (buf[i + 0] < 240 || buf[i + 1] < 240 || buf[i + 2] < 240))
  }
  var bounds = {left: width, top: height, right: 0, bottom: 0}

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (pixelHasValue(x, y)) {
        bounds.left = Math.min(bounds.left, x)
        bounds.top = Math.min(bounds.top, y)
        bounds.right = Math.max(bounds.right, x)
        bounds.bottom = Math.max(bounds.bottom, y)
      }
    }
  }

  Object.defineProperty(bounds, 'x', {get: () => bounds.left})
  Object.defineProperty(bounds, 'y', {get: () => bounds.top})
  Object.defineProperty(bounds, 'width', {get: () => bounds.right - bounds.left})
  Object.defineProperty(bounds, 'height', {get: () => bounds.bottom - bounds.top})
  return bounds
}
