export const SITE_TEMPLATES = [
  {id: 'web-page', title: 'Web page'},
  {id: 'file-share', title: 'File share'},
  {id: 'image-collection', title: 'Image collection'},
  {id: 'music-album', title: 'Album', disabled: true},
  {id: 'video', title: 'Video', disabled: true},
  {id: 'podcast', title: 'Podcast', disabled: true},
  {id: 'module', title: 'Code Module', disabled: true},
  {id: 'blank', title: 'Empty project'}
]

export async function createSiteFromTemplate (template) {
  template = template === 'blank' ? false : template
  var archive = await DatArchive.create({template, prompt: false})
  
  if (!template) {
    // for the blank template, go to the source view
    // TODO should go to the editor
    return `beaker://library/${archive.url}#setup`
  } else {
    // go to the site
    return archive.url
  }
}