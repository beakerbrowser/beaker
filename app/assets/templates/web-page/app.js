var site = new DatArchive(window.location)
var siteInfo
var els = {
  title: document.getElementById('page-title'),
  content: document.getElementById('page-content'),
}
setup()

async function setup () {
  siteInfo = await site.getInfo()

  els.title.textContent = siteInfo.title
  if (siteInfo.isOwner) {
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
          top: 110px;
          width: 500px;
          color: gray;
        }
        .cheat-sheet table td {
          color: gray;
        }
        .cheat-sheet p code:before {
          content: '<';
        }
        .cheat-sheet p code:after {
          content: '>';
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
              <textarea class="content-textarea" rows="40" placeholder="Page HTML">${els.content.innerHTML}</textarea>
            </p>
          </div>
          <div class="cheat-sheet">
            <h2>HTML Cheat Sheet</h2>

            <h3>Paragraphs</h3>

            <p>Create new paragraphs using the <code>p</code> tag.</p>

            <h3>Headings</h3>

            <p>Create headings with the <code>h1</code>, <code>h2</code>, <code>h3</code>, <code>h4</code>, <code>h5</code>, and <code>h6</code> tags.</p>

            <pre><code>&lt;h2&gt;My heading&lt;/h2&gt;</code></pre>

            <h3>Tables</h3>

            <p>Create tables using <code>table</code>.</p>

            <pre><code>&lt;table&gt;
  &lt;tbody&gt;
    &lt;tr&gt;&lt;td&gt;Row 1, Col 1&lt;/td&gt;&lt;td&gt;Row 1, Col 2&lt;/td&gt;&lt;/tr&gt;
    &lt;tr&gt;&lt;td&gt;Row 2, Col 1&lt;/td&gt;&lt;td&gt;Row 2, Col 2&lt;/td&gt;&lt;/tr&gt;
  &lt;/tbody&gt;
&lt;/table&gt;</code></pre>

            <h3>Text formatting</h3>

            <p>You can format the text with <code>bold</code>, <code>em</code>, <code>del</code>, and <code>code</code>.</p>

            <pre><code>&lt;strong&gt;bold&lt;/strong&gt;
&lt;em&gt;italic&lt;/em&gt;
&lt;del&gt;deleted&lt;/del&gt;
&lt;code&gt;coded&lt;/code&gt;</code></pre>

            <div><strong>bold</strong>, <em>italic</em>, <del>deleted</del>, and <code>coded</code>.<br></div>

            <h3>Horizontal lines</h3>

            <p>You can make horizontal lines with <code>hr</code>.</p>

            <pre><code>&lt;hr&gt;</code></pre>

            <hr>

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
    siteInfo.title = title

    // write the content
    await site.writeFile('index.html', `<html>
  <head>
    <script type="module" src="/app.js"></script>
    <style>
      #page-content {
        max-width: 800px;
      }
    </style>
  </head>
  <body>
    <h1 id="page-title">${escapeQuotes(title)}</h1>
    <main id="page-content">${content}</main>
  </body>
</html>`)

    // update UI
    els.title.textContent = title
    els.content.innerHTML = content
    this.isEditing = false
    this.render()
  }

  onClickCancel (e) {
    this.isEditing = false
    this.render()
  }
}

customElements.define('app-owner-controls', OwnerControls)

function escapeQuotes (str) {
  return (str || '').replace(/"/g, '&quot;')
}