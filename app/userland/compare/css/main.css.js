import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}

:host {
  display: block;
  max-width: 1000px;
  margin: 10px auto;
  border: 1px solid #ccc;
  border-bottom: 0;
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 18px;
  border-bottom: 1px solid #ccc;
}

.header .title {
  font-size: 15px;
  margin-right: 10px;
}

.header a {
  text-decoration: none;
  color: var(--blue);
}

.header a:hover {
  text-decoration: underline;
}

.header .primary {
  font-size: 13px;
}

.empty {
  padding: 18px;
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
  color: #666;
}

compare-diff-item .item {
  display: flex;
  align-items: center;
  padding: 14px;
  user-select: none;
}

compare-diff-item .item.clickable {
  cursor: pointer;
}

compare-diff-item .item.add {
  color: #116520;
  background: rgb(239, 255, 241);
  border-bottom: 1px solid rgb(208, 218, 209);
}

compare-diff-item .item.mod {
  color: rgb(115, 95, 17);
  background: rgb(255, 250, 230);
  border-bottom: 1px solid rgb(226, 211, 151);
}

compare-diff-item .item.del {
  color: #86120c;
  background: rgb(253, 234, 233);
  border-bottom: 1px solid rgb(218, 199, 198);
}

compare-diff-item button.transparent {
  color: rgba(0,0,0,.75);
}

compare-diff-item button.transparent:hover {
  background: rgba(0,0,0,.05);
}

.revision {
  width: 35px;
}

.revision-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: -.4px;
  margin-left: -2px;
  margin-left: 4px;
  margin-right: 4px;
}

.revision-indicator.add { background: #44c35a; }
.revision-indicator.mod { background: #fac800; }
.revision-indicator.del { background: #d93229; }

compare-diff-item-content .container {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-gap: 5px;
  padding: 5px;
  border-bottom: 1px solid #ccc;
}

compare-diff-item-content .container.split {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

compare-diff-item-content .action {
  font-size: 80%;
  color: gray;
  margin-bottom: 5px;
}

compare-diff-item-content .text {
  font-family: var(--code-font);
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 3px;
  white-space: pre;
  overflow-x: auto;
  box-sizing: border-box;
}

compare-diff-item-content img,
compare-diff-item-content video,
compare-diff-item-content audio {
  max-width: 100%;
}
`
export default cssStr