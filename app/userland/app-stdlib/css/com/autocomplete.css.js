import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
.autocomplete-container {
  position: relative;
  width: 100%;
}

.autocomplete-results {
  position: absolute;
  left: 0;
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
