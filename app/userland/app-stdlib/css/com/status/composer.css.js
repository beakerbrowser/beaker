import {css} from '../../../vendor/lit-element/lit-element.js'
import inputscss from '../../inputs.css.js'
import buttons2css from '../../buttons2.css.js'
const cssStr = css`
${inputscss}
${buttons2css}

:host {
  display: block;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.input-placeholder,
textarea {
  padding: 16px 20px;
  font-size: 14px;
}

textarea::-webkit-input-placeholder {
  line-height: inherit;
  font-size: 14px;
}

.input-placeholder {
  cursor: pointer;
  color: #aaa;
  font-weight: 400;
}

.input-placeholder:hover {
  background: #fafafa;
}

textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  height: auto;
  min-height: 55px;
  margin-bottom: 10px;
  resize: none;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
}

.actions {
  display: flex;
  align-items: center;
  padding: 16px 20px;
}

.actions button {
  margin-left: auto;
}
`
export default cssStr
