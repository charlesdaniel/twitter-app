/* Twitter App example server */
var config = require("./config.js");
console.log("CONFIG ", config);

var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: config.twitter.consumer_key,
    consumerSecret: config.twitter.secret_key,
    callback: config.twitter.callback_url,
});


var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    keys: (config.session_keys || ['FOOOOOOO', 'BARRRR'])
}));

app.use(express.static('public'));

app.get('/login', function(req, res) {
    res.redirect('/oauth_twitter');
});

app.get('/logout', function(req, res) {
    delete req.session.oauth;
    res.redirect('/');
});

app.get('/oauth_twitter', function(req, res) {
    console.log("REQ SESSION ", req.session);
    twitter.getRequestToken(function(err, requestToken, requestTokenSecret, results) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }

        req.session.oauth = {
            requestToken: requestToken,
            requestTokenSecret: requestTokenSecret,
        };

        var redirect_url = twitter.getAuthUrl(requestToken);
        res.redirect(redirect_url);
    });
});

app.get('/oauth_twitter/callback', function(req, res) {
    console.log("REQ SESSION ", req.session);
    if(! req.session || !req.session.oauth || ! req.session.oauth.requestToken) {
        console.log("SESSION NOT FOUND FOR REQUEST TOKEN");
        res.redirect('/');
        return;
    }

    var oauth_token = req.query.oauth_token;
    var oauth_verifier = req.query.oauth_verifier;
    console.log("OAUTH TOKEN ", oauth_token, " OAUTH VERIFIER ", oauth_verifier);
    twitter.getAccessToken(req.session.oauth.requestToken, req.session.oauth.requestTokenSecret, oauth_verifier, function(err, accessToken, accessTokenSecret, results) {
        console.log("AFTER ERR ", err, " GET ACCESS TOKEN ", accessToken, " SECRET ", accessTokenSecret);
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        req.session.oauth = {
            accessToken: accessToken,
            accessTokenSecret: accessTokenSecret,
        };

        res.redirect('/');
    });
});


app.get('/tweets/search', function(req, res) {
    var q = req.query.q;
    twitter.search({ q: q }, 
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});

app.get('/tweets/:tweet_id', function(req, res) {
    console.log("LOOKING UP SHOW ", req.params.tweet_id);
    twitter.statuses("show", {id: req.params.tweet_id}, 
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});


app.post('/tweets/:tweet_id/retweet', function(req, res) {
    twitter.statuses("retweet", {id: req.params.tweet_id}, 
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});


app.post('/tweets/:tweet_id/reply', function(req, res) {
    twitter.statuses("update", {status: req.body.status_message, in_reply_to_status_id: req.params.tweet_id}, 
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});


app.get('/lists', function(req, res) {
    twitter.lists("list", {},
                     req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        console.log("/lists" , data);
        res.json(data);
    });
});

app.post('/lists', function(req, res) {
    twitter.lists("create", {name: req.body.name, mode: (req.body.mode||'private'), description: (req.body.description||'')},
                     req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        console.log("/lists" , data);
        res.json(data);
    });
});

app.get('/lists/:list_id', function(req, res) {
    twitter.lists("members", {list_id: req.params.list_id},
                     req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});


app.delete('/lists/:list_id', function(req, res) {
    twitter.lists("destroy", {list_id: req.params.list_id},
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});

app.put('/lists/:list_id/member/:user_id', function(req, res) {
    twitter.lists("members/create", {list_id: req.params.list_id, user_id: req.params.user_id},
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});

app.delete('/lists/:list_id/member/:user_id', function(req, res) {
    twitter.lists("members/destroy", {list_id: req.params.list_id, user_id: req.params.user_id},
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});



app.get('/me', function(req, res) {
    twitter.verifyCredentials(req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});

app.get('/profile/:user_id/timeline', function(req, res) {
    twitter.getTimeline("user", {user_id: req.params.profile_id}, 
                            req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);

    });
});

app.get('/profile/:user_id', function(req, res) {
    twitter.users("show", {user_id: req.params.user_id},
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});



app.put('/profile/:user_id/follow', function(req, res) {
    twitter.friendships("create", {user_id: req.params.user_id},
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});

app.delete('/profile/:user_id/follow', function(req, res) {
    twitter.friendships("destroy", {user_id: req.params.user_id},
                        req.session.oauth.accessToken, req.session.oauth.accessTokenSecret, function(err, data, response) {
        if(err) {
            res.status(400).json({error: err});
            return;
        }
        res.json(data);
    });
});

var server = app.listen(config.server_port || 3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});

