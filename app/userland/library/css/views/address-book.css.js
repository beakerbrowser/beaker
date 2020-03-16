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

.contacts {
  display: grid;
  grid-template-columns: repeat(auto-fill, 180px);
  grid-gap: 25px;
  padding: 14px 10px;
  font-size: 13px;
  box-sizing: border-box;
  user-select: none;
}

.empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: #a3a3a8;
  padding: 120px 0px;
  background: #fafafd;
  text-align: center;
}

.empty .far {
  font-size: 120px;
  margin-bottom: 30px;
  color: #d3d3d8;
}

:host(.top-border) .contacts {
  padding: 0;
}

.contact {
  position: relative;
  text-align: center;
  padding: 30px 5px 25px;
  color: #555;
  border: 1px solid #dde;
  border-radius: 4px;
}

.contact:hover {
  text-decoration: none;
  background: #fafafd;
}

.contact .thumb {
  display: inline-block;
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 50%;
  margin-bottom: 20px;
}

.contact .info {
  flex: 1;
}

.contact .title {
  font-size: 15px;
  line-height: 1;
  font-weight: 600;
}

.contact .description {
  color: #99a;
  margin-top: 5px;
  max-height: 48px; /* 3 lines of text */
  overflow: hidden;
}

.contact .ctrls {
  position: absolute;
  top: 0;
  right: 0;
}

`
export default cssStr