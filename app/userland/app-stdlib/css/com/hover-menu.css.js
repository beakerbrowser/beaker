import {css} from '../../vendor/lit-element/lit-element.js'
import colorscss from '../colors.css.js'
const cssStr = css`
${colorscss}

:host {
  --menu-label-font-size: 12px;
}

.menu-label {
  font-size: var(--menu-label-font-size);
}

.dropdown {
  display: inline-block;
  position: relative;
  color: var(--color-text);
  padding: 6px 6px;
  cursor: pointer;
  user-select: none;
}

.dropdown:hover {
  background: #f5f5f5;
}

.dropdown-menu {
  position: absolute;
  top: 24px;
  background: #fff;
  padding: 6px 0;
  border: 1px solid #bbb;
  border-radius: 2px;
  box-shadow: 0 2px 3px rgba(0,0,0,.1);
  z-index: 1;
}

:host([right]) .dropdown-menu {
  right: 0;
}

.heading {
  cursor: default !important;
  padding: 6px 30px 6px 14px;
  color: var(--color-text--moted);
  font-size: 10px;
  font-weight: 500;
}

.item {
  display: block;
  padding: 12px 30px 12px 14px;
  min-width: 60px;
  color: var(--color-text);
  font-size: 12px;
  white-space: nowrap;
}

.item:not(.disabled):hover {
  background: #f5f5f5;
}

.item.disabled {
  color: var(--color-text--muted);
  cursor: default !important;
}

.item .fa-fw {
  margin-left: 2px;
  margin-right: 10px;
}

hr {
  border: 0;
  border-top: 1px solid #ddd;
}
`
export default cssStr
