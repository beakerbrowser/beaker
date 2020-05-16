import {css} from '../../../vendor/lit-element/lit-element.js'

const cssStr = css`
.items {
  display: grid;
  grid-template-columns: repeat(auto-fill, 110px);
  grid-template-rows: repeat(auto-fill, 86px);
  grid-gap: 15px;
  margin: 15px 0;
  width: 100%;
}

.item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px;
}

.item .fa-fw {
  font-size: 40px;
  line-height: 40px;
  margin-bottom: 5px;
}

.item .fa-fw.fa-folder {
  color: var(--file-grid--color-folder);
}

.item .mainicon.fa-fw.fa-hdd {
  color: var(--file-grid--color-drive);
}

.item .fa-fw.fa-layer-group {
  -webkit-text-stroke: 1px var(--file-grid--color-viewfile-outline);
  color: var(--file-grid--color-viewfile);
  font-size: 36px;
}

.item .fa-fw.fa-external-link-alt {
  font-size: 28px;
  color: var(--file-grid--color-goto);
}

.item .fa-fw.fa-file {
  -webkit-text-stroke: 1px var(--file-grid--color-file);
  color: #fff;
  font-size: 36px;
  margin-top: 1px;
  margin-bottom: 4px;
}

.item .name,
.item .author {
  color: var(--file-grid--color-itemname);
  width: 100%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  border-radius: 4px;
}

.item .author {
  color: var(--file-grid--color-itemdrive);
  font-size: 10px;
}

.item .subicon {
  position: absolute;
  top: 22px;
  left: 40px;
  color: rgba(0,0,0,.4);
}

.item .mounticon {
  position: absolute;
  color: #5a5a5a;
  left: 57px;
  top: 16px;
  font-size: 16px;
}

.item .subicon.fa-star {
  top: 19px;
  left: 38px;
}

.item.mount .subicon {
  top: 27px;
  font-size: 9px;
  left: 36px;
}

.item.selected {
}

.item.selected .fa-fw {
  background: var(--file-grid--color-selected-bg-icon);
  border-radius: 4px;
}

.item.selected .name {
  background: var(--file-grid--color-selected-bg);
  color: var(--file-grid--color-selected-fg);
}

`
export default cssStr