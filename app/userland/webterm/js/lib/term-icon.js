customElements.define('term-icon', class extends HTMLElement {
  connectedCallback () {
    this.render()
  }

  render () {
    const icon = this.getAttribute('icon')
    const span = document.createElement('span')
    if (this.hasAttribute('solid')) {
      span.classList.add('fas')
    } else {
      span.classList.add('far')
    }
    if (this.hasAttribute('fw')) {
      span.classList.add('fa-fw')
    }
    span.classList.add(`fa-${icon}`)
    this.append(span)
  }
})