import * as svg from '../../lib/svg'

export default function render () {
  return svg.render(`
    <svg class="icon avatar" width="130px" height="138px" viewBox="0 0 130 138" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="avatar" transform="translate(5.000000, 4.000000)" stroke="#000000" stroke-width="10" stroke-linejoin="round">
          <path d="M0.728126409,130 C5.22888807,104.503085 30.0521499,85 60,85 C89.9478501,85 114.771112,104.503085 119.271874,130 L0.728126409,130 Z"/>
          <path d="M59,68 C86.3945312,68.4726562 89,52.7776815 89,34 C89,15.2223185 75.5685425,0 59,0 C42.4314575,0 29,15.2223185 29,34 C29,52.7776815 31.6054688,67.5273438 59,68 Z"/>
        </g>
      </g>
    </svg>
  `)
}
