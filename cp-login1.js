var steps          = []
var testindex      = 0
var loadInProgress = false//This is set to true when a page is still loading

/*********SETTINGS*********************/
var webPage    = require('webpage')
var page       = webPage.create()
var args       = require('system').args
var fs         = require('fs')
var CookieJar  = 'cookie/' + args[1] + '.json'
var CookieTxt  = 'cookie/' + args[1] + '.txt'
var url        = 'http://cpquery.sipo.gov.cn/'
var homeUrl    = 'http://cpquery.sipo.gov.cn/txnPantentInfoList.do?inner-flag:open-type=window&inner-flag:flowno='
var confirmUrl = 'http://cpquery.sipo.gov.cn/txnDisclaimerDetail.do?select-key:yuzhong=zh&select-key:gonggaolx=3&time='

// page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36'

page.customHeaders = {
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
}

page.settings.javascriptEnabled = true
page.settings.loadImages        = false//Script is much faster with this field set to false
phantom.cookiesEnabled          = true
phantom.javascriptEnabled       = true
/*********SETTINGS END*****************/

var path = args[0].split('/');
path.pop()
fs.changeWorkingDirectory(path.join('/'))

ll('All settings loaded, start with execution')

/*ll(fs.workingDirectory)
phantom.exit()*/
if (fs.isFile(CookieJar) && fs.read(CookieJar)) {
    Array.prototype.forEach.call(JSON.parse(fs.read(CookieJar)), function (x) {
        // console.log(JSON.stringify(x))
        page.deleteCookie(x.name)
        page.addCookie(x)
    })
}
page.onResourceRequested = function (requestData, networkRequest) {
    if (!/\.js|\.css/.test(requestData.url)) {
        // ll('Request (#' + requestData.id + '): ' + requestData.url + JSON.stringify(requestData));
    }
}
page.onResourceReceived  = function (response) {
    if (response.stage == 'end' && !/\.js|\.css/.test(response.url)) {
        var responseString = JSON.stringify(response)
        // ll('[Response] (#' + response.id + ', stage "' + response.stage + '"): ' + responseString);
    }
}
page.onConsoleMessage    = function (msg) {
    ll(msg)
}
page.onAlert             = function (msg) {
    ll('Alert:', msg)
}
/**********DEFINE STEPS THAT FANTOM SHOULD DO***********************/
steps = [
    function () {
        ll('Step 0 - open home page')
        curl(homeUrl + Date.now())
    },
    function () {
        var content  = page.content
        var username = content.match(/"欢迎您，(.*?)"/)
        if (username) {
            username = username[1]
            ll(username)
            var cookie = page.evaluate(function () {
                return document.cookie
            })
            fs.write(CookieTxt, cookie, 'w')
            phantom.exit()
        } else {
            phantom.clearCookies()
        }
    },
    function () {
        ll('Step 1 - open main page')
        curl(url)
    },
    function () {
        ll('Step 2 - Populate and submit the login form')
        page.evaluate(function (_args) {
            $('#username').val(_args[1])
            $('#add-code').val(22)
            $('#password').val(_args[2])
            $('.login_butt').click()
        }, args)
        setTimeout(function () {
            ll('evaluate login')
        }, 1000)
    },
    function () {
        ll('Step 3 - open home page')
        curl(homeUrl + Date.now())
    },
    //Step 4 - Wait Amazon to login user. After user is successfully logged in, user is redirected to home page. Content of the home page is saved to AmazonLoggedIn.html. You can find this file where phantomjs.exe file is. You can open this file using Chrome to ensure that you are logged in.
    function () {
        ll('Step 4 - populate home page')
        fs.write('confirm.html', page.content, 'w')
        ll(page.title)

        var cookie = page.evaluate(function () {
            return document.cookie
        })
        fs.write(CookieTxt, cookie, 'w')

        fs.write(CookieJar, JSON.stringify(page.cookies), 'w')
    },
]
/**********END STEPS THAT FANTOM SHOULD DO***********************/

//Execute steps one by one
interval = setInterval(executeRequestsStepByStep, 50)

function executeRequestsStepByStep() {
    if (loadInProgress == false && typeof steps[testindex] == 'function') {
        //ll("step " + (testindex + 1));
        steps[testindex]()
        testindex++
    }
    if (typeof steps[testindex] != 'function') {
        ll('test complete!')
        phantom.exit()
    }
}

function curl(url) {
    page.open(url)
}

function updateCookie(domCookie) {
    var cookie       = domCookie.split('; ')
    var cookieLength = cookie.length

    for (var i = cookieLength - 1; i >= 0; i--) {
        var c = cookie[i].trim(), cname = 'FSSBBIl1UgzbN7N80T', name = cname + '='
        if (c.indexOf(name) == 0) {
            var tCookie = c.substring(name.length, c.length)

            var target   = get_target_value(page.cookies, cname, 'name', true)
            target.value = tCookie
            page.deleteCookie(cname)
            page.addCookie(target)

            break
        }
    }
}

function get_target_value(obj, value, targetKey, targetValue) {
    var obj = obj instanceof Object ? obj : JSON.parse(obj), tValue, final = ''
    Array.prototype.forEach.call(obj, function (x) {
        if (x[targetKey] == value) {
            if (targetValue === true) {
                final = x
            } else {
                final = x[targetValue]
            }
        }
    })
    /*for (var i = obj.length - 1; i > 0; i--) {
        tValue = obj[i]
        if (tValue[targetKey] == value) {
            if (targetValue === true) {
                return tValue
            } else {
                return tValue[targetValue]
            }
        }
    }*/

    return final
}

function ll(data) {
    console.log(data instanceof Object ? JSON.stringify(data) : data)
}

/**
 * These listeners are very important in order to phantom work properly. Using these listeners, we control loadInProgress marker which controls, weather a page is fully loaded.
 * Without this, we will get content of the page, even a page is not fully loaded.
 */
page.onLoadStarted = function () {
    loadInProgress = true
    ll('Loading started')
}
page.onLoadFinished   = function () {
    loadInProgress = false
    ll('Loading finished')
}
page.onConsoleMessage = function (msg) {
    ll(msg)
}
