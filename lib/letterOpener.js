module.exports = letterOpener

var _ = require('lodash')
var async = require('async')
var express = require('express')
var fs = require('fs')
var lessMiddleware = require('less-middleware')
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

    function iterator(memo, f, next) {
      if (f === '.gitkeep') return next(null, memo)

      fs.stat(path.resolve(config.storageDir, f), function statDone(err, stat) {
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

function findMessage(id, cb) {
  fs.readFile(path.join(config.storageDir, id), 'utf8', function(err, message) {
    if (err && err.code === 'ENOENT') return cb()
    return cb(err, message)
  })
}

// Express stuff
// Configure less
var lessMiddlewareOptions = {
      dest: path.resolve(__dirname, '..', 'public')
    , relativeUrls: true
    , force: true
    , once: false
    , debug: true
    , preprocess: {
        path: function(pathname,req) {
          return pathname.replace('/css', '')
        }
      }
    , parser: {dumpLineNumbers: 'mediaquery'}
    , compiler: {compress: false}
}

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

, show: function(req, res, next) {
    var context = _.clone(locals)
    context.messages = req.messageFiles
    context.message = req.message
    context.id = req.id
    
    console.log(context)
    var resBody = jade.renderFile(templatePath('show.jade'), context)

    res.send(resBody)
  }

, _500: function (err, req, res, next) {
    var context = _.clone(locals)
    context.message = err.message
    context.stack = err.stack

    var resBody = jade.renderFile(templatePath('500.jade'), context)

    res.send(500, resBody)
  }
}

function findAllMessagesMiddleware(req, res, next) {
  findAllMessages(function allMessages(err, messageFiles) {
    if (err) return next(err)

    req.messageFiles = messageFiles

    next()
  })
}

function loadMessage(req, res, next, id) {
  findMessage(id, function gotMessage(err, message) {
    if (err) return next(err)
    if (!message) return next(new Error('not found'))

    req.message = {id: id, payload: message}
    next()
  })
}

function expressEngine(root) {
  var router = express.Router()

  locals.root = root

  router.use(lessMiddleware(path.resolve(__dirname, '..', 'stylesheets'), lessMiddlewareOptions))
  router.use(express.static(path.resolve(__dirname, '..', 'public')))

  router.route('/')
    .get(findAllMessagesMiddleware, ExpressEndpoints.index)


  router.param('id', loadMessage)
  router.route('/:id')
    .get(findAllMessagesMiddleware, ExpressEndpoints.show)

  router.use(ExpressEndpoints._500)

  return router
}

