import {css} from '../../../vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
  position: absolute;
  top: 80px;
  left: 50px;
  width: 250px;
  height: 320px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(0,0,0,.1);
  border-radius: 8px;
  border: 1px solid #c6cddc;
  z-index: 100;
}

.header {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #d7dfef;
  background: #f7f9fd;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  color: #636467;
}

.title {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
}

.skin-tones span {
  display: inline-block;
  position: relative;
  cursor: pointer;
}

.skin-tones span.current:after {
  content: '✔';
  position: absolute;
  z-index: 1;
  left: 3px;
  top: 2px;
  color: #fff;
  text-shadow: 1px 1px 0px rgba(0,0,0,.5);
}

.skin-tones span.current.option-0:after {
  left: 2px;
  top: 1px;
}

.skin-tones .none {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 1px solid #fff;
  outline: 1px solid #ddd;
  background: #f3cf1c;
  position: relative;
  top: 2px;
  margin-right: 2px;
}

.inner {
  max-height: 275px;
  overflow-x: hidden;
  overflow-y: auto;
}

.heading {
  padding: 6px 12px;
  font-size: 14px;
  color: #8892a7;
  margin-top: 8px;
  font-weight: 500;
}

.list {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  width: 200px;
  margin: 0 10px 10px;
}

.list span {
  text-align: center;
  width: 30px;
  padding: 4px 0;
  font-size: 15px;
}

.list span:hover {
  cursor: pointer;
  background: #eee;
}
`
export default cssStr
