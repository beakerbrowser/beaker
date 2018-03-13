import Txt from 'dns-txt'
const txt = Txt()

export function getDNSMessageDiscoveryKey (archivesByDKey, msg) {
  var key
  function check (obj) {
    if (!key && obj.name.endsWith('.dat.local')) {
      key = obj.name.slice(0, -10)

      // HACK
      // if the key is short, try to find the full thing in our list
      // (this shouldnt be needed once discovery stops truncating keys)
      // -prf
      if (key.length === 40) {
        let dKeys = Object.keys(archivesByDKey)
        for (let i = 0; i < dKeys.length; i++) {
          if (dKeys[i].startsWith(key)) {
            key = dKeys[i]
            break
          }
        }
      }
    }
  }
  if (msg.questions) msg.questions.forEach(check)
  if (msg.answers) msg.answers.forEach(check)
  if (msg.additionals) msg.additionals.forEach(check)
  return key || ''
}

function has (str, v) {
  return str.indexOf(v) !== -1
}

export function renderDNSTraffic ({questions, answers, additionals}) {
  var messageParts = []
  if (questions  && (!answers || !answers.length) && (!additionals || !additionals.length)) {
    questions.forEach(q => {
      if (q.type === 'TXT') {
        messageParts.push('TXT Question (requesting peers list)')
      } else {
        messageParts.push(q.type + ' Question')
      }
    })
  }
  if (answers) {
    answers.forEach(a => {
      if (a.type === 'TXT' && a.data) {
        let data = a.data.toString()
        if (has(data, 'host') && has(data, 'token')) {
          messageParts.push('TXT Answer (heres a session token)')
        } else if (has(data, 'peers')) {
          messageParts.push('TXT Answer (heres a peers list)')
        } else if (has(data, 'token')) {
          messageParts.push('TXT Answer (no peers found)')
        } else {
          messageParts.push('TXT Answer')
        }
      } else {
        messageParts.push(a.type + ' Answer')
      }
    })
  }
  if (additionals) {
    additionals.forEach(a => {
      if (a.type === 'TXT' && a.data) {
        let data = a.data.toString()
        if (has(data, 'announce')) {
          messageParts.push('TXT Additional (announcing self)')
        } else if (has(data, 'unannounce')) {
          messageParts.push('TXT Additional (unannouncing self)')
        } else if (has(data, 'subscribe')) {
          messageParts.push('TXT Additional (subscribing)')
        } else {
          messageParts.push('TXT Additional')
        }
      } else if (a.type === 'SRV' && a.data) {
        messageParts.push('SRV Additional (pushed announcement)')
      } else {
        messageParts.push(a.type + ' Additional')
      }
    })
  }
  return messageParts.join(', ')
}