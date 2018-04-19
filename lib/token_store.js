/**
 * Created by zhangbichao on 16/12/5.
 */

var Redis = require('ioredis');
var Config = require('../config/config.conf');

var redis = new Redis(Config.redis_url);

function get(name, callback) {
  redis.get(name, function (err, result) {

    if (err) {
      return callback(err);
    }

    callback(null, result);
  });
}

function save(name, token, callback) {
  redis.multi().set(name, token).get(name).exec(function (err, results) {

    if (err) {
      return callback(err);
    }

    callback(null, results[1]);
  });
}


function getApiToken(appid, callback) {

  var name = appid + '_api';
  get(name, callback)
}

function saveApiToken(appid, token, callback) {

  var name = appid + '_api';
  save(name, token, callback)
}

function getJsTicket(appid, callback) {
  var name = appid + '_js';
  get(name, callback)
}

function saveJsTicket(appid, token, callback) {
  var name = appid + '_js';
  save(name, token, callback)
}

function getOauthToken(appid, openid, callback) {

  var name = 'web_oauth_' + appid + '_' + openid;
  get(name, callback)
}

function saveOauthToken(appid, openid, token, callback) {
  var name = 'web_oauth_' + appid + '_' + openid;
  save(name, token, callback)
}


var redis_conf = {
  client: redis,
  getApiToken: getApiToken,
  saveApiToken: saveApiToken,
  getJsTicket: getJsTicket,
  saveJsTicket: saveJsTicket,
  getOauthToken: getOauthToken,
  saveOauthToken: saveOauthToken
};


module.exports = redis_conf;

