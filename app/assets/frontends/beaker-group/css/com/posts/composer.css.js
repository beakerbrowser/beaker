import {css} from '../../../vendor/lit-element/lit-element.js'
import inputscss from '../../inputs.css.js'
import buttonscss from '../../buttons.css.js'
import spinnercss from '../spinner.css.js'

const cssStr = css`
${inputscss}
${buttonscss}
${spinnercss}

:host {
  display: block;
  background: #fff;
  border: 1px solid #ccd;
  border-radius: 8px;
  overflow: hidden;
  max-width: 800px;
  margin: 10px auto;
}

a {
  color: var(--color-link);
}

.type-selector {
  display: flex;
  border-bottom: 1px solid #ccd;
}

.type-selector a {
  flex: 1;
  border-right: 1px solid #ccd;
  border-bottom: 2px solid transparent;
  text-align: center;
  cursor: pointer;
  padding: 16px 0;
  font-size: 13px;
  font-weight: bold;
  color: #778;
}

.type-selector a:last-child {
  border-right: 0;
}

.type-selector a:hover,
.type-selector a.selected {
  color: var(--color-link);
  background: #fafaff;
}

.type-selector a.selected {
  border-bottom: 2px solid var(--color-link);
}

form {
  padding: 20px;
}

.form-group {
  margin-bottom: 14px;
}

textarea,
input {
  font-size: 16px;
  font-weight: 500;
  width: 100%;
  box-sizing: border-box;
}

input {
  height: 36px;
  padding: 0 12px;
}

textarea {
  min-height: 200px;
  padding: 10px 12px;
  resize: vertical;
}

.file-input {
  border: 1px solid #ccd;
  border-radius: 4px;
  padding: 12px 12px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 500;
}

.file-input .selection {
  color: #556;
  font-size: 16px;
  border-radius: 4px;
  margin-bottom: 6px;
}

#native-file-input {
  display: none;
}

.link-metadata {
  display: inline-flex;
  align-items: center;
}

.link-metadata > * {
  margin-right: 5px;
}

input.success,
textarea.success,
.file-input.success {
  border-color: var(--green);
}

input.error,
textarea.error,
.file-input.error {
  border-color: var(--red);
}

div.error {
  color: var(--red);
}

input#title {
  font-size: 18px;
  height: 44px;
  font-weight: bold;
}

::-webkit-input-placeholder {
  font-size: inherit;
}

.actions {
  display: flex;
  align-items: center;
}

.actions button {
  margin-left: auto;
  padding: 6px 10px;
  font-size: 14px;
}
`
export default cssStr
