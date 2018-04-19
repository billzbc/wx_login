var express = require('express');
var router = express.Router();
var Config = require('../config/config.conf');
var uuidv4 = require('uuid/v4');
var request = require('request');

var appid = Config.account_info.AppID;

/* GET home page. */
router.get('/*', function (req, res, next) {
  var req_url = req.originalUrl;
  console.log('req_url ', req_url)

  //如果是授权的路由直接放行
  if (req_url.indexOf('/user/') === 0) {
    return next();
  }

  //js css img等静态资源直接放行
  var regex = /([\.js]|[\.css]|[\.png]|[\.jpg]|[\.gif]|[\.jpeg])$/;
  if (regex.test(req_url.split('?')[0])) {
    // console.log('静态资源直接放行')
    return next();
  }

  console.dir(req.headers['user-agent']);
  var ua = req.headers['user-agent'];

  if (ua.toLowerCase().indexOf('micromessenger') === -1) {
    //非微信浏览器中 无需认证 重定向到来源地址
    return res.send('非微信浏览器中 无需认证')
  }

  var user = req.session.user;

  if (!user || !user.openid) {
    console.log("没有openid 静默授权")
    //没有openid 进行静默授权
    var REDIRECT_URI = encodeURIComponent(req.protocol + '://' + req.get('host') + '/user/login');
    var STATE = uuidv4();
    req.session.user = {
      state: STATE,
      url: req_url
    };
    var url = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=' + appid + '&redirect_uri=' + REDIRECT_URI + '&response_type=code&scope=snsapi_base&state=' + STATE + '#wechat_redirect';
    return res.redirect(url)

  } else {
    var env = process.env.NODE_ENV;

    if (user.user_id && env === 'production') {
      res.cookie('user_id', user.user_id);
      return next();
    } else {
      //测试环境，考虑清账号的需求，不取session中的user_id)
      //user_id不存在 通过 type　+ openid 查询 user_id
      request.get({
        url: 'http://tuser.hundun.cn/user/get_user_by_openid',
        qs: {
          openid: 'orOxFxFJjKyQaKR8tLWAhCXXCarU',
          type: 'h5wx'
        },
        json: true
      }, function (e, r, result) {

        if (result.error_no === 0 && result.data.uid) {
          var user_id = result.data.uid;
          res.cookie('user_id', user_id);
          return next();

        } else {
          //手动授权
          console.log('user_id 不存在，走手动授权');
          var REDIRECT_URI = encodeURIComponent(req.protocol + '://' + req.get('host') + '/user/auth');
          var STATE = uuidv4();
          req.session.user = {
            state: STATE,
            url: req_url
          };
          var url = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=' + appid + '&redirect_uri=' + REDIRECT_URI + '&response_type=code&scope=snsapi_userinfo&state=' + STATE + '#wechat_redirect';
          return res.redirect(url)
        }

      })
    }
  }

});

module.exports = router;
