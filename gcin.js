var XRegExp = require('xregexp');
var Message = require('./message');

var SOURCE_REG_EXP = '<%\\s*@source\\s+(.+?)\\s*%>';
var PATCH_REG_EXP = '<%\\s*@patch\\s+(.+?)\\s*%>';
var NS_REG_EXP = '<%\\s*@namespace\\s+(.+?)\\s*%>';
var ID_REG_EXP = '<%\\s*@id\\s+(.+?)\\s*%>';
var MSG_REG_EXP = '<%\\s*@(?<type>msg|msgf)\\s+(?<id>[a-zA-Z0-9_]+)' +
                    '(\\s+"(?<mean>(\\s|\\S)+?)")?' +
                    '(\\s+"(?<desc>(\\s|\\S)+?)")?' +
                  '\\s*{(?<body>(\\s|\\S)+?)}\\s*%>';

var parse = function(data) {
  var doc = {};

  var headData = data;
  var msgStart = data.indexOf('@msg');
  if (msgStart != -1) {
    headData = data.substr(0, msgStart);
  }

  var source = XRegExp.exec(headData, new XRegExp(SOURCE_REG_EXP));
  if (source) {
    doc.source = source[1];
  }

  var ns = XRegExp.exec(headData, new XRegExp(NS_REG_EXP));
  if (ns) {
    doc.ns = ns[1];
  }

  var patch = XRegExp.exec(headData, new XRegExp(PATCH_REG_EXP));
  if (patch) {
    doc.patch = patch[1];
  }

  var id = XRegExp.exec(headData, new XRegExp(ID_REG_EXP));
  if (id) {
    doc.id = id[1];
  } else {
    doc.id = doc.ns;
  }

  // validation
  if (!doc.ns) {
    throw Error("File has no namespace");
  }
  if (!doc.id) {
    throw Error("File " + doc.ns + " has no id");
  }
  if (!doc.source) {
    throw Error("File " + doc.ns + " has no source");
  }

  doc.msgs = [];
  XRegExp.forEach(data, new XRegExp(MSG_REG_EXP, 'm'), function(match, i) {
    var body = match.body.replace(/^\s+|\s+$/g, '');
    var mean = match.mean;
    var desc = match.desc;
    // no mean
    if (mean && !desc) {
      desc = mean;
      mean = '';
    }

    var msg = new Message(doc.id, match.id, match.type, body);
    msg.setMean(mean);
    msg.setDesc(desc);

    doc.msgs.push(msg);
  }, this);

  return doc;
};

var extendTranslation = function(lang, doc, poMap, strictLangs = [], opt_noTransLabel, opt_noWarnings) {
  doc.msgs.forEach(function(msg) {
    var poMsg = poMap[msg.getUid()];
    msg.setTranslation(lang, poMsg ? poMsg.getTranslation(lang) : '');
  });

  const strict = strictLangs.indexOf(lang) !== -1;
  return doc.msgs.reduce((noTrans, msg) => {
    if (!msg.getTranslation(lang)) {
      var str = 'No "' + lang + '" translation for: ' + msg.toConsoleString() + '\n';
      if (strict) {
        process.stdout.write(`ERROR: ${str}`);
        noTrans.errors.push(str);
      } else if (!opt_noWarnings) {
        process.stdout.write('WARNING! ' + str);
        noTrans.warnings.push(str);
      }
    }
    return noTrans;
  }, {errors: [], warnings: []});
};

module.exports = {
  parse: parse,
  extendTranslation: extendTranslation
};
