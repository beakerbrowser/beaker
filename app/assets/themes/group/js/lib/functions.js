/**
 * Helper to make node-style CBs into promises
 * @example
 * cbPromise(cb => myNodeStyleMethod(cb)).then(...)
 * @param {function(Function): any} method
 * @returns {Promise<any>}
 */
export function cbPromise (method) {
  return new Promise((resolve, reject) => {
    method((err, value) => {
      if (err) reject(err)
      else resolve(value)
    })
  })
}

/**
 * Helper to run an async operation against an array in chunks
 * @example
 * var res = await chunkAsync(values, 3, v => fetchAsync(v)) // chunks of 3s
 * @param {any[]} arr 
 * @param {Number} chunkSize 
 * @param {(value: any, index: number, array: any[]) => Promise<any>} cb 
 * @returns {Promise<any[]>}
 */
export async function chunkMapAsync (arr, chunkSize, cb) {
  const resultChunks = []
  for (let chunk of chunkArray(arr, chunkSize)) {
    resultChunks.push(await Promise.all(chunk.map(cb)))
  }
  return resultChunks.flat()

}

/**
 * Helper to split an array into chunks
 * @param {any[]} arr 
 * @param {Number} chunkSize 
 * @returns {Array<any[]>}
 */
export function chunkArray (arr, chunkSize) {
  const result = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize))
  }
  return result
}

/**
 * Async function which resolves after the given ms
 * @param {Number} ms 
 */
export async function wait (ms = 1) {
  return new Promise(resolve => setTimeout(resolve, ms))
}