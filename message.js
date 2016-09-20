var crypto = require('crypto');
var messageFormat = require('./messageformat');

var Message = function(docId, id, type, body) {
  this.id = id;
  this.type = type;
  this.docId = docId;
  this.body = body || '';
  this.mean = '';
  this.desc = '';
  this.translations = {};

  this._poMsgCtxt = '';
  this._poMsgId = '';
  this._uid = '';
};

Message.MSG_FORMATTED_PREFIX = 'HAS FORMATTER,';

Message.CTXT_SEPARATOR = ' ';

Message.Type = {
  MSG: 'msg',
  MSG_FORMATTED: 'msgf'
};

Message.getInfoByCtxt = function(ctxt) {
  var arr = ctxt.split(Message.CTXT_SEPARATOR);
  if (arr.length < 2) {
    throw Error('Wrong ctxt format: ' + ctxt);
  }

  var type = Message.Type.MSG;
  if (ctxt.indexOf(Message.MSG_FORMATTED_PREFIX) === 0) {
    type = Message.Type.MSG_FORMATTED;
  }
  return {
    id: arr[arr.length - 1],
    docId: arr[arr.length - 2],
    type: type
  };
};

Message.prototype.getFunctionName = function() {
  return this.docId + '.' + this.id;
};

Message.prototype.getTranslation = function(lang) {
  return this.translations[lang] || '';
};

Message.prototype.setTranslation = function(lang, translation) {
  this.translations[lang] = translation || '';
};

Message.prototype.setMean = function(mean) {
  this.mean = mean || '';
};

Message.prototype.setDesc = function(desc) {
  this.desc = desc || '';
};

Message.prototype.getUid = function() {
  if (!this._uid) {
    this._uid = [
      this.type,
      this.docId,
      this.id,
      crypto.createHash('md5').update(this.body).digest("hex")
    ].join('-');
  }
  return this._uid;
};

Message.prototype.getPoMsgCtxt = function() {
  if (!this._poMsgCtxt) {
    var data = [];
    if (this.type === Message.Type.MSG_FORMATTED) {
      data.push(Message.MSG_FORMATTED_PREFIX);
    }
    if (this.docId) {
      data.push(this.docId);
    }
    data.push(this.id);
    this._poMsgCtxt = data.join(Message.CTXT_SEPARATOR);
  }
  return this._poMsgCtxt;
};

Message.prototype.getPoMsgId = function() {
  if (!this._poMsgId) {
    var data = [];
    var body = this.body.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    if (body.indexOf('\n') != -1) {
      this._poMsgId = '"\n"' + body.replace(/\n/g, '\\n"\n"');
    } else {
      this._poMsgId = body;
    }
  }
  return this._poMsgId;
};


Message.prototype.getJsTranslation = function(lang) {
  return this._getJsString(this.getTranslation(lang), lang);
};

Message.prototype.getJsBody = function(lang) {
  return this._getJsString(this.body, lang);
};

Message.prototype._getJsString = function(str, lang) {
  str = str.replace(/\<%\s*@space\s*%\>/g, ' ');

  if (this.type == Message.Type.MSG) {
    return str;
  }

  if (this.type == Message.Type.MSG_FORMATTED) {
    str = str.replace(/\n\s*/g, '');
    try {
      var mf = messageFormat(str.replace(/\{\$(.+?)\}/g, 'REPLACEMENT'), lang);
    } catch(err) {
      console.log('Failed message format parsing \n' +
          'id: ' + this.toConsoleString() + '\n' + 'lang: ' + lang);
      throw err;
    }
    return str;
  }

  throw new Error('Undefined message type');
};

Message.prototype.toConsoleString = function() {
  var body = this.body || '';
  if (body.length > 20) {
    body = body.substr(0, 17).replace(/\n/g, '\\n') + '...';
  }
  if (body) {
    body = ' <' + body + '>';
  }
  return this.getFunctionName() + body;
};

Message.prototype.toPoString = function(lang) {
  var ret = [];
  if (this.desc) {
    ret.push('#. ' + this.desc);
  }
  if (this.mean) {
    ret.push('#. ' + this.mean);
  }

  ret.push('msgctxt "' + this.getPoMsgCtxt() + '"');
  ret.push('msgid "' + this.getPoMsgId() + '"');
  ret.push('msgstr "' + this.getTranslation(lang) + '"');
  return ret.join('\n');
};

module.exports = Message;
