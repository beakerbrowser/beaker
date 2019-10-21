import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from 'beaker://app-stdlib/css/colors.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}

:host {
  display: block;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.empty {
  background: #f5f5fa;
  padding: calc(50vh - 40px) 0;
  text-align: center;
  color: #666;
  font-size: 16px;
  line-height: 2;
  box-sizing: content-box;
}

.header {
  display: flex;
  align-items: center;
  height: 26px;
  padding: 10px 0;
  user-select: none;
}

.header button {
  margin-right: 10px;
}

.spacer {
  flex: 1;
}

.header button {
  font-size: 12px;
}

.header button .fa-fw {
  font-size: 11px;
}

.header hr {
  border: 0;
  border-left: 1px solid #ddd;
  height: 16px;
  margin: 0;
}

.header hover-menu {
  margin: 0 6px;
}

.header subview-tabs {
  margin-left: 14px;
}

.listing {
  border-top: 1px solid #f0f0f5;
}

.bookmark {
  display: flex;
  align-items: center;
  padding: 10px;
  color: #555;
  user-select: none;
  border-bottom: 1px solid #f0f0f5;
}

.bookmark:hover {
  background: #f5f5fa;
  text-decoration: none;
}

.bookmark > * {
  margin-right: 8px;
  white-space: nowrap;
}

.bookmark .href,
.bookmark .description,
.bookmark .tags {
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark .favicon img {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: cover;
}

.bookmark .author img {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
}

.bookmark .title {
  font-weight: 500;
}

.bookmark .href {
  color: var(--blue);
}

.bookmark .visibility {
  margin-left: auto;
}
`
export default cssStr