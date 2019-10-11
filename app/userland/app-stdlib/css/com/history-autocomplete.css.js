import {css} from '../../vendor/lit-element/lit-element.js'
import commoncss from '../common.css.js'
import searchinputcss from './search-input.css.js'
import autocompletecss from './autocomplete.css.js'
const cssStr = css`
${commoncss}
${searchinputcss}
${autocompletecss}

:host {
  --input-bg-color: #fff;
  --input-border-radius: 4px;
}

.search-container,
input.search {
  position: relative;
  width: 100%;
  height: 36px;
  font-size: 13px;
}

.search-container input.search {
  background: var(--input-bg-color);
  border-radius: var(--input-border-radius);
  height: 30px;
  padding: 0 7px;
}

.search-container input.search:focus {
  box-shadow: 0 0 0 2px rgba(41, 95, 203, 0.2);
}

.search-container > .fa-search {
  font-size: 13px;
  left: 14px;
  top: 10px;
}

input.search::-webkit-input-placeholder {
  font-size: 13px;
}

`
export default cssStr
