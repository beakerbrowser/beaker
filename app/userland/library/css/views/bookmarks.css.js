import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${tooltipCSS}
${spinnerCSS}

a {
  text-decoration: none;
}

.bookmarks {
  font-size: 13px;
  box-sizing: border-box;
}

.bookmarks h3 {
  padding: 20px 14px;
  margin: 0;
  border-bottom: 1px solid #dde;
  color: #778;
  letter-spacing: 1px;
}

.bookmarks .empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: #a3a3a8;
  padding: 120px 0px;
  background: #fafafd;
  text-align: center;
}

.bookmarks .empty .far {
  font-size: 120px;
  margin-bottom: 30px;
  color: #d3d3d8;
}

.bookmark {
  display: flex;
  align-items: center;
  padding: 18px 24px;
  color: #555;
  border-bottom: 1px solid #dde;
}

.bookmark:first-child {
  border-top: 1px solid #dde;
}

.bookmark:hover {
  text-decoration: none;
  background: #fafafd;
}

.bookmark .favicon {
  display: block;
  width: 16px;
  height: 16px;
  margin-right: 20px;
}

.bookmark .title {
  font-size: 13px;
  font-weight: 600;
  margin-right: 20px;
}

.bookmark .href {
  flex: 1;
  color: #99a;
}

.bookmark .ctrls {
  width: 40px;
}

`
export default cssStr