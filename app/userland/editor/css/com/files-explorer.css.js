import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttons2css from '../../../app-stdlib/css/buttons2.css.js'
import spinnercss from '../../../app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttons2css}
${spinnercss}

:host {
  display: block;
  overflow-y: auto;
}

.empty {
  font-style: italic;
  color: #eef7;
  padding: 10px 16px;
}

.path {
  position: relative;
  padding: 0 4px;
  font-size: 12px;
  color: #bbb;
  overflow-x: auto;
  white-space: nowrap;
  border: 1px solid #556;
  background: #445;
}

.path a {
  display: block;
  padding: 4px;
}

.path a:hover {
  cursor: default;
}

.path .fa-angle-right {
  padding: 2px;
}

.path .spinner {
  position: absolute;
  width: 10px;
  height: 10px;
  top: 4px;
  right: 5px;
}

.listing {
  height: calc(100% - 25px); /* subtract 25px to account for the .path space */
}

.listing .item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
}

.listing .item:hover {
  background: #445;
}

.listing .item.selected {
  background: var(--blue);
  color: #fff;
}

.listing .item.new-file {
  opacity: 0.5;
}

.listing .item .icon {
  padding-right: 6px;
}

.listing .item .name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.listing .item .size {
  color: rgba(255, 255, 255,.5);
}

@media (max-width: 600px) {
  .toolbar .btn-label {
    display: none;
  }
}

@media (min-width: 601px) {
  .tooltip-onsmall[data-tooltip]:hover:after,
  .tooltip-onsmall[data-tooltip]:hover:before {
    display: none;
  }
}
`
export default cssStr
