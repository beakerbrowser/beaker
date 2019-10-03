import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'
import emptyCSS from '../empty.css.js'
import viewHeaderCSS from '../view-header.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}
${emptyCSS}
${viewHeaderCSS}

:host {
  display: block;
  margin: 0px 10px 50px 190px;
}

@media (min-width: 1300px) {
  .empty {
    position: relative;
    left: -90px;
  }
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
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