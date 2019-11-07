import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`

:host {
  --color-drive: #a9b6bd;
  --color-folder: #9ec2e0;
  --color-file: #9a9aab;
  --color-itemname: #333;
  --color-itemprop: #777;
  --color-viewfile: #ffffff;
  --color-viewfile-outline: #95959c;
  --color-hover-bg: #f3f3f8;
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

.item .fa-fw {
  overflow: initial;
  font-size: 18px;
  line-height: 18px;
  margin-right: 5px;
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

`
export default cssStr