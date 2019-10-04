import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import labelCSS from './label.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${labelCSS}

.banner {
  background: linear-gradient(to top, #eaeaed, #fff);
}

.banner-inner {
  position: relative;
  padding: 30px 0 40px;
  max-width: 960px;
  margin: 0 auto;
}

.banner img {
  display: block;
  margin: 0 auto;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: rgba(0, 0, 0, 0.35) 0px 2px 2px, rgba(0, 0, 0, 0.35) 0px 2px 25px;
}

.banner h1 {
  position: absolute;
  margin: 10px 0;
  bottom: 0;
  left: 0;
  font-size: 2.5em;
}

.banner .banner-ctrls {
  position: absolute;
  margin: 10px 0;
  bottom: 0;
  right: 0;
}

.banner .label {
  background: #fff;
  margin-right: 5px;
}

.toolbar {
  background: #fff;
  margin-bottom: 10px;
}

.toolbar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 960px;
  padding: 10px 0;
  margin: 0 auto;
}

.layout {
  display: flex;
  max-width: 960px;
  margin: 0 auto;
}

person-viewer-nav {
  flex: 0 0 210px;
  font-size: 13px;
}

beaker-status-feed,
status-view,
social-graph-view,
bookmarks-view,
dats-view {
  width: 540px;
}

raw-file-view {
  width: 750px;
}
`
export default cssStr