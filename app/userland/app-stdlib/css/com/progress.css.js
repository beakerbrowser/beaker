import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
@keyframes progress-active {
  0% {
    width: 0%;
  }
  50% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

.progress-ui {
  position: relative;
  width: 100%;
  height: 20px;
  border-radius: 2px;
  background: #e0e0e0;
}

.progress-ui .completed {
  position: absolute;
  min-width: 30px;
  height: 100%;
  padding: 0 5px;
  background: #bbb;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.75rem;
  font-weight: 500;
  text-align: right;
  line-height: 20px;
  border-radius: 2px;
}

.progress-ui .label {
  position: absolute;
  width: 100%;
  top: calc(100% + 5px);
  text-align: center;
  font-size: 0.8rem;
}

.progress-ui.active .completed:before {
  position: absolute;
  left: 0;
  display: block;
  content: '';
  z-index: 3;
  height: 100%;
  animation: 3s ease progress-active infinite;
  animation-delay: 1s;
  border-radius: 4px;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.2) 5%, rgba(255, 255, 255, 0.1));
}

.progress-ui.small {
  height: 10px;
}

.progress-ui.blue .completed {
  background: #2864dc;
}

.progress-ui.green .completed {
  background: #44c35a;
}
`
export default cssStr
