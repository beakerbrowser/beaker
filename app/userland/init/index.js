beaker.logger.stream().addEventListener('data', data => {
  var el = document.createElement('details')
  var summary = document.createElement('summary')
  summary.innerHTML = `${data.message} <small>[${data.level}]</small>`
  el.append(summary)
  el.append(JSON.stringify(data, null, 2))
  log.append(el)
})