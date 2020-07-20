import {css} from '../../../vendor/lit-element/lit-element.js'
import tooltipCSS from '../../tooltip.css.js'

const cssStr = css`
${tooltipCSS}

:host {
  display: block;
  padding-bottom: 10px;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-gap: 10px 10px;
  width: 100%;
  box-sizing: border-box;
}

.item {
  border: 1px solid #dde;
  border-radius: 2px;
  padding: 8px 10px;
  box-sizing: border-box;
}

.item .content {
  border: 1px solid transparent;
  border-radius: 8px;
}

.item .content file-display {
  --text-font-size: 13px;
  --text-padding: 10px;
  --text-white-space: pre;
  --text-border-width: 1px;
  --text-border-radius: 8px;
  --text-background: #fff;
  --img-border-radius: 0;
}

.item.selected {
  background: var(--inline-file-grid--color-selected-bg);
}

.item.selected .content {
}
`
export default cssStr