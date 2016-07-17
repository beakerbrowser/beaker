import * as moment from 'moment'

export function niceDate (ts) {
  const endOfToday = moment().endOf('day')
  if (typeof ts == 'number')
    ts = moment(ts)
  if (ts.isSame(endOfToday, 'day'))
    return ts.fromNow()
  else if (ts.isSame(endOfToday.subtract(1, 'day'), 'day'))
    return 'yesterday'
  else if (ts.isSame(endOfToday, 'year'))
    return ts.format("dddd, MMMM Do")
  return ts.format("MMMM Do YYYY")
}