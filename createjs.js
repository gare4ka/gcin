var fs = require('fs');
var readFilesByExt = require('./fs').readFilesByExt;
var gcin = require('./gcin');
var po = require('./po');
var js = require('./js');
var path = require('path');
var mkdirp = require('mkdirp');
var async = require('async');

var printResult = function(saved, opt_prefix) {
  var ret = opt_prefix ? (opt_prefix + ': saved ') : 'Saved ';
  if (saved.success) {
    ret += saved.success + (saved.success != 1 ? ' files' : ' file');
  }
  if (saved.fail) {
    if (saved.success) {
      ret += ', ';
    }
    ret += 'failed ' + saved.fail + (saved.fail != 1 ? ' files' : ' file');
  }
  process.stdout.write(ret + '\n');
};

var saveFile = function(name, data, callback) {
  var dir = path.dirname(name);
  mkdirp(dir, function(err) {
    if (err) {
      return callback(err);
    }
    fs.writeFile(name + '.js', data, function (err) {
      return callback(err);
    });
  });
};

/**
 * Options: {
 *   self: boolean // Create js in source language
 *   dir: string // Directory of gcin files
 *   po: {lang: string, name: string}|Array.<{lang: string, name: string}>
 *   notranslabel: string //Label for tokens without translation
 *   output: string // Output directory
 *   lang: string // Output language
 *   nsprefix: string // namespace prefix
 *   fallbacks: {Object.<string, Array.<string>>} // ex: {'de': ['en', 'ru']}
 *   nowarnings: Array.<string> // true for disable warnings
 * }
 */
module.exports = function(options, callback) {
  options.fallbacks = options.fallbacks || {};

  var poArray = options.po instanceof Array ? options.po : [options.po];
  readFilesByExt(options.dir, 'gcin', function(files) {
    var waiting = 0;
    var errors = [];
    var saved = {};
    var complete = function(err) {
      waiting--;
      if (err) {
        errors.push(err);
      }
      if (waiting === 0) {
        callback(errors.length > 0 ? errors : null, saved);
      }
    };


    var filesAndPositions = files.map(function(file, pos) {
      return [file, pos];
    });

    var createLang = function(lang, callback) {
      async.eachLimit(filesAndPositions, 10, function(fileAndPos, callback) {
        var file = fileAndPos[0];
        var l = (lang || file.doc.source);
        var pos = fileAndPos[1];
        var jsData = js.create(file.doc, options.nsprefix, lang, pos, options.fallbacks[lang]);
        var name = path.resolve(options.output, 'lang',
            lang || file.doc.source, path.relative(options.dir, file.name));

        saved[l] = saved[l] || {
          fail: 0,
          success: 0
        };

        saveFile(name, jsData, function(err) {
          if (err) {
            saved[l].fail++;
          } else {
            saved[l].success++;
          }
          callback();
        });
      }, callback);
    };

    var docs = {};
    files.forEach(function(file) {
      file.doc = gcin.parse(file.data);
      docs[file.doc.ns] = file.doc;
    });
    files.forEach(function(file) {
      file.doc.docs = docs;
    });

    waiting++; // last step

    var langs = [];
    const failed = {};
    poArray.forEach(function(arg) {
      var data = new String(fs.readFileSync(arg.name));
      var doc = po.parse(arg.lang, data);
      var map = po.getMap(doc);

      files.forEach(function(file) {
        var noWarns = options.nowarnings && options.nowarnings.indexOf(arg.lang) !== -1;
        const fail = gcin.extendTranslation(arg.lang, file.doc, map, options.strict,
            options.notranslabel, noWarns);
        if (fail) {
          failed[arg.lang] = true;
        }
      });

      if (!!failed[arg.lang]) {
        return;
      }

      waiting++;
      createLang(arg.lang, complete);
      langs.push(arg.lang);
    });

    if (Object.keys(failed).length > 0) {
      process.stderr.write(`No translations for strict langs: 
          ${Object.keys(failed).join(', ')}`);
      process.exit(1);
    }

    if (options.self && files.length > 0) {
      createLang();
      langs.push(files[0].doc.source);
    }

    saved.union = {
      fail: 0,
      success: 0
    };

    async.eachLimit(filesAndPositions, 10, function(fileAndPos, callback) {
      var file = fileAndPos[0];
      var pos = fileAndPos[1];
      var jsData = js.createUnion(file.doc, options.nsprefix, langs);
      var name = path.resolve(options.output, path.relative(options.dir, file.name));

      saveFile(name, jsData, function(err) {
        if (err) {
          saved.union.fail++;
        } else {
          saved.union.success++;
        }
        callback();
      });
    }, complete);
  });
};
