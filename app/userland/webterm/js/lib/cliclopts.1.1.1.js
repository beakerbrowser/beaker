/* Copyright Finn Pauls, MIT License
 * https://github.com/finnp/cliclopts
 */

export function Cliclopts (opts) {
  if (!(this instanceof Cliclopts)) {
    return new Cliclopts(opts)
  }
  this.opts = opts || []
  this.indent = '    '
  this.width = 23
}

Cliclopts.prototype.print = function (stream) {
  var output = stream || process.stdout
  output.write(this.usage())
}

Cliclopts.prototype.usage = function () {
  var output = ''

  this.opts
    .filter(function (opt) {
      return opt.help
    })
    .forEach(function (option) {
      output += this.indent

      var helpIndex = option.helpIndex

      if (!helpIndex) {
        helpIndex = '--' + option.name
        if (option.abbr) helpIndex += ', -' + option.abbr
      }
      output += helpIndex

      var offset = 0
      if (helpIndex.length > this.width) {
        output += '\n' + this.indent
      } else {
        offset = helpIndex.length
      }

      output += Array(this.width - offset).join(' ')

      output += option.help
      if (option.hasOwnProperty('default')) {
        output += ' (default: ' + JSON.stringify(option.default) + ')'
      }
      output += '\n'
    }.bind(this))

  return output
}

Cliclopts.prototype.booleans = function () {
  return this.opts
    .filter(function (opt) {
      return opt.boolean
    })
    .map(function (opt) {
      return opt.name
    })
}

Cliclopts.prototype.boolean = Cliclopts.prototype.booleans

Cliclopts.prototype.default = function () {
  var defaults = {}
  this.opts.forEach(function (opt) {
    if ('default' in opt) {
      defaults[opt.name] = opt.default
      if ('abbr' in opt) defaults[opt.abbr] = opt.default
    }
  })
  return defaults
}

Cliclopts.prototype.alias = function () {
  var alias = {}
  this.opts.forEach(function (opt) {
    var build = []
    if ('alias' in opt) {
      if (typeof opt.alias === 'string') build.push(opt.alias)
      else build = build.concat(opt.alias)
    }
    if ('abbr' in opt) build.push(opt.abbr)
    alias[opt.name] = build
  })
  return alias
}

Cliclopts.prototype.options = function () {
  return {
    alias: this.alias(),
    boolean: this.boolean(),
    default: this.default()
  }
}
