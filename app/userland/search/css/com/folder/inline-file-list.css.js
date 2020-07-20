import {css} from '../../../vendor/lit-element/lit-element.js'
import tooltipCSS from '../../tooltip.css.js'

const cssStr = css`
${tooltipCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.items {
  padding: 0;
  box-sizing: border-box;
  max-width: 800px;
}

.item {
  border: 1px solid #dde;
  border-radius: 2px;
  padding: 8px 10px;
  box-sizing: border-box;
  margin-bottom: 10px;
}

.item .content {
  overflow: hidden;
  max-height: 50vh;
}

.item .content file-display {
  --text-padding: 10px;
  --text-white-space: pre;
  --text-border-width: 1px;
  --text-border-radius: 4px;
  --text-max-height: 50px;
  --text-background: #fff;
  --img-border-radius: 8px;
  --media-max-height: 50vh;
  --mount-padding: 0;
}

.item.selected {
  background: var(--inline-file-list--color-selected-bg);
}
`
export default cssStr