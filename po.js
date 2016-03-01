var XRegExp = require('xregexp');
var Message = require('./message');

var create = function(docs) {
  docs = docs instanceof Array ? docs : [docs];
  return docs.map(function(doc, pos) {
    return doc.msgs.map(function(msg, pos) {
      return '#: ' + doc.ns + '\n' +
             msg.toPoString() + '\n';
    }).join('\n');
  }).join('\n');
};

var parse = function(data) {
  var _getMultiStrParam = function(param) {
    return '' +
      '(?!\\\\)(""\\n)?"' +
        '(?<' + param + '>.*?((?!\\\\)"\\n(?!\\\\)".+?)*)' +
      '(?!\\\\)"';
  };

  var MSG_REG_EXP = '(?<comment>(#.+?\\n)*?)' +
                    '(msgctxt ' + _getMultiStrParam('ctx') + '\\n)?' +
                    'msgid ' + _getMultiStrParam('id') + '\\n' +
                    'msgstr ' + _getMultiStrParam('str') + '\\n';

  var FUZZY_REG_EXP = new XRegExp(/(^|\n)#, fuzzy(\n|$)/);

  var doc = {
    msgs: []
  };

  XRegExp.forEach(data, new XRegExp(MSG_REG_EXP, 'm'), function(match, i) {
    var body = _formatMultiLineStr(match.id);
    var ctx = (_formatMultiLineStr(match.ctx) || '');
    var translation = _formatMultiLineStr(match.str);

    if (!ctx) {
      process.stdout.write('FILE INFO:\n' + translation + '\n');
      return;
    }

    var ctxInfo = Message.getInfoByCtxt(ctx);
    var msg = new Message(ctxInfo.docId, ctxInfo.id, ctxInfo.type, body);
    if (translation) {
      msg.setTranslation(translation);
    }

    var fuzzy = match.comment && (FUZZY_REG_EXP.test(match.comment));
    if (fuzzy) {
      process.stdout.write('Skipped (fuzzy): ' + msg.toConsoleString() + '\n');
      return;
    }

    doc.msgs.push(msg);
  }, this);

  return doc;
};

var getMap = function(doc) {
  var map = {};
  doc.msgs.forEach(function(msg) {
    map[msg.getUid()] = msg;
  });
  return map;
};

var _formatMultiLineStr = function(data) {
  if (!data) {
    return null;
  }

  return data
    .replace(/"\n"/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\\n/g, '\\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\t/g, '\\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\\"/g, '"');
};

module.exports = {
  parse: parse,
  create: create,
  getMap: getMap
};
