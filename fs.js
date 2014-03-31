var exec = require('child_process').exec;
var fs = require('fs');
var async = require('async');
var path = require('path');

var osSep = process.platform === 'win32' ? '\\' : '/';

var readFiles = function(files, callback) {
  async.map(files, fs.readFile, function(err, results) {
    if (err) {
      throw err;
    }

    var ret = [];
    results.forEach(function(buffer, pos) {
      ret.push({
        name: files[pos],
        data: new String(buffer)
      });
    });

    callback(ret);
  });
};

var getFilenamesByExt = function(dir, ext, callback) {
  var cmd = 'find ' + dir + ' -regex ".*\\.' + ext + '"';
  exec(cmd, function(err, stdout, stderr) {
    if (err !== null) {
     throw err;
    }

    var temp = stdout.split('\n');
    if (!temp.length) {
      return;
    }

    var files = [];
    temp.forEach(function(filename) {
      if (filename) {
        files.push(path.resolve(path.normalize(filename)));
      }
    });

    callback(files);
  });
};

var readFilesByExt = function(dir, ext, callback) {
  getFilenamesByExt(dir, ext, function(files) {
    readFiles(files, callback);
  });
};

module.exports = {
  readFiles: readFiles,
  getFilenamesByExt: getFilenamesByExt,
  readFilesByExt: readFilesByExt
};