var fs = require('fs');
var readFilesByExt = require('./fs').readFilesByExt;
var gcin = require('./gcin');
var po = require('./po');


/**
 * Options: {
 *   dir: string, // Directory of gcin files
 *   output: string // Path to po file
 * }
 */
module.exports = function(options, callback) {
  try{
    readFilesByExt(options.dir, 'gcin', function(files) {
      var docs = [];
      files.forEach(function(file) {
        docs.push(gcin.parse(file.data));
      });

      fs.writeFile(options.output, po.create(docs), function (err) {
        callback(err, null);
      });
    });
  } catch(e) {
    callback(e, null);
  }
};
