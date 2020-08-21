/**
 * https://github.com/frysztak/quill-delta-to-markdown/blob/master/src/utils/URL.js
 */

const encodeLink = (link) =>
  encodeURI(link)
    .replace(/\(/i, "%28")
    .replace(/\)/i, "%29")

var idCounter = 0

class Node {
  constructor (data) {
    this.id = ++idCounter
    if (Array.isArray(data)) {
      this.open = data[0]
      this.close = data[1]
    } else if (typeof data === 'string') {
      this.text = data
    }
    this.parent = undefined
    this.children = []
  }

  append (e) {
    if (!(e instanceof Node)) {
      e = new Node(e)
    }
    if (e.parent) {
      e.parent.children = e.parent.children.filter(child => child !== e)
    }
    e.parent = this
    this.children = this.children.concat(e)
  }

  render () {
    var text = ''
    if (this.open) {
      text += this.open
    }
    if (this.text) {
      text += this.text
    }
    for (var i = 0; i < this.children.length; i++) {
      text += this.children[i].render()
    }
    if (this.close) {
      text += this.close
    }
    return text
  }
}

const converters = {
  embed: {
    image: function(src) {
      this.append('![image](' + encodeLink(src) + ')');
    },
    mention: function(mention) {
      this.append(`[${mention.denotationChar}${mention.value}](${mention.id})`);
    }
  },

  inline: {
    italic: function() {
      return ['_', '_'];
    },
    bold: function() {
      return ['**', '**'];
    },
    strike: function() {
      return ['~~', '~~'];
    },
    link: function(url) {
      return ['[', '](' + url + ')'];
    },
  },

  block: {
    header: function({header}) {
      this.open = '#'.repeat(header) + ' ' + this.open;
    },
    blockquote: function() {
      this.open = '> ' + this.open;
    },
    list: {
      group: function() {
        return new Node(['', '\n']);
      },
      line: function(attrs, group) {
        if (attrs.list === 'bullet') {
          this.open = '- ' + this.open;
        } else if (attrs.list === "checked") {
          this.open = '- [x] ' + this.open;
        } else if (attrs.list === "unchecked") {
          this.open = '- [ ] ' + this.open;
        } else if (attrs.list === 'ordered') {
          group.count = group.count || 0;
          var count = ++group.count;
          this.open = count + '. ' + this.open;
        }
      },
    }
  },
}

export function deltaToMarkdown (ops) {
  var str = convert(ops).render().trim()

  // HACK strip out any run of newlines
  while (str.includes('\n\n\n')) {
    str = str.replace('\n\n\n', '\n\n')
  }

  return str
};

function convert (ops) {
  var group, line, el, activeInline, beginningOfLine;
  var root = new Node();

  function newLine (paragraph) {
    el = line = new Node(['', paragraph ? '\n\n' : '\n']);
    root.append(line);
    activeInline = {};
  }
  newLine();

  for (var i = 0; i < ops.length; i++) {
    var op = ops[i];

    if (typeof op.insert === 'object') {
      for (var k in op.insert) {
        if (converters.embed[k]) {
          applyInlineAttributes(op.attributes);
          converters.embed[k].call(el, op.insert[k], op.attributes);
        }
      }
    } else {
      var lines = op.insert.split('\n');

      if (hasBlockLevelAttribute(op.attributes, converters)) {
        // Some line-level styling (ie headings) is applied by inserting a \n
        // with the style; the style applies back to the previous \n.
        // There *should* only be one style in an insert operation.

        for (var j = 1; j < lines.length; j++) {
          for (var attr in op.attributes) {
            if (converters.block[attr]) {
              var fn = converters.block[attr];
              if (typeof fn === 'object') {
                if (group && group.type !== attr) {
                  group = null;
                }
                if (!group && fn.group) {
                  group = {
                    el: fn.group(),
                    type: attr,
                    value: op.attributes[k],
                    distance: 0,
                  };
                  root.append(group.el);
                }

                if (group) {
                  group.el.append(line);
                  group.distance = 0;
                }
                fn = fn.line;
              }

              fn.call(line, op.attributes, group);
              newLine(attr !== 'list');
              break
            }
          }
        }
        beginningOfLine = true;
      } else {
        for (var l = 0; l < lines.length; l++) {
          if ((l > 0 || beginningOfLine) && group && ++group.distance >= 2) {
            group = null;
          }
          applyInlineAttributes(op.attributes, ops[i + 1] && ops[i + 1].attributes);
          el.append(lines[l]);
          if (l < lines.length - 1) {
            newLine();
          }
        }
        beginningOfLine = false;
      }
    }
  }

  return root;

  function applyInlineAttributes(attrs, next) {
    var first = [],
      then = [];
    attrs = attrs || {};

    var tag = el,
      seen = {};
    while (tag._format) {
      seen[tag._format] = true;
      if (!attrs[tag._format]) {
        for (var k in seen) {
          delete activeInline[k]
        }
        el = tag.parent
      }

      tag = tag.parent
    }

    for (var attr in attrs) {
      if (converters.inline[attr]) {
        if (activeInline[attr]) {
          if (activeInline[attr] === attrs[attr]) {
            continue; // do nothing -- we should already be inside this style's tag
          }
        }

        if (next && attrs[attr] === next[attr]) {
          first.push(attr); // if the next operation has the same style, this should be the outermost tag
        } else {
          then.push(attr);
        }
        activeInline[attr] = attrs[attr];
      }
    }

    first.forEach(apply);
    then.forEach(apply);

    function apply(fmt) {
      var newEl = converters.inline[fmt].call(null, attrs[fmt]);
      if (Array.isArray(newEl)) {
        newEl = new Node(newEl);
      }
      newEl._format = fmt;
      el.append(newEl);
      el = newEl;
    }
  }
}

function hasBlockLevelAttribute(attrs, converters) {
  for (var k in attrs) {
    if (Object.keys(converters.block).includes(k)) {
      return true
    }
  }
  return false
}

// HACK
// https://github.com/quilljs/quill/issues/3066
// Quill 2.0 removed the formats allowlist for some reason
// this restores that functionality
// -prf
export function quillFormatsHackfix (Quill, formats) {
  const BuiltinScroll = Quill.import('blots/scroll');
  class Scroll extends BuiltinScroll {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    formatAt(index, length, format, value) {
      if (!formats.includes(format)) return;
      super.formatAt(index, length, format, value);
      this.optimize();
    }
  }
  Quill.register('blots/scroll', Scroll, /*overwrite*/ true);
}