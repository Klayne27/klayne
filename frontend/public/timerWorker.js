let intervalId = null

self.onmessage = (e) => {
  const { type } = e.data

  if (type === "START") {
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(() => {
      self.postMessage({ type: "TICK" })
    }, 500)
  }

  if (type === "STOP") {
    clearInterval(intervalId)
    intervalId = null
  }
}
