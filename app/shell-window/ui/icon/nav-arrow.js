import * as svg from '../../../lib/fg/svg'

export default function render () {
  // TODO
  // this was replaced with svg.create() for performance
  // keeping this commented for reference
  // -prf
  // return svg.render(`
  //   <svg class="icon nav-arrow" width="9px" height="16px" viewBox="0 0 9 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  //     <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linejoin="round">
  //       <polyline id="nav-arrow" stroke="#000000" stroke-width="2" transform="translate(4.500000, 8.000000) scale(-1, 1) translate(-4.500000, -8.000000) " points="8 1 1 8 8 15"/>
  //     </g>
  //   </svg>
  // `)
  return svg.create('#svg-nav-arrow', {
    cls: 'icon nav-arrow',
    width: 9,
    height: 16,
    viewBox: '0 0 9 16'
  })
}
