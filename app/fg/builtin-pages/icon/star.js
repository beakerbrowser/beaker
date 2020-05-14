import * as svg from '../../lib/svg'

export default function render () {
  return svg.render(`
    <svg class="icon star" width="32px" height="31px" viewBox="0 0 32 31" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-opacity="0.85" stroke-linejoin="round">
        <polygon id="star" stroke="#FFFFFF" stroke-width="2.5" points="16 24.5 7.18322122 29.1352549 8.86707613 19.3176275 1.73415226 12.3647451 11.5916106 10.9323725 16 2 20.4083894 10.9323725 30.2658477 12.3647451 23.1329239 19.3176275 24.8167788 29.1352549"/>
      </g>
    </svg>
  `)
}
