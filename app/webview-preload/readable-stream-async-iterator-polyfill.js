/* globals ReadableStream */

// Thanks to Simon Buchanon, https://jakearchibald.com/2017/async-iterators-and-generators/#comment-3673528560
export default function () {
  if (!ReadableStream.prototype[Symbol.asyncIterator]) {
    ReadableStream.prototype[Symbol.asyncIterator] = function ReadableStream_asyncIterator () {
      const reader = this.getReader()
      return {
        next () { return reader.read() },
        return () { return reader.releaseLock() }
      }
    }
  }
}