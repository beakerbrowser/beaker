import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${tooltipCSS}

:host {
  display: block;
  --color-selected-bg: #f3f3f8;
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
}

.item {
  display: flex;
  padding: 10px;
  overflow: hidden;
  border-top: 1px solid #eee;
}

.item .info {
  flex: 0 0 160px;
  width: 160px;
  padding-right: 10px;
  box-sizing: border-box;
  font-size: 12px;
  color: #99a;
}

.item .info img {
  display: inline-block;
  object-fit: cover;
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.item .info div {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item .info .name {
  font-weight: 500;
  font-size: 14px;
  line-height: 21px;
}

.item .info .name,
.item .info .folder,
.item .info .date {
  color: #556;
}

.item .info .author {
  color: var(--blue);
  font-weight: 500;
}

.item .content {
  flex: 1;
  overflow: hidden;
  max-height: 50vh;
}

.item .content file-display {
  --text-padding: 10px;
  --text-white-space: pre;
  --text-border-width: 1px;
  --text-border-radius: 8px;
  --text-min-height: 80px;
  --text-max-height: 50vh;
  --text-background: #fff;
  --img-border-radius: 8px;
  --media-max-height: 50vh;
  --mount-padding: 0;
}

.item.selected {
  background: var(--color-selected-bg);
}
`
export default cssStr