import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import progressCSS from '../../../app-stdlib/css/com/progress.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${progressCSS}

:host {
  display: block;
}

.crawler-status {
  margin: 0 -15px;
}

.crawler-status.loading {
  margin: 0;
}

.crawler-status .crawler-actions {
  padding: 0px 10px 10px;
}

.crawler-status .heading,
.crawler-status .row {
  display: flex;
  align-items: center;
  padding: 6px 15px;
}

.crawler-status .heading {
  align-items: center;
  padding: 6px 15px;
  color: #333;
  font-size: 11px;
}

.crawler-status .heading .title,
.crawler-status .row .title {
  width: 150px;
}

.crawler-status .heading .crawl-state {
  flex: 1;
}

.crawler-status .heading a {
  color: #333 !important;
  cursor: pointer;
}

.crawler-status .row .title,
.crawler-status .row .crawl-state {
  white-space: nowrap;
  overflow: hidden;
}

.crawler-status .row .crawl-state {
  color: rgba(0, 0, 0, 0.5);
  flex: 1;
}

.crawler-status .row .error {
  color: #ff3b30;
}
`
export default cssStr