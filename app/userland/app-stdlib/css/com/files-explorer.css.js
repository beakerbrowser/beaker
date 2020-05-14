import {css} from '../../vendor/lit-element/lit-element.js'
import buttons2css from '../buttons2.css.js'
const cssStr = css`
${buttons2css}

:host {
  display: block;
}

:host([fullheight]) .listing {
  height: calc(100vh - 49px);
  overflow-y: auto;
}

.toolbar {
  display: flex;
  align-items: center;
  height: 26px;
  background: #334;
  padding-left: 5px;
}

.toolbar button {
  padding: 0 8px;
  height: 26px;
  line-height: 24px;
  color: #eee;
  border-radius: 0;
}

.toolbar button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toolbar .text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar .spacer {
  flex: 1;
}

.path {
  padding: 0 4px;
  font-size: 12px;
  color: #bbb;
  overflow-x: auto;
  white-space: nowrap;
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

.listing .item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
}

.listing .item:hover {
  background: #444;
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
