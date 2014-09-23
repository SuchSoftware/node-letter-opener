module.exports = letterOpener

var _ = require('lodash')
var express = require('express')
var fs = require('fs')
var jade = require('jade')
var path = require('path')

var config = {}
var packageJson = require('../package')
var viewsDir = path.resolve(__dirname, '..', 'views')

function letterOpener(storageDir) {
  config.storageDir = storageDir

  return {
    expressEngine: expressEngine
  }
}

function findAllMessages(cb) {
  fs.readdir(config.storageDir, function(err, files) {
    if (err) return cb(err)

    files.sort(function(a, b) {
      fs.statSync(path.resolve(config.storageDir, a)).mtime.getTime() - fs.statSync(path.resolve(config.storageDir,  b)).mtime.getTime()
    })

    cb(null, files)
  })
}

// Express stuff
var locals = {}
locals.version = packageJson.version

function templatePath(template) {
  return path.resolve(viewsDir, template)
}

var ExpressEndpoints = {
  index: function(req, res, next) {
    var context = _.clone(locals)
    context.messages = req.messageFiles
    
    var resBody = jade.renderFile(templatePath('index.jade'), context)

    res.send(resBody)
  }

, _500: function (err, req, res, next) {
    var context = _.clone(locals)
    context.message = err.message
    context.stack = err.stack

    var resBody = jade.renderFile(templatePath('500.jade'), context)

    res.status(500).send(resBody)
  }
}

function findAllMessagesMiddleware(req, res, next) {
  findAllMessages(function allMessages(err, messageFiles) {
    if (err) return next(err)

    req.messageFiles = messageFiles

    next()
  })
}

function expressEngine(root) {
  var router = express.Router()

  locals.root = root

  router.route('/')
    .get(findAllMessagesMiddleware, ExpressEndpoints.index)

  router.use(ExpressEndpoints._500)

  return router
}

