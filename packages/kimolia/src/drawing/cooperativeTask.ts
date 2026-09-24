type Clock = {
  now: () => number
  schedule: (callback: () => void) => () => void
}
const browserClock: Clock = {
  now: () => performance.now(),
  schedule(callback) {
    const timer = setTimeout(callback, 0)
    return () => clearTimeout(timer)
  },
}

// Keep short replays synchronous. Larger jobs yield between small units of
// drawing work, allowing input, layout and paint to run without a long freeze.
export function createCooperativeTask(
  onBusy: (busy: boolean) => void,
  clock = browserClock,
  budgetMs = 6,
) {
  let work: Iterator<unknown> | null = null
  let cancelScheduled: (() => void) | null = null
  let generation = 0
  let reportedBusy = false
  const report = (busy: boolean) => {
    if (busy === reportedBusy) return
    reportedBusy = busy
    onBusy(busy)
  }
  const cancel = () => {
    generation++
    cancelScheduled?.()
    cancelScheduled = null
    work = null
    report(false)
  }
  return {
    isBusy: () => work !== null,
    cancel,
    run(iterator: Iterator<unknown>) {
      cancel()
      work = iterator
      const token = generation
      const step = () => {
        if (token !== generation || work !== iterator) return
        cancelScheduled = null
        const start = clock.now()
        let units = 0
        do {
          if (iterator.next().done) {
            work = null
            report(false)
            return
          }
          // Canvas commands can be queued cheaply but rasterise later. Also cap
          // the batch size so deferred work cannot accumulate for a whole board.
        } while (++units < 64 && clock.now() - start < budgetMs)
        report(true)
        cancelScheduled = clock.schedule(step)
      }
      step()
    },
  }
}
