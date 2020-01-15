import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}

:host {
  --color-folder: #9ec2e0;
  --color-mount: #9ec2e0;
  --color-file: #9a9aab;
  --color-itemname: #333;
  --color-itemname-selected: #fff;
  --color-selected-bg: #4379e4;

  display: flex;
  padding-top: 10px;
}

a {
  color: var(--blue);
}

.header {
  display: flex;
  align-items: center;
  padding: 10px;
  margin: 10px;
  background: #fff;
  border-radius: 8px;
}

.header .title {
  font-size: 13px;
  font-weight: 500;
  margin-right: 5px;
}

.header a {
  text-decoration: none;
  color: var(--blue);
  font-weight: normal;
}

.header a:hover {
  text-decoration: underline;
}

.header .primary {
  font-size: 13px;
}

.header button {
  padding: 4px 6px;
  font-size: 10px;
  white-space: nowrap;
}

.header button.primary {
  padding: 5px 10px 5px 12px;
  border-radius: 12px;
  font-size: 10px;
}

nav {
  width: 300px;
  padding-bottom: 100px;
}

nav h4 {
  border-top: 1px solid #e3e3ee;
  color: #b0b0bc;
  padding-top: 6px;
  padding-left: 4px;
  margin: 10px 0 5px 10px;
  user-select: none;
}

nav h4:first-child {
  margin-top: 0;
}

main {
  flex: 1;
  position: sticky;
  top: 0px;
  background: #f1f1f6;
  border-radius: 8px;
  margin: 0 10px;
  height: 100vh
}

.empty {
  margin-left: 10px;
  padding: 24px;
  border-radius: 8px;
  background: rgb(241, 241, 246);
  color: #667;
}

compare-diff-item .item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px 14px;
  user-select: none;
  white-space: nowrap;
}

compare-diff-item .item.selected {
  background: var(--color-selected-bg);
}

compare-diff-item .item .icon {
  width: 20px;
}

compare-diff-item .item .icon .fa-fw.fa-folder {
  color: var(--color-folder);
}

compare-diff-item .item .icon .fa-fw.fa-external-link-square-alt {
  color: var(--color-mount);
}

compare-diff-item .item .icon .fa-fw.fa-file {
  -webkit-text-stroke: 1px var(--color-file);
  color: #fff;
}

compare-diff-item .item .path {
  flex: 1;
  color: var(--color-itemname);
  overflow: hidden;
  text-overflow: ellipsis;
}

compare-diff-item .item.selected .path {
  color: var(--color-itemname-selected);
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

compare-diff-item .item.selected .icon span {
  text-shadow: 0 1px 2px #0006;
}

compare-diff-item .item.selected .revision-indicator {
  box-shadow: 0 1px 2px #0006;
}

compare-diff-item-content {
  display: block;
  background: #fff;
  padding: 10px;
  border-radius: 8px;
  margin: 10px;
}

compare-diff-item-content .info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #889;
}

compare-diff-item-content .container {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-gap: 5px;
}

compare-diff-item-content .container.split {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}


compare-diff-item-content .container .fa-fw.fa-folder {
  color: var(--color-folder);
}

compare-diff-item-content .container .fa-fw.fa-external-link-square-alt {
  color: var(--color-mount);
}

compare-diff-item-content .action {
  font-size: 80%;
  color: gray;
  margin-bottom: 5px;
}

compare-diff-item-content .wrap {
  border: 1px solid #e3e3ee;
  border-radius: 8px;
  padding: 10px;
  overflow-x: auto;
  box-sizing: border-box;
}

compare-diff-item-content .text {
  font-family: var(--code-font);
  white-space: pre;
}

compare-diff-item-content img,
compare-diff-item-content video,
compare-diff-item-content audio {
  max-width: 100%;
}
`
export default cssStr