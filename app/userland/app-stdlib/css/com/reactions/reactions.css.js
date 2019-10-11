import {css} from '../../../vendor/lit-element/lit-element.js'
import tooltipcss from '../../tooltip.css.js'
const cssStr = css`
${tooltipcss}

.reaction {
  margin: 2px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.reaction[data-tooltip]::before {
  top: 24px;
}

.reaction[data-tooltip]::after {
  top: 20px;
}

.reaction .label {
  display: inline-block;
  border-right: 0;
  padding: 2px 6px 2px 6px;
}

.reaction .count {
  display: inline-block;
  border-left: 1px solid #eee;
  font-variant: tabular-nums;
  border-radius: 4px;
  padding: 1px 3px 1px 2px;
  margin-left: -5px;
  background: #eee;
  font-weight: 500;
}

.reaction:hover {
  background: #eeeef5;
}

.reaction.pressed {
  background: #eaeaf3;
  color: #666;
}

.reaction.pressed .count {
  background: transparent;
  border-radius: 0;
  border-left: 1px solid #ccc;
}

.reaction.pressed:hover {
  background: #d5d5d5;
}

.other {
  padding: 4px 6px;
  font-size: 9px;
}

`
export default cssStr
