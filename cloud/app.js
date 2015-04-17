// 在 Cloud code 里初始化 Express 框架
var express = require('express');
var app = express();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var expressLayouts = require('express-ejs-layouts');
app.use(express.static('public'));
// App 全局配置
app.set('views', 'cloud/views'); // 设置模板目录
app.set('view engine', 'ejs'); // 设置 template 引擎

app.use(express.bodyParser()); // 读取请求 body 的中间件
app.use(express.cookieParser())
app.use(express.session({
    secret: 'leancloud',
    cookie: {
        maxAge: 60000
    }
}));

app.use(expressLayouts);

app.use(passport.initialize());
app.use(passport.session());
var moment = require('moment');
moment.lang('zh-cn');
passport.use('local', new LocalStrategy(
    function (username, password, done) {

        AV.User.logIn(username, password, {
            success: function (user) {
                // Do stuff after successful login.
                return done(null, user);
            },
            error: function (user, error) {
                // The login failed. Check error to see why.
                return done(null, false, {
                    message: 'Authenticated failed!'
                });
            }
        });
    }
));

// admin
app.get('/admin', ensureAuthenticated, function (req, res) {
    var query = new AV.Query("Client");
    query.include("salesman");
    query.descending("createdAt");
    query.find().then(function (clients) {
        clients = clients || [];
        console.log(clients);
        res.render('admin', {
            user: req.user,
            title: "销售-客户对应表",
            clients: clients,
            moment : moment
        });
    });

});

app.get('/login', function (req, res) {
    res.render('login', {
        title: "登陆"
    });
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/admin',
        failureRedirect: '/login',
    })
);

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (user, done) {
    //    User.findById(id, function (err, user) {
    //        done(err, user);
    //    });
    //console.log(id);
    console.log(done);
    done(null, user);

});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    console.log(req);
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login')
}

// 使用 Express 路由 API 服务 /hello 的 HTTP GET 请求
app.get('/', function (req, res) {
    res.redirect('/generate');
});

app.get('/generate', function (req, res) {
    res.render('generate', {
        title: "二维码生成"
    });
});

app.post('/generate', function (req, res) {
    var salesman_mobileNumber = req.body['salesman_mobileNumber'];

    var query = new AV.Query("Salesman");
    query.equalTo("mobileNumber", salesman_mobileNumber);
    query.find().then(function (sms) {
        console.log(sms);
        if (sms.length > 0) {
            var result = {
                url: 'http://' + req.headers.host + '/salesman/' + sms[0].id
            };
            res.send(result);
        } else {
            var Salesman = AV.Object.extend("Salesman");
            var sm = new Salesman();
            sm.set("mobileNumber", salesman_mobileNumber);
            sm.save().then(function (sm) {
                var result = {
                    url: 'http://' + req.headers.host + '/salesman/' + sm.id
                };
                res.send(result);
            }, function (error) {
                //对象保存失败，处理 error
            });
        }
    })
});

app.get('/salesman/:salesmanId', function (req, res) {
    var id = req.param('salesmanId');
    var client_mobileNumber = req.param('client_mobileNumber');
    console.log(id);
    res.render('bind', {
        salesmanId: id
    });
});

app.post('/bind', function (req, res) {
    var salesmanId = req.body['salesmanId'];
    var client_mobileNumber = req.body['client_mobileNumber'];
    console.log(req.body);

    var query = new AV.Query("Salesman");
    query.get(salesmanId, {
        success: function (salesman) {
            var Client = AV.Object.extend("Client");
            var client = new Client();

            client.set("salesman", salesman);
            client.set("mobileNumber", client_mobileNumber)
            client.save().then(function (client) {
                var result = {
                    message: '成功！'
                };
                res.send(result);
            }, function (error) {
                //对象保存失败，处理 error
            });
            console.log(salesman);
        },
        error: function (object, error) {}
    });
});

// 最后，必须有这行代码来使 express 响应 HTTP 请求
app.listen();
