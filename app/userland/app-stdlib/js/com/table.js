import {LitElement, html} from '../../vendor/lit-element/lit-element.js'
import {classMap} from '../../vendor/lit-element/lit-html/directives/class-map.js'
import {styleMap} from '../../vendor/lit-element/lit-html/directives/style-map.js'
import {repeat} from '../../vendor/lit-element/lit-html/directives/repeat.js'
import tableCSS from '../../css/com/table.css.js'

/**
 * @typedef {Object} ColumnDef
 * @property {string} id
 * @property {string=} label
 * @property {number=} flex
 * @property {number=} width
 * @property {string=} renderer
 */

export class Table extends LitElement {
  static get properties () {
    return {
      rows: {type: Array}
    }
  }

  /**
   * @type ColumnDef[]
   */
  get columns () {
    // this should be overridden by subclasses
    return [
      {id: 'example', label: 'Example', flex: 1},
      {id: 'column2', label: 'Column2', width: 150}
    ]
  }

  get hasHeadingLabels () {
    return !!this.columns.find(col => !!col.label)
  }

  getRowKey (row) {
    // this can be overridden by subclasses
    return row
  }

  getRowHref (row) {
    // this can be overridden by subclasses
    // if a string is returned, the row will become a link
    return false
  }

  isRowSelected (row) {
    // this can be overridden by subclasses
    return false
  }

  sort () {
    // this can be overridden by subclasses
  }

  constructor (opts = {}) {
    super()
    this.rows = []
    this.sortColumn = this.columns[0] ? this.columns[0].id : ''
    this.sortDirection = 'asc'

    if (opts.fontAwesomeCSSUrl) {
      this.fontAwesomeCSSUrl = opts.fontAwesomeCSSUrl
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="${this.fontAwesomeCSSUrl}">
      ${this.hasHeadingLabels
        ? html`
          <div class="heading">
            ${repeat(this.columns, col => this.renderHeadingColumn(col))}
          </div>
        ` : ''}
      <div class="rows" @click=${this.onClickRows}>
        ${repeat(this.rows, row => this.getRowKey(row), row => this.renderRow(row))}
        ${this.rows.length === 0 ? this.renderEmpty() : ''}
      </div>
    `
  }

  getColumnClasses (column) {
    return classMap({
      col: true,
      [column.id]: true,
      stretch: column.stretch
    })
  }

  getColumnStyles (column) {
    const styles = {}
    if (column.width) {
      styles.width = `${column.width}px`
    }
    if (column.flex) {
      styles.flex = column.flex
    }
    return styleMap(styles)
  }

  renderHeadingColumn (column) {
    const cls = this.getColumnClasses(column)
    const styles = this.getColumnStyles(column)
    return html`
      <div class="${cls}" style=${styles}>
        <span @click=${e => this.onClickHeadingColumn(e, column)}>${column.label}</span>
        ${this.renderSortIcon(column)}
      </div>
    `
  }

  renderRow (row) {
    const cls = classMap({
      row: true,
      selected: this.isRowSelected(row)
    })
    const columns = repeat(this.columns, col => this.renderRowColumn(col, row))
    const href = this.getRowHref(row)
    if (href) {
      return html`<a class="${cls}" href="${href}" @click=${e => this.onClickRow(e, row)} @contextmenu=${e => this.onContextmenuRow(e, row)}>${columns}</a>`
    }
    return html`
      <div
        class="${cls}"
        @click=${e => this.onClickRow(e, row)}
        @dblclick=${e => this.onDblclickRow(e, row)}
        @contextmenu=${e => this.onContextmenuRow(e, row)}
      >${columns}</div>`
  }

  renderRowColumn (column, row) {
    const cls = this.getColumnClasses(column)
    const styles = this.getColumnStyles(column)
    var content = (column.renderer) ? this[column.renderer](row) : row[column.id]
    return html`
      <div class="${cls}" style=${styles}>
        ${content}
      </div>
    `
  }

  renderSortIcon (column) {
    if (column.id !== this.sortColumn) {
      return ''
    }
    return html`
      <i class="fa fa-angle-${this.sortDirection === 'asc' ? 'down' : 'up'}"></i>
    `
  }

  renderEmpty () {
    // this can be overridden by subclasses
    return ''
  }

  // events
  // =

  onClickHeadingColumn (e, column) {
    if (this.sortColumn === column.id) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      this.sortColumn = column.id
      this.sortDirection = 'asc'
    }
    this.sort()
  }

  onClickRows (e, row) {
    // this can be overridden by subclasses
  }

  onClickRow (e, row) {
    // this can be overridden by subclasses
  }

  onDblclickRow (e, row) {
    // this can be overridden by subclasses
  }

  onContextmenuRow (e, row) {
    // this can be overridden by subclasses
  }
}
Table.styles = [tableCSS]
