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
  margin-top: 5px;
}

.item {
  display: flex;
  padding: 10px;
  overflow: hidden;
  border-top: 1px solid var(--inline-file-list--color-border);
}

.item .info {
  flex: 0 0 160px;
  width: 160px;
  padding-right: 10px;
  box-sizing: border-box;
  font-size: 12px;
  color: var(--inline-file-list--color-iteminfo);
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
  color: var(--inline-file-list--color-itemprop);
}

.item .info .author {
  color: var(--link-color);
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
  background: var(--inline-file-list--color-selected-bg);
}
`
export default cssStr