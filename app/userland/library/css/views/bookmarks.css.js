import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'
import emptyCSS from '../empty.css.js'
import labelCSS from '../label.css.js'
import viewHeaderCSS from '../view-header.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}
${emptyCSS}
${labelCSS}
${viewHeaderCSS}

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
  padding: 0 0 10px;
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

.listing {
  margin: 10px 20px 10px;
}

.bookmark {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  margin-bottom: 5px;
  background: #fff;
  box-shadow: 0 2px 3px rgba(0,0,0,.05);
  border-radius: 4px;
  color: #555;
  user-select: none;
}

.bookmark:hover {
  box-shadow: 0 2px 3px rgba(0,0,0,.15);
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