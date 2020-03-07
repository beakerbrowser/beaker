import {css} from '../../vendor/lit-element/lit-element.js'
import inputsCSS from '../inputs.css.js'
import spinnerCSS from './spinner.css.js'

const cssStr = css`
${inputsCSS}
${spinnerCSS}

:host {
  --input-bg-color: #f1f1f6;
  --input-border: 0;
  --input-border-radius: 16px;
  --input-color: #555;
  display: block;
  margin-right: 16px;
}

.search-container {
  position: relative;
  height: 36px;
  width: 210px;
  font-size: 13px;
}

.spinner,
.close-btn,
.search {
  position: absolute;
}

input.search {
  background: var(--input-bg-color);
  border-radius: var(--input-border-radius);
  border: var(--input-border);
  color: var(--input-color);
  left: 0;
  top: 0;
  width: 100%;
  height: 29px;
  padding: 0 10px;
  padding-left: 32px;
  margin-top: 4px;
  box-sizing: border-box;
  font-size: 13px;
}

input.search::-webkit-input-placeholder {
  font-size: 13px;
  color: var(--input-color);
}

input:focus {
  box-shadow: none;
}

.search-container > i.fa-search {
  position: absolute;
  left: 12px;
  font-size: 13px;
  top: 13px;
  color: var(--input-color);
  z-index: 1;
}

.autocomplete-container {
  position: relative;
  width: 100%;
}

.autocomplete-results {
  position: absolute;
  left: 0;
  top: 30px;
  z-index: 5;
  width: 100%;
  margin-bottom: 10px;
  overflow: hidden;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #ddd;
  box-shadow: 0 6px 20px rgba(0,0,0,.05);
}

.autocomplete-result-group {
  margin-bottom: 6px;
}

.autocomplete-result-group-title {
  padding: 4px 10px;
  border-bottom: 1px solid #ddd;
  color: rgba(0,0,0,.5);
}

.autocomplete-result {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  height: 40px;
  padding: 0 10px;
  border-left: 3px solid transparent;
  cursor: pointer;
  color: inherit;
  text-decoration: none;
}

.autocomplete-result .icon {
  width: 24px;
  height: 24px;
  text-align: center;
  margin-right: 10px;
}

.autocomplete-result .icon.rounded {
  border-radius: 50%;
  object-fit: cover;
}

.autocomplete-result .title,
.autocomplete-result .label {
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
}

.autocomplete-result .title {
  margin-right: 5px;
  flex: auto 0;
}

.autocomplete-result .label {
  color: rgba(0,0,0,.475);
  flex: 1;
}

.autocomplete-result:hover {
  background: #f7f7f7;
  border-color: #ddd;
}

.autocomplete-result.active {
  background: rgba(40, 100, 220, 0.07);
  border-color: #2864dc;
}
`
export default cssStr
