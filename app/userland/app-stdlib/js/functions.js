
export function debouncer (ms, fallback) {
  let stack = []
  let running = false

  async function pop () {
    if (!stack.length) {
      running = false
      return
    }
    running = true
    const startTime = Date.now()
    const { run, cancel } = stack.pop()
    for (let i = 0; i < stack.length; i++) {
      stack.pop().cancel()
    }
    try {
      await run()
    } finally {
      const diff = ms - (Date.now() - startTime)
      if (diff < 0) return pop()
      else setTimeout(pop, diff)
    }
  }

  return async function push (task) {
    return new Promise((resolve, reject) => {
      stack.push({
        run: () => task().then(resolve, reject),
        // Resolve with empty search results if cancelled.
        cancel: () => resolve(fallback)
      })
      if (!running) pop()
    })
  }
}