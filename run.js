var logging = require('logref')
var async = require('async')
var _ = require('underscore')
var request = require('request').defaults({json: true})
var couchapp = require('couchapp')
var recline = require('./recline')
var defaults = require('./service/defaults')()

logging.stdout()
process.logging = logging


function provision(callback) {
  var permissions = {"admins":{"names":[],"roles":[]},"members":{"names":[],"roles":["_admin"]}};
  var requiredDatabases = ['datacouch', 'datacouch-sessions', 'datacouch-users', 'datacouch-apps']
  
  var requests = _.map(requiredDatabases, function(db) {
    return function(cb) {
      request({method: "PUT", url: defaults.couchurl + db}, function(err, resp, body) {
        if (err) return cb(err)
        request({uri: defaults.couchurl + db + "/_security", method: "PUT", body: permissions}, cb)
      })
    }
  })

  async.parallel(requests, function(err) {
    if (err) return callback(err)
    callback()
  })
}

function pushCouchapp(app, target, callback) {
  couchapp.createApp(app, target, function (capp) {
    capp.push(function(resp) { callback(false, resp) })
  })
}

console.log("reticulating splines...")
provision(function(err) {
  if (err) return console.error(err)
  pushCouchapp(recline, defaults.couchurl + "datacouch-apps", function() {
    var t = require('./service')()
    t.httpServer.listen(t.port, function () {
      console.log("running on localhost:" + t.port)
    })
  })
})

