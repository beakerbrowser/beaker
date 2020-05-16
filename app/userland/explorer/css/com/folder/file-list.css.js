import {css} from '../../../vendor/lit-element/lit-element.js'

const cssStr = css`

:host {
}

.items {
  margin: 5px 0 15px;
  width: 100%;
  user-select: none;
}

.item {
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--file-list--item-border-color);
  padding: 4px;
  letter-spacing: -0.2px;
}

.item > * {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: var(--file-list--color-itemprop);
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
  color: var(--file-list--color-folder);
}

.item .mainicon.fa-fw.fa-hdd {
  color: var(--file-list--color-drive);
}

.item .fa-fw.fa-layer-group {
  -webkit-text-stroke: 1px var(--file-list--color-viewfile-outline);
  color: var(--file-list--color-viewfile);
}

.item .fa-fw.fa-file {
  -webkit-text-stroke: 1px var(--file-list--color-file);
  color: #fff;
}

.item .fa-fw.fa-external-link-alt {
  color: var(--file-list--color-goto);
  font-size: 13px;
}

.item .subicon {
  color: var(--file-list--color-subicon);
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
  color: var(--file-list--color-itemname);
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
  background: var(--file-list--color-selected-bg);
}

.item.selected > * {
  color: var(--file-list--color-itemprop-selected);
}

.item.selected .name {
  color: var(--file-list--color-itemname-selected);
}

.item.selected .fa-fw {
  text-shadow: 0 1px 2px rgba(0,0,0,.4);
  -webkit-text-stroke: 0;
}

.item.selected .subicon {
  color: var(--file-list--color-subicon-selected);
}

`
export default cssStr