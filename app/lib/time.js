import moment from 'moment'

export function niceDate (ts, opts) {
  const endOfToday = moment().endOf('day')
  if (typeof ts == 'number')
    ts = moment(ts)
  if (ts.isSame(endOfToday, 'day')) {
    if (opts && opts.noTime)
      return 'today'
    return ts.fromNow()
  }
  else if (ts.isSame(endOfToday.subtract(1, 'day'), 'day'))
    return 'yesterday'
  else if (ts.isSame(endOfToday, 'month'))
    return ts.fromNow()
  return ts.format("ll")
}