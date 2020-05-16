import {css} from '../../../vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
}

.container {
  min-height: calc(100vh - 50px);
}

h4 {
  border-top: 1px solid var(--base-files-view--h4-border-color);
  color: var(--base-files-view--h4-color);
  padding-top: 6px;
  padding-left: 4px;
  margin: 0;
  user-select: none;
}

.empty {
  background: var(--empty-bg);
  padding: 40px;
  margin: 14px 0;
  border-radius: 8px;
  color: var(--empty-color);
}

.items {
  user-select: none;
}

.item {
}

.drag-selector {
  position: fixed;
  background: #5591ff33;
  border: 1px solid #77adffee;
  pointer-events: none;
}

.drag-hover,
.drop-target {
  background: var(--base-files-view--drag-bg) !important;
  outline: rgb(191, 191, 243) dashed 1px;
}

.container.is-dragging .item:not(.folder) * {
  pointer-events: none;
}

.item.drag-hover * {
  pointer-events: none;
}

.drag-ghost {
  position: fixed;
  right: -100%;
}

.readme {
  padding: 10px;
}

:host(.drag-selector-active) .readme {
  user-select: none;
}

`
export default cssStr