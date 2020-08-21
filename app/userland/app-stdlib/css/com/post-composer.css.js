import {css} from '../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../buttons2.css.js'
import tooltipCSS from '../tooltip.css.js'

const cssStr = css`
${buttonsCSS}
${tooltipCSS}

.quill-container {
  background: var(--bg-color--default);
  margin-bottom: 6px;
}

.quill-container .ql-toolbar {
  padding: 3px 8px;
  border: 1px solid var(--border-color--light);
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.quill-container .ql-container {
  border: 1px solid var(--border-color--light);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.quill-container .ql-container .ql-editor {
  min-height: 100px;
}

.quill-container .ql-editor {
  font-size: 14px;
}

.quill-container .ql-editor a {
  color: var(--text-color--markdown-link);
}

.ql-editor ol, .ql-editor ul {
  padding-left: 0;
}

.quill-container .ql-toolbar .ql-formats {
  margin-right: 10px;
}

.quill-container .ql-toolbar button {
  width: 24px;
  height: 20px;
  box-shadow: none;
}

.preview {
  font-size: 14px;
  background: var(--bg-color--default);
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  padding: 14px;
}
.preview > :first-child {
  margin-top: 0;
}
.preview > :last-child {
  margin-bottom: 0;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.visibility {
  display: inline-block;
  background: var(--bg-color--semi-light);
  border-radius: 4px;
  padding: 5px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.visibility.disabled {
  cursor: default;
}
`
export default cssStr
