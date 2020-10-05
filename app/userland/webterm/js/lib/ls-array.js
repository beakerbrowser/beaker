export class LSArray {
  #key = undefined
  
  constructor (key) {
    this.#key = key
  }

  _read () {
    try {
      return JSON.parse(localStorage.getItem(this.#key)) || []
    } catch {
      return []
    }
  }

  _save (v) {
    localStorage.setItem(this.#key, JSON.stringify(v))
  }

  get length () {
    return this._read().length
  }

  get (index) {
    let arr = this._read()
    return arr[index]
  }

  push (v) {
    let arr = this._read()
    arr.push(v)
    this._save(arr)
  }
}