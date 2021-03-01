class SlidingReceiveWindow {
  constructor(maxSize) {
    this.window = new Array(maxSize)
    this.windowStart = 0
    this.windowEnd = maxSize
    this.newest = 0
  }

  set(entryIndex, data) {
    if (entryIndex < this.windowStart || entryIndex > this.windowEnd) return
    this.newest = Math.max(this.newest, entryIndex)
    const offset = entryIndex - this.windowStart
    this.window[offset] = data
  }

  get(entryIndex) {
    if (entryIndex < this.windowStart || entryIndex > this.windowEnd) return
    const offset = entryIndex - this.windowStart
    return this.window[offset]
  }

  read() {
    // console.log('Window', this.window)
    const missing = []
    const have = []
    for (let i = this.windowStart; i < (this.newest + 1); i++) {
      const pak = this.get(i)
      if (pak == undefined) { // Missing
        missing.push(i)
      } else if (pak !== true) { // Make sure we didn't read yet
        have.push(pak)
        this.set(i, true) // Mark that we read this
      } else {
        // console.log(pak)
      }
    }
    // console.log(missing, have)
    for (let i = this.windowStart; i < this.windowEnd; i++) {
      const val = this.get(i)
      if (!val) {
        break
      }
      this.windowStart++
      this.windowEnd++
      this.window.shift() // If we're not missing anything, flush
    }

    return [ missing, have ]
  }
}

class SlidingOrderedWindow {
  /** @type  */
  window

  constructor(maxSize) {
    this.window = new Array(maxSize)
    this.windowStart = 0
    this.windowEnd = maxSize
  }

  set(entryIndex, data) {
    if (entryIndex < this.windowStart || entryIndex > this.windowEnd) return
    const offset = entryIndex - this.windowStart
    this.window[offset] = data
  }

  get(entryIndex) {
    if (entryIndex < this.windowStart || entryIndex > this.windowEnd) return
    const offset = entryIndex - this.windowStart
    return this.window[offset]
  }

  read(onLost) {
    const out = []
    for (let i = this.windowStart; i < this.windowEnd; i++) {
      const val = this.get(i)
      if (!val) {
        onLost?.(i)
        break
      }
      this.windowStart++
      this.windowEnd++
      out.push(this.window.shift())
    }
    return out
  }
}

module.exports = { SlidingOrderedWindow, SlidingReceiveWindow }