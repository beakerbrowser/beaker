var site = new DatArchive(window.location)
var siteInfo
var indexMd
var scriptLine
setup()

async function setup () {
  siteInfo = await site.getInfo()

  var h1 = document.createElement('h1')
  h1.textContent = siteInfo.title
  document.body.querySelector('.markdown').prepend(h1)

  if (siteInfo.isOwner) {
    // read the markdown, strip the app script
    indexMd = await site.readFile('/index.md')
    let parts = indexMd.split('\n')
    scriptLine = parts.shift()
    indexMd = parts.join('\n')

    // add controls
    document.body.prepend(new OwnerControls())
  }
}

class OwnerControls extends HTMLElement {
  constructor () {
    super()
    this.isEditing = !siteInfo.title // go straight to editor when there is no title
    this.attachShadow({mode: 'open'})
    this.render()
  }

  $ (sel) {
    return this.shadowRoot.querySelector(sel)
  }

  render () {
    // render controls
    this.shadowRoot.innerHTML = `
      <style>
        .editor {
          width: 800px;
        }
        input,
        textarea {
          width: 100%;
          padding: 10px;
          font-size: 16px;
          border: 1px solid gray;
        }
        .cheat-sheet {
          position: absolute;
          left: 840px;
          top: 70px;
          width: 500px;
          color: gray;
        }
        .cheat-sheet table td {
          color: gray;
        }
      </style>
      <p>
        <button class="edit-btn" ${this.isEditing ? 'disabled' : ''}>${this.isEditing ? 'Editing...' : 'Edit page'}</button>
      </p>
      ${this.isEditing
        ? `
          <div class="editor">
            <p>
              <button class="cancel-btn">Cancel</button>
              <button class="save-btn" type="submit">Save</button>
            </p>
            <p>
              <input class="title-input" type="text" placeholder="Title (required)" autofocus value="${escapeQuotes(siteInfo.title)}">
            </p>
            <p>
              <textarea class="content-textarea" rows="40" placeholder="Page HTML">${indexMd}</textarea>
            </p>
          </div>
          <div class="cheat-sheet">
            <h3>Markdown Cheat Sheet</h3>

            <h4>Headings</h4>

            <pre><code># H1
## H2
### H3</code></pre>

            <h4>Text formatting</h4>

            <pre><code>**bold text**
*italicized text*
> blockquote
${'`'}code${'`'}</code></pre>

            <h4>Links</h4>

            <pre><code>[title](https://www.example.com)</code></pre>

            <h4>Images</h4>

            <pre><code>![alt text](image.jpg)</code></pre>

            <h4>Lists</h4>

            <pre><code>1. First item
2. Second item
3. Third item</code></pre>

            <pre><code>- First item
- Second item
- Third item</code></pre>

            <h4>Tables</h4>

            <pre><code>| Syntax | Description |
| ----------- | ----------- |
| Header | Title |
| Paragraph | Text |</code></pre>

            <h4>Horizontal lines</h4>

            <pre><code>---</code></pre>

          </div>
          `
        : ''}
    `

    // attach event handlers
    if (this.isEditing) {
      this.$('.save-btn').addEventListener('click', e => this.onClickSave(e))
      this.$('.cancel-btn').addEventListener('click', e => this.onClickCancel(e))
    } else {
      this.$('.edit-btn').addEventListener('click', e => this.onClickEdit(e))
    }
  }

  onClickEdit (e) {
    this.isEditing = true
    this.render()
  }

  async onClickSave (e) {
    var title = this.$('.title-input').value
    var content = this.$('.content-textarea').value

    // validate
    if (!title) {
      this.$('.title-input').style.borderColor = '#f00'
      return
    }

    // update site title
    await site.configure({title})

    // write the content
    await site.writeFile('index.md', scriptLine + '\n' + content)
    window.location.reload()
  }

  onClickCancel (e) {
    if (!siteInfo.title) return // dont cancel until a title is set
    this.isEditing = false
    this.render()
  }
}

customElements.define('app-owner-controls', OwnerControls)

function escapeQuotes (str) {
  return (str || '').replace(/"/g, '&quot;')
}