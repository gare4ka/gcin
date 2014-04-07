var XRegExp = require('xregexp').XRegExp;

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

  doc.msgs = [];
  XRegExp.forEach(data, new XRegExp(MSG_REG_EXP, 'm'), function(match, i) {
    var msg = {
      id: match.id,
      type: match.type,
      body: match.body.replace(/^\s+|\s+$/g, '')
    };

    var hasMean = !!match.mean && !!match.desc;
    if (hasMean) {
      msg.mean = match.mean;
      msg.desc = match.desc;
    } else if (match.mean) {
      msg.desc = match.mean;
    }

    doc.msgs.push(msg);
  }, this);

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

  return doc;
};

var extendTranslation = function(doc, poMap, opt_noTransLabel) {
  doc.msgs.forEach(function(msg) {
    var id = (doc.id ? doc.id + ' ' : '') + msg.id;
    if (!poMap[id]) {
      return;
    }
    msg.translation = poMap[id].str;
  });

  doc.msgs.forEach(function(msg) {
    if (!msg.translation) {
      msg.translation = opt_noTransLabel ? opt_noTransLabel : msg.body;
      process.stdout.write('WARNING! Message ' + msg.id + ' (' + doc.ns + ') has no translation.\n');
    }
  });
};

module.exports = {
  parse: parse,
  extendTranslation: extendTranslation
};
