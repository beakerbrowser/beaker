import {css} from '../../../vendor/lit-element/lit-element.js'
import inputscss from '../../inputs.css.js'
import buttons2css from '../../buttons.css.js'
const cssStr = css`
${inputscss}
${buttons2css}

:host {
  display: block;
  position: relative;
  background: #fff;
  padding: 14px 18px;
  border: 1px solid #ccd;
  border-radius: 4px;
  overflow: hidden;
  --input-font-size: 14px;
}

.input-placeholder,
textarea {
  padding: 0;
  font-size: var(--input-font-size);
}

textarea::-webkit-input-placeholder {
  line-height: inherit;
  font-size: var(--input-font-size);
}

.input-placeholder {
  cursor: text;
  color: #aaa;
  font-weight: 400;
}

textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  height: auto;
  min-height: 70px;
  resize: none;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
}

.actions {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
}

.actions button {
  margin-left: auto;
}
`
export default cssStr
