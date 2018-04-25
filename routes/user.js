var express = require('express');
var router = express.Router();
var OAuth = require('wechat-oauth');
var Config = require('../config/config.conf');
var TokenStore = require('../lib/token_store');
var uuidv4 = require('uuid/v4');
var request = require('request');

var appid = Config.account_info.AppID;
var appsecret = Config.account_info.AppSecret;

var client = new OAuth(appid, appsecret, function (openid, callback) {
  TokenStore.getOauthToken(appid, openid, function (err, result) {
    if (err) {
      return callback(err);
    }
    callback(null, JSON.parse(result));
  });
}, function (openid, token, callback) {
  TokenStore.saveOauthToken(appid, openid, JSON.stringify(token), function (err, result) {
    if (err) return callback(err);

    callback(null)
  });
});

router.get('/login', function (req, res, next) {

  var user = req.session.user;
  var req_url = req.session.user.url;
  console.log('login user')

  var code = req.query.code;
  var state = req.query.state;

  if (!code || !state) return res.send('no code or no state');

  if (state !== user.state) return res.send('无效的state');

  //根据code获取openid
  client.getAccessToken(code, function (err, result) {
    if (err) {
      console.dir(err);
      return res.render('error', {error: err});
    }
    console.dir(result);
    var openid = result.data.openid;
    // var unionid = result.data.unionid;

    //type + openid 查询user_id,判断是否为新用户
    request.get({
      url: 'http://tuser.hundun.cn/user/get_user_by_openid',
      qs: {
        openid: 'orOxFxFJjKyQaKR8tLWAhCXXCarU',
        type: 'h5wx'
      },
      json: true
    }, function (e, r, result) {
      if (e) {
        console.error('/get_user_by_openid:', e);
        return res.render('error', {error: e});
      }

      var is_new = true;

      if (result.error_no === 0 && result.data && result.data.uid) {
        is_new = false;
      }

      if (true) {
        var STATE = uuidv4();
        var REDIRECT_URI = req.protocol + '://' + req.get('host') + '/user/auth';
        req.session.user = {
          state: STATE,
          url: req_url
        };
        var url = client.getAuthorizeURL(REDIRECT_URI, STATE, 'snsapi_userinfo');
        return res.redirect(url)

      } else {
        var user_id = result.data.uid;

        req.session.user = {
          openid: openid,
          // unionid: unionid,
          user_id: user_id
        };
        res.cookie('user_id', user_id);
        res.redirect(req.protocol + '://' + req.get('host') + req_url)
      }
    })
  })
});

router.get('/auth', function (req, res, next) {
  var user = req.session.user;
  var req_url = req.session.user.url;
  console.log('auth user')

  var code = req.query.code;
  var state = req.query.state;

  if (!code || !state) return res.send('no code or no state');

  if (state !== user.state) {
    //state已使用过或者可能存在csrf攻击
    return res.send('无效的state');
  }

  //根据code获取openid和access_token
  client.getAccessToken(code, function (err, result) {
    if (err) {
      console.dir(err);
      return res.render('error', {error: err});
    }
    console.log("获取openid 和 access_token")
    var openid = result.data.openid;
    // var unionid = result.data.unionid;

    //根据access_token和openid获取用户基本信息
    client.getUser(openid, function (err, result) {
      if (err) {
        console.log("client.getUser 出错")
        console.error(err)
        return res.render('error', {error: err});
      }
      var userInfo = result;
      console.dir(userInfo)

      //第三方登录
      request.post({
        url: 'https://tuser.hundun.cn/thirdparty_login',
        json: {
          "type": "h5wx",
          "openid": "orOxFxFJjKyQaKR8tLWAhCXXCarU",
          "unionid": "oxVgRwC5mh6mUdr0PwhGrkgXZinU",
          "head_img": userInfo.headimgurl,
          "nickname": userInfo.nickname,
          "channel": "h5"
        }
      }, function (e, r, result) {
        if (e) {
          console.error('/thirdparty_login:', e);
          return res.render('error', {error: e});
        }

        if (result.data && result.data.uid) {
          var user_id = result.data.uid;

          req.session.user = {
            openid: openid,
            // unionid: unionid,
            user_id: user_id
          };

          res.cookie('user_id', user_id);
          res.redirect(req.protocol + '://' + req.get('host') + req_url)
        } else {
          return res.send('三方登录失败，error_msg: ' + result.error_msg);
        }
      })
    })
  })
});

module.exports = router;
