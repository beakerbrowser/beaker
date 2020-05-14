/**
 * Helper to get environment variables, ignoring case
 * @param {string} name
 * @returns {string}
 */
export const getEnvVar = function (name) {
  var ucv = process.env[name.toUpperCase()]
  if (typeof ucv !== 'undefined') {
    return ucv
  }
  var lcv = process.env[name.toLowerCase()]
  if (typeof lcv !== 'undefined') {
    return lcv
  }
  return undefined
}
