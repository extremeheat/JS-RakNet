

class SlidingWindow {
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

class SlidingUnreliableWindow extends SlidingWindow {
  read() {
    const out = []
    for (let i = this.windowStart; i < this.windowEnd; i++) {
      const val = this.get(i)
      if (!val) {
        break
      }
      this.windowStart++
      this.windowEnd++
      out.push(this.window.shift())
    }
    return out
  }
}

function test() {
  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array
  }

  const window = new SlidingWindow(128)
  window.set(0, '0')
  window.set(1, '1')
  window.set(3, '3')
  window.set(2, '2')

  for (let i = 0; i < 100; i += 4) {
    const v = shuffle([i, i + 1, i + 2, i + 3])
    // console.log(v)

    for (let j = 0; j < 4; j++) {
      window.set(v[j], v[j] + '')
      if ((j % 2) == 0) console.log('Read', window.read())
    }
  }


  console.log('Read', window.read())
  window.set(3, '3')
  window.set(5, '5')
  window.set(4, '4')
  console.log('Read', window.read())

  console.log(window)
}

module.exports = SlidingWindow