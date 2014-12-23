module.exports = letterOpener

var async = require('async')
var fs = require('fs')
var MailParser = require('mailparser').MailParser
var path = require('path')

var packageJson = require('../package')

function letterOpener(storageDir) {
  this.config = {storageDir: storageDir}
}

letterOpener.prototype = {
  findAllMessages: function findAllMessages(cb) {
    var self = this

    fs.readdir(self.config.storageDir, function(err, files) {
      if (err) return cb(err)

      function iterator(memo, f, next) {
        if (f === '.gitkeep') return next(null, memo)

        fs.stat(path.resolve(self.config.storageDir, f), function statDone(err, stat) {
          stat.name = f
          memo.push(stat)

          next(err, memo)
        })
      }

      function allDone(err, res) {
        // TODO: This probably shouldn't be part of this function, but queries from DBs sort too.  If this ever needs
        // to be configurable, we can break the sort out of here.
        res = res.sort(function(a, b) {
          return b.mtime.getTime() - a.mtime.getTime() // put the newer ones on top
        })

        cb(null, res)
      }

      async.reduce(files, [], iterator, allDone)
    })
  }

, findMessage: function findMessage(id, cb) {
    var self = this

    fs.stat(path.join(self.config.storageDir, id), function statDone(err, stat) {
      if (err && err.code === 'ENOENT') return cb() // Fall on through as a 404

      fs.readFile(path.join(self.config.storageDir, id), 'utf8', function(err, raw) {
        if (err) return cb(err)

        var mailparser = new MailParser()

        mailparser.on('end', function(mail){
          stat.payload = mail
          stat.payload.raw = raw

          cb(null, stat)
        })

        fs.createReadStream(path.join(self.config.storageDir, id)).pipe(mailparser)
      })
    })
  }
}
