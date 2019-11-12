import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${tooltipCSS}

:host {
  display: block;
  padding-bottom: 10px;

  --color-selected-bg: #f3f3f8;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

h4 {
  border-top: 1px solid #ccc;
  color: #b0b0bc;
  font-size: 21px;
  padding-top: 6px;
  padding-left: 4px;
  margin: 0;
}

.empty {
  background: var(--bg-color--light);
  padding: 40px;
  margin: 14px 0;
  border-radius: 8px;
  color: #667;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 180px));
  grid-gap: 10px 10px;
  width: 100%;
  user-select: none;
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
  color: #99a;
}

.item .header .name {
  color: #556;
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
  background: var(--color-selected-bg);
}

.item.selected .content {
}
`
export default cssStr