import * as svg from '../../lib/svg'

export default function render () {
  return svg.render(`
    <svg class="icon star-fill" width="32px" height="30px" viewBox="0 0 32 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linejoin="round">
            <polygon id="star-fill" stroke="#000000" stroke-width="2" fill="#000000" points="16 23.5 7.18322122 28.1352549 8.86707613 18.3176275 1.73415226 11.3647451 11.5916106 9.93237254 16 1 20.4083894 9.93237254 30.2658477 11.3647451 23.1329239 18.3176275 24.8167788 28.1352549"/>
        </g>
    </svg>
  `)
}
