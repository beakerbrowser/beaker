import {css} from '../../../vendor/lit-element/lit-element.js'
import tooltipCSS from '../../tooltip.css.js'

const cssStr = css`
${tooltipCSS}

:host {
  display: block;
  padding-bottom: 10px;

  --color-selected-bg: ;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 180px));
  grid-gap: 10px 10px;
  width: 100%;
  padding: 10px 10px 20px 10px;
  box-sizing: border-box;
}

.item {
  border-radius: 8px;
}

.item .header {
  padding: 4px 4px;
  font-size: 12px;
}

.item .header div {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item .header .author {
  color: var(--inline-file-grid--color-itemauthor);
}

.item .header .name {
  color: var(--inline-file-grid--color-itemname);
  font-weight: 500;
}

.item .content {
  border: 1px solid transparent;
  border-radius: 8px;
  overflow: hidden;
}

.item .content file-display {
  overflow: hidden;
  pointer-events: none;
  --text-max-height: 170px;
  --text-font-size: 11px;
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