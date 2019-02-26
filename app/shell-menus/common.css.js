import {css} from '../vendor/lit-element/lit-element'

export default css`
.section {
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}

.menu-item {
  display: flex;
}

.menu-item {
  align-items: center;
  height: 25px;
  padding: 0 15px;
  cursor: default;
}

.menu-item:hover {
  background: #eee;
}

.menu-item i {
  color: rgba(51, 51, 51, 0.97);
  width: 28px;
  font-size: 14px;
  padding-right: 5px;
  text-align: center;
  margin-left: -5px;
}

.header {
  position: relative;
  border-bottom: 1px solid #eee;
  width: 100%;
  height: 35px;
  line-height: 35px;
  text-align: center;
}

.header h2 {
  font-size: 12.5px;
  margin: 0;
}

.header .btn {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 27px;
  height: 27px;
  border: 0;
  background: transparent;
  border-radius: 4px;
}

.header .btn i {
  font-size: 18px;
  color: #333;
  line-height: 27px;
}

.header .btn:focus {
  outline: 0;
}

.header .btn:hover {
  background: #eee;
}
`