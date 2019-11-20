import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`

:host {
  --color-drive: #ccd;
  --color-folder: #9ec2e0;
  --color-file: #9a9aab;
  --color-goto: #9a9aab;
  --color-subicon: #556;
  --color-itemname: #333;
  --color-itemprop: #777;
  --color-viewfile: #ffffff;
  --color-viewfile-outline: #95959c;
  --color-hover-bg: #f3f3f8;
  --color-subicon-selected: #fff;
  --color-itemname-selected: #fff;
  --color-itemprop-selected: rgba(255, 255, 255, 0.7);
  --color-selected-bg: #4379e4;
}

h4 {
  border-top: 1px solid #e3e3ee;
  color: #b0b0bc;
  padding-top: 6px;
  padding-left: 4px;
  margin: 0;
}

.empty {
  background: var(--bg-color--light);
  padding: 40px;
  margin: 14px 0;
  border-radius: 8px;
  color: #667;
}

.list {
  margin: 5px 0 15px;
  width: 100%;
  user-select: none;
}

.item {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px;
  letter-spacing: -0.2px;
}

.item > * {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: var(--color-itemprop);
}

.item .icon {
  position: relative;
  overflow: initial;
  font-size: 18px;
  line-height: 18px;
  width: 30px;
}

.item .icon .mainicon {
  width: 24px;
}

.item .fa-fw.fa-folder {
  color: var(--color-folder);
}

.item .fa-fw.fa-hdd {
  color: var(--color-drive);
}

.item .fa-fw.fa-layer-group {
  -webkit-text-stroke: 1px var(--color-viewfile-outline);
  color: var(--color-viewfile);
}

.item .fa-fw.fa-file {
  -webkit-text-stroke: 1px var(--color-file);
  color: #fff;
}

.item .fa-fw.fa-external-link-alt {
  color: var(--color-goto);
  font-size: 13px;
}

.item .subicon {
  color: var(--color-subicon);
  font-size: 10px;
  position: absolute;
  left: 0;
  bottom: 0;
}

.item .subicon.fa-rss {
  left: -1px;
}

.item .author {
  width: 100px;
}

.item .name {
  color: var(--color-itemname);
  flex: 1;
}

.item .date {
  width: 160px;
}

.item .date span {
  opacity: 0.75;
}

.item .size {
  width: 100px;
  text-align: right;
}

.item.selected {
  background: var(--color-selected-bg);
}

.item.selected > * {
  color: var(--color-itemprop-selected);
}

.item.selected .name {
  color: var(--color-itemname-selected);
}

.item.selected .fa-fw {
  text-shadow: 0 1px 2px rgba(0,0,0,.4);
  -webkit-text-stroke: 0;
}

.item.selected .subicon {
  color: var(--color-subicon-selected);
}

`
export default cssStr