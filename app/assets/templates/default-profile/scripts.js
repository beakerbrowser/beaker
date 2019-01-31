async function renderProfile () {
  var self = new DatArchive(window.location)
  var info = await self.getInfo()
  document.querySelector('#title').textContent = info.title
  document.querySelector('#description span').textContent = info.description
}

renderProfile()