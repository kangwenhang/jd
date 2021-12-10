const $ = new Env('demo');
const notify = $.isNode() ? require('./sendNotify') : '';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
let cookiesArr = [], cookie = '';
let ownCode = '';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  });
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
  let cookiesData = $.getdata('CookiesJD') || "[]";
  cookiesData = jsonParse(cookiesData);
  cookiesArr = cookiesData.map(item => item.cookie);
  cookiesArr.reverse();
  cookiesArr.push(...[$.getdata('CookieJD2'), $.getdata('CookieJD')]);
  cookiesArr.reverse();
  cookiesArr = cookiesArr.filter(item => item !== "" && item !== null && item !== undefined);
}
!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/',
      { "open-url": "https://bean.m.jd.com/" });
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    UA = `jdapp;iPhone;10.0.8;14.6;${uuidRandom()};network/wifi;JDEbook/openapp.jdreader;model/iPhone9,2;addressid/2214222493;appBuild/168841;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16E158;supportJDSHWK/1`;
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      originCookie = cookiesArr[i]
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      await checkCookie();
      console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/`, { "open-url": "https://bean.m.jd.com/" });
        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      authorCodeList = ['859dfd4259564f79ba5df0e0956a0e6b']
      // $.shareUuid = authorCodeList[random(0, authorCodeList.length)];
      $.shareUuid = ownCode ? ownCode : authorCodeList[random(0, authorCodeList.length)];
      $.activityId = '2112100008586801'
      $.activityUrl = `https://lzkjdz-isv.isvjcloud.com/m/1000085868/99/${$.activityId}/?helpUuid=${$.shareUuid}`
      await main();
    }
  }
})().catch(e => $.logErr(e)).finally(() => $.done());

async function main() {
  $.token = ''; $.Pin = ''; $.picture = ''; $.nickName = ''; $.actorUuid = ''; lzcookies = ''
  await getToken();
  if ($.token) {
    await getFirstLZCK('https://lzkjdz-isv.isvjcloud.com/wxCommonInfo/token');
    await getSimpleActInfoVo();
    await getMyPing();
    if ($.Pin) {
      await accessLogWithAD();
      await task('activityContent', `activityId=${$.activityId}&pin=${$.Pin}&uuid=${$.shareUuid}`);
      await task('crmCard/common/coupon/getOpenCardStatusWithOutSelf', `venderId=${$.venderId}&activityId=${$.activityId}&pin=${$.Pin}`, 1);
      if (!$.openCardstatus) {
        console.log('去加入会员！')
        await openCard();
      } else {
        console.log('已入会！')
      }
      if (!$.hasFollow) {
        console.log('关注店铺')
        await task('followShop', `activityId=${$.activityId}&pin=${$.Pin}`);
      } else {
        console.log('已关注店铺')
      }
      if ($.liveInfo.canWatch) {
        console.log('观看直播')
        await task('watchLive', `activityId=${$.activityId}&pin=${$.Pin}`);
      } else {
        console.log('观看直播任务已完成')
      }
      if ($.videoList) {
        for (let vo of $.videoList) {
          if (!vo.canWatch) {
            console.log(`视频观看任务${vo.name}已完成!`);
            continue;
          } else {
            await task('watchVideo', `activityId=${$.activityId}&pin=${$.Pin}&taskId=${vo.taskId}`);
            await $.wait(1000);
          };
        }
      }
      console.log(`去助力${$.shareUuid}`)
      await task('activityContent', `activityId=${$.activityId}&pin=${$.Pin}&uuid=${$.shareUuid}`);
    } else {
      console.log('获取pin失败')
    }
  } else {
    console.log('获取token失败!')
  }
}

function task(function_id, body, isCommon = 0) {
  return new Promise(resolve => {
    $.post(taskUrl(function_id, body, isCommon), (err, resp, data) => {
      setcookie(resp);
      try {
        if (err) {
          console.log(err);
        } else {
          if (data) {
            data = JSON.parse(data);
            switch (function_id) {
              case 'activityContent':
                // console.log(data)
                $.liveInfo = data.data.liveInfo;
                $.videoList = data.data.videoList;
                $.hasFollow = data.data.drawContentVO.hasFollow;
                if (data.data.presellInfo.isHelpSuccess) {
                  console.log('助力成功！！')
                }
                if ($.index === 1) {
                  ownCode = data.data.uuid
                  console.log(ownCode)
                }
                break;
              case 'crmCard/common/coupon/getOpenCardStatusWithOutSelf':
                $.openCardstatus = data.openCard;
                break;
              default:
                console.log(JSON.stringify(data));
                break;
            }
          } else {
            console.log("API没有返回数据")
          }
        }
      } catch (error) {
        $.log(error)
      } finally {
        resolve();
      }
    })
  })
}
function taskUrl(function_id, body, isCommon) {
  return {
    url: isCommon ? `https://lzkjdz-isv.isvjcloud.com/${function_id}` : `https://lzkjdz-isv.isvjcloud.com/crm/vivo/comedy/${function_id}`,
    body: body,
    headers: {
      "Host": "lzkjdz-isv.isvjcloud.com",
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "https://lzkjdz-isv.isvjcloud.com",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Accept": "application/json, text/plain, */*",
      "User-Agent": UA,
      "Referer": $.activityUrl,
      "Cookie": cookie
    },
  }
}
async function openCard() {
  await getShopOpenCardInfo({ "venderId": `${$.venderId}`, "channel": "401" }, $.venderId);
  await bindWithVender({ "venderId": `${$.venderId}`, "bindByVerifyCodeFlag": 1, "registerExtend": {}, "writeChildFlag": 0, "activityId": $.openCardActivityId, "channel": 401 }, $.venderId)

}
function getMyPing() {
  let opt = {
    url: `https://lzkjdz-isv.isvjcloud.com/customer/getMyPing`,
    headers: {
      "Host": "lzkjdz-isv.isvjcloud.com",
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Accept-Language": "zh-cn",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "https://lzkjdz-isv.isvjcloud.com",
      "User-Agent": UA,
      "Connection": "keep-alive",
      "Referer": $.activityUrl,
      "Cookie": cookie,
    },
    body: `token=${$.token}&fromType=APP&userId=1000085868&pin=`
  }
  return new Promise(resolve => {
    $.post(opt, (err, resp, data) => {
      setcookie(resp);
      try {
        if (err) {
          console.log(err)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data.result) {
              $.log(`您好：${data.data.nickname}`)
              $.nickName = data.data.nickname;
              secretPin = data.data.secretPin;
              $.Pin = encodeURIComponent(secretPin);
            } else {
              $.log(data.errorMessage)
            }
          } else {
            console.log("京东返回了空数据")
          }
        }
      } catch (error) {
        $.log(error)
      } finally {
        resolve();
      }

    })
  })
}
function getFirstLZCK(url) {
  let opt = {
    url,
    headers: {
      "Host": "lzkjdz-isv.isvjcloud.com",
      "Content-Type": "application/x-www-form-urlencoded",
      "Connection": "keep-alive",
      "Accept": "application/json, text/plain, */*",
      "User-Agent": UA,
      "Referer": $.activityUrl,
      "Accept-Language": "zh-cn",
      "Accept-Encoding": "gzip, deflate, br",
      "Cookie": cookie,
    }
  };
  return new Promise(resolve => {
    $.get(opt, (err, resp, data) => {
      try {
        setcookie(resp);
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function getSimpleActInfoVo() {
  let opt = {
    url: `https://lzkjdz-isv.isvjcloud.com/common/brand/getSimpleActInfoVo?activityId=${$.activityId}`,
    headers: {
      "Host": "lzkjdz-isv.isvjcloud.com",
      "Content-Type": "application/x-www-form-urlencoded",
      "Connection": "keep-alive",
      "Accept": "application/json, text/plain, */*",
      "User-Agent": UA,
      "Referer": $.activityUrl,
      "Accept-Language": "zh-cn",
      "Accept-Encoding": "gzip, deflate, br",
      "Cookie": cookie,
    }
  };
  return new Promise(resolve => {
    $.get(opt, (err, resp, data) => {
      setcookie(resp);
      try {
        if (err) {
          console.log(err)
        } else {
          if (data) {
            data = JSON.parse(data);
            $.venderId = data.data.venderId;
            $.shopId = data.data.shopId;
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function getShopOpenCardInfo(body, venderId) {
  let opt = {
    url: `https://api.m.jd.com/client.action?appid=jd_shop_member&functionId=getShopOpenCardInfo&body=${encodeURIComponent(JSON.stringify(body))}&client=H5&clientVersion=9.2.0&uuid=88888`,
    headers: {
      Host: 'api.m.jd.com',
      Accept: '*/*',
      Connection: 'keep-alive',
      Cookie: cookie,
      'User-Agent': UA,
      'Accept-Language': 'zh-cn',
      Referer: `https://shopmember.m.jd.com/shopcard/?venderId=${venderId}}&channel=801&returnUrl=${encodeURIComponent($.activityUrl)}`,
      'Accept-Encoding': 'gzip, deflate, br'
    }
  }
  return new Promise(resolve => {
    $.get(opt, (err, resp, data) => {
      try {
        if (err) {
          console.log(err)
        } else {
          res = JSON.parse(data)
          if (res.success) {
            if (res.result.interestsRuleList) {
              $.openCardActivityId = res.result.interestsRuleList[0].interestsInfo.activityId;
            }
          }
        }
      } catch (error) {
        console.log(error)
      } finally {
        resolve();
      }
    })

  })
}
function bindWithVender(body, venderId) {
  let opt = {
    url: `https://api.m.jd.com/client.action?appid=jd_shop_member&functionId=bindWithVender&body=${encodeURIComponent(JSON.stringify(body))}&client=H5&clientVersion=9.2.0&uuid=88888`,
    headers: {
      "Host": 'api.m.jd.com',
      "Accept": '*/*',
      "Connection": 'keep-alive',
      "Cookie": cookie,
      'User-Agent': UA,
      'Accept-Language': 'zh-cn',
      "Referer": `https://shopmember.m.jd.com/shopcard/?venderId=${venderId}}&channel=401&returnUrl=${encodeURIComponent($.activityUrl)}`,
      'Accept-Encoding': 'gzip, deflate, br'
    }
  }
  return new Promise(resolve => {
    $.get(opt, (err, resp, data) => {
      try {
        if (err) {
          console.log(err)
        } else {
          res = JSON.parse(data)
          if (res.success) {
            console.log(res.message)
            if (res.result.giftInfo && res.result.giftInfo.giftList) {
              for (const vo of res.result.giftInfo.giftList) {
                if (vo.prizeType === 4) {
                  $.log(`==>获得【${vo.quantity}】京豆`)
                  $.bean += vo.quantity
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(error)
      } finally {
        resolve();
      }
    })

  })
}
function setcookie(resp) {
  _null = []; lzcookies = '';
  let setresp = resp['headers']['set-cookie'] || resp['headers']['Set-Cookie'] || '';
  if (setresp) {
    let setrespCookies = setresp.map(str => str.split(';')[0]);
    lzcookies = _null.concat(setrespCookies).join('; ');
    cookie = originCookie
    cookie = `${cookie} ${lzcookies}`
    if ($.Pin) {
      cookie = `${cookie};AUTH_C_USER=${secretPin}`;
    }
  }
}
function accessLogWithAD() {
  let opt = {
    url: 'https://lzkjdz-isv.isvjcloud.com/common/accessLogWithAD',
    headers: {
      "Host": "lzkjdz-isv.isvjcloud.com",
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Accept-Language": "zh-cn",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "https://lzkjdz-isv.isvjcloud.com",
      "User-Agent": UA,
      "Connection": "keep-alive",
      "Referer": $.activityUrl,
      "Cookie": cookie,
    },
    body: `venderId=${$.venderId}&code=99&pin=${($.Pin)}&activityId=${$.activityId}&pageUrl=${$.activityUrl}&subType=app&adSource=null`
  }
  return new Promise(resolve => {
    $.post(opt, (err, resp, data) => {
      try {
        if (err) {
          console.log(err)
        } else {
          setcookie(resp);
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function getToken() {
  let opt = {
    url: 'https://api.m.jd.com/client.action?functionId=isvObfuscator',
    body: `body=%7B%22url%22%3A%22https%3A//lzkjdz-isv.isvjcloud.com%22%2C%22id%22%3A%22%22%7D&uuid=dacd2d8b7ceb4b909d1601b4d3b6fc1f&client=apple&clientVersion=9.4.0&st=1639109215000&sv=111&sign=25846b1c57375bba2500f0f0c243f5d9`,
    headers: {
      "Host": 'api.m.jd.com',
      'Content-Type': 'application/x-www-form-urlencoded',
      "Accept": '*/*',
      "Connection": 'keep-alive',
      "Cookie": cookie,
      'User-Agent': 'JD4iPhone/167650 (iPhone; iOS 13.7; Scale/3.00)',
      'Accept-Language': 'zh-Hans-CN;q=1',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  }
  return new Promise(resolve => {
    $.post(opt, (err, resp, data) => {
      try {
        if (err) {
          console.log(err)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data.code === "0") {
              $.token = data.token
            }
          } else {
            $.log("API返回了空数据")
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function checkCookie() {
  const options = {
    url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
    headers: {
      "Host": "me-api.jd.com",
      "Accept": "*/*",
      "Connection": "keep-alive",
      "Cookie": cookie,
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.2 Mobile/15E148 Safari/604.1",
      "Accept-Language": "zh-cn",
      "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
      "Accept-Encoding": "gzip, deflate, br",
    }
  };
  return new Promise(resolve => {
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          $.logErr(err)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data.retcode === "1001") {
              $.isLogin = false; //cookie过期
              return;
            }
            if (data.retcode === "0" && data.data.hasOwnProperty("userInfo")) {
              $.nickName = data.data.userInfo.baseInfo.nickname;
            }
          } else {
            $.log('API返回了空数据');
          }
        }
      } catch (e) {
        $.logErr(e)
      } finally {
        resolve();
      }
    })
  })
}
function random(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
function uuidRandom() {
  return Math.random().toString(16).slice(2, 10) +
    Math.random().toString(16).slice(2, 10) +
    Math.random().toString(16).slice(2, 10) +
    Math.random().toString(16).slice(2, 10) +
    Math.random().toString(16).slice(2, 10);
}
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }