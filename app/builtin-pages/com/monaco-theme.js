export default function defineTheme (monaco) {
  monaco.editor.defineTheme('beaker', {
    base: 'vs',
    inherit: true,
    rules: [
      {token: 'tag', foreground: '9C27B0'},
      {token: 'attribute.name', foreground: '669900'},
      {token: 'attribute.value', foreground: '4a4ae6'},

      {token: 'string.key.json', foreground: '669900'},
      {token: 'string.value.json', foreground: '4a4ae6'},

      {token: 'metatag.content.html', foreground: '4a4ae6'},
      {token: 'string.escape', foreground: '673ab7'},

      {token: 'keyword', foreground: '4a4ae6'},
      {token: 'string', foreground: '669900'},
      {token: 'number', foreground: '9C27B0'},
    ]
  })
}