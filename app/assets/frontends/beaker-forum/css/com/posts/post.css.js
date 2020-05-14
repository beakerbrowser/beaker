import {css} from '../../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../../buttons.css.js'
import tooltipCSS from '../tooltip.css.js'

const cssStr = css`
${buttonsCSS}
${tooltipCSS}

:host {
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr);
  align-items: flex-start;
  letter-spacing: 0.5px;
  font-size: 14px;
  margin-bottom: 10px;
  color: var(--post-color);
}

:host([singlepage]) {
  grid-template-columns: 50px minmax(0, 1fr);
}

a {
  text-decoration: none;
  color: var(--post-link-color);
  font-weight: 500;
  cursor: pointer;
}

a:hover {
  text-decoration: underline;
}

.icon {
  text-align: center;
  margin-right: 8px;
  font-size: 21px;
  line-height: 44px;
}

.icon .fa-file,
.icon .fa-image {
  font-size: 24px;
}

.content > div {
  margin-bottom: 2px;
}

.title {
  font-size: 17px;
  font-weight: 600;
  color: var(--post-title-color--unread);
}

:host(.read) .title {
  font-weight: 500;
  color: var(--post-title-color--read);
}

:host([singlepage]) .title {
  font-size: 22px;
}

.drive-type,
.domain {
  color: var(--post-link-color);
}

.drive-type .far,
.drive-type .fas,
.domain .far,
.domain .fas {
  position: relative;
  top: -1px;
  font-size: 10px;
}

button.menu {
  padding: 0;
}

.author {
  color: green;
}

.text-post-content {
  color: #333;
  font-size: 15px;
  letter-spacing: 0.25px;
  margin-top: 10px;
}

.text-post-content > * {
  max-width: 50em;
}

.text-post-content > :first-child {
  margin-top: 0;
}

.text-post-content > :last-child {
  margin-bottom: 0;
}

.text-post-content a {
  color: var(--link-color);
}

.text-post-content pre {
  background: #f3f3f7;
  padding: 1em;
  overflow: auto;
  max-width: 100%;
}

.text-post-content code {
  background: #f3f3f7;
  padding: 0 4px;
}

.text-post-content hr {
  border: 0;
  border-top: 1px solid #ccd;
}

.text-post-content p,
.text-post-content ul,
.text-post-content ol {
  line-height: 1.5;
}

.text-post-content table {
  margin: 1em 0;
}

.text-post-content blockquote {
  border-left: 10px solid #f3f3f7;
  margin: 1em 0;
  padding: 1px 1.5em;
  color: #667;
}

.file-content {
  margin-top: 14px;
}

.file-content h3 {
  margin: 0;
}

.file-content h3 a {
  display: inline-block;
  padding: 10px 16px;
  border: 1px solid #ccd;
  border-radius: 4px;
}

.file-content h3 + * {
  margin-top: 10px;
}

.file-content > * {
  max-width: 100%;
}
`
export default cssStr
