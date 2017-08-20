import * as yo from 'yo-yo'
import * as svg from '../../lib/fg/svg'

export default function render () {
  return svg.render(`
    <svg class="icon avatar" width="120px" height="132px" viewBox="0 0 120 132" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="avatar" fill="#ABB0B6">
          <path d="M0.728126409,132 C5.22888807,101.403702 30.0521499,78 60,78 C89.9478501,78 114.771112,101.403702 119.271874,132 L0.728126409,132 Z"/>
          <path d="M59,68 C86.3945312,68.4726562 89,52.7776815 89,34 C89,15.2223185 75.5685425,0 59,0 C42.4314575,0 29,15.2223185 29,34 C29,52.7776815 31.6054688,67.5273438 59,68 Z"/>
        </g>
      </g>
    </svg>
  `)
}
