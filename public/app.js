var app = angular.module("TwitterApp", ["ngResource", "ngMaterial", "ui.router"]);

app.run(function($rootScope, $state, $stateParams) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
});

app.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/");

    var MeResolver = ['TwitterAPI', function(TwitterAPI) {
                    return TwitterAPI.ProfileResource.me();
    }];
    var TweetResolver = ['TwitterAPI', '$stateParams', function(TwitterAPI, $stateParams) {
                    var tweet_id = $stateParams.tweet_id;
                    return TwitterAPI.TweetResource.get({tweet_id: tweet_id});
    }];
    var UserResolver = ['TwitterAPI', '$stateParams', function(TwitterAPI, $stateParams) {
                    var user_id = $stateParams.user_id;
                    return TwitterAPI.ProfileResource.get({user_id: user_id});
    }];

    $stateProvider
        .state('login', {
            url: '/',
            resolve: {
                Me: MeResolver,
            },
            templateUrl: 'login.html',
            controller: 'AppCtrl',
        })
        .state('main', {
            abstract: true,
            resolve: {
                Me: MeResolver,
            },
            templateUrl: 'main.html',
        })
        .state('main.tweets', {
            url: '/tweets',
            controller: 'ResultsCtrl',
            templateUrl: 'tweets.html',
        })
        .state('main.tweets.retweet', {
            url: '/:tweet_id/retweet',
            resolve: {
                Tweet: TweetResolver,
            },
            controller: 'TweetCtrl',
            templateUrl: 'retweet.html',
        })
        .state('main.tweets.reply', {
            url: '/:tweet_id/reply',
            resolve: {
                Tweet: TweetResolver,
            },
            controller: 'TweetCtrl',
            templateUrl: 'reply.html',
        })
        .state('main.lists', {
            url: '/lists',
            controller: 'ListCtrl',
            templateUrl: 'lists.html',
        })
        .state('main.me', {
            url: '/profile/me',
            resolve: {
                User: MeResolver,
            },
            controller: 'ProfileCtrl',
            templateUrl: 'profile.html',
        })
        .state('main.tweets.profile', {
            url: '/profile/:user_id',
            resolve: {
                User: UserResolver,
            },
            controller: 'ProfileCtrl',
            templateUrl: 'profile.html',
        });
});

app.service('ShowMessage', ['$mdToast', '$mdDialog', function($mdToast, $mdDialog) {
    var thisService = this;

    thisService.alert = function(ev) {
        $mdDialog.show(
          $mdDialog.alert()
            .title('Error')
            .content('' + ev)
            .ariaLabel('Alert Dialog')
            .ok('Got it!')
            .targetEvent(ev)
        );
    };

    thisService.toast = function(msg) {
        $mdToast.show($mdToast.simple().content(msg));
    };
}]);

app.service('TwitterAPI', ['$resource', '$state', 'ShowMessage', function($resource, $state, ShowMessage) {
    var thisService = this;

    var process_response = function(data) {
        if(!data) { return data; }

        if(typeof(data) === 'string') {
            data = JSON.parse(data);
        }

        if(data.error) {
            if(data.error.code == 'login_required') {
                $state.go('login', {error: "Login Required"});
                return;
            }

            if(typeof(data.error.data) === 'string') {
                var err = JSON.parse(data.error.data);
                var errMessage = '';
                for(var i in err.errors) {
                    var e = err.errors[i];
                    errMessage += "[" + e.code + "] " + e.message + " \n";
                }
                ShowMessage.alert(errMessage);
            }
            throw data.error;
        }

        return data;
    };

    var tweet_actions = {
        search: { method: 'GET', url: '/tweets/search', transformResponse: process_response, responseType: 'json' },
        get: { method: 'GET', url: '/tweets/:tweet_id', transformResponse: process_response, response_type: 'json' },
        retweet: { method: 'POST', url: '/tweets/:tweet_id/retweet', transformResponse: process_response, responseType: 'json' },
        reply: { method: 'POST', url: '/tweets/:tweet_id/reply', transformResponse: process_response, responseType: 'json' },
    };

    thisService.TweetResource = $resource("/tweets", {}, tweet_actions);

    var list_actions = {
        create: { method: 'POST', url: '/lists', transformResponse: process_response, responseType: 'json' },
        list: { method: 'GET', url: '/lists', transformResponse: process_response, responseType: 'json', isArray: true },
        destroy: { method: 'DELETE', url: '/lists/:list_id', transformResponse: process_response, responseType: 'json' },
        get: { method: 'GET', url: '/lists/:list_id', transformResponse: process_response, responseType: 'json' },
        add_member: { method: 'PUT', url: '/lists/:list_id/member/:user_id', transformResponse: process_response, responseType: 'json' },
        remove_member: { method: 'DELETE', url: '/lists/:list_id/member/:user_id', transformResponse: process_response, responseType: 'json' },
    };

    thisService.ListResource = $resource("/lists", {}, list_actions);

    var profile_actions = {
        get: { method: 'GET', url: '/profile/:user_id', transformResponse: process_response, responseType: 'json' },
        me: { method: 'GET', url: '/me', transformResponse: process_response, responseType: 'json' },
        follow_user: { method: 'PUT', url: '/profile/:user_id/follow', transformResponse: process_response, responseType: 'json' },
        unfollow_user: { method: 'DELETE', url: '/profile/:user_id/follow', transformResponse: process_response, responseType: 'json' },
    };

    thisService.ProfileResource = $resource("/profile", {}, profile_actions);
}]);

app.controller("AppCtrl", ['$scope', '$state', 'TwitterAPI', 'Me', function($scope, $state, TwitterAPI, Me) {

    var cgi_params = {};
    document.location.search.substr(1).split('&').map(function(kv) {
        var tmp = kv.split('=');
        cgi_params[tmp[0]] = tmp[1];
    });

    Me.$promise.then(function(obj) {
        $state.go('main.tweets');
    })
    .catch(function(error_obj) {
        $state.go('login');
        console.log("ERR OBJ ", error_obj);
    });

}]);


app.controller('SearchCtrl', ['$scope', '$rootScope', 'TwitterAPI', 'ShowMessage', function($scope, $rootScope, TwitterAPI, ShowMessage) {
    $scope.search = '';
    var searches = localStorage.getItem('twitter_searches');
    $scope.searches = (searches ? JSON.parse(searches) : []);

    $scope.get_location = function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                $scope.location_pos = position.coords;
                console.log("LOCATION IS ", $scope.location_pos);
            });
        }
    }
    $scope.get_location();

    $scope.do_search = function(id) {
        var search_params = {};
        if(id !== undefined) {
            search_params = $scope.searches[id];
        }
        else if($scope.search) {
            var found = false;
            search_params = { q: $scope.search, lang: 'english' };
            if($scope.location_pos && $scope.search_current_location) {
                search_params['geocode'] = $scope.location_pos.latitude + "," + $scope.location_pos.longitude + ",50mi";
            }

            for(var i in $scope.searches) {
                if((search_params.q == $scope.searches[i].q) && (search_params.geocode == $scope.searches[i].geocode)) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                $scope.searches.unshift(search_params);
                localStorage.setItem('twitter_searches', JSON.stringify($scope.searches));
            }
        }

        TwitterAPI.TweetResource.search(search_params).$promise
                .then(function(data) {
                    console.log("SEARCH RESULTS ", data);
                    $rootScope.$broadcast('search_results', data);
                })
                .catch(function(error_obj) {
                    console.log("ERROR SEARCH ", error_obj);
                });
    };

    $scope.remove_search = function(id) {
        $scope.searches.splice(id,1);
        localStorage.setItem('twitter_searches', JSON.stringify($scope.searches));
    };
}]);

app.controller('ResultsCtrl', ['$scope', '$state', 'TwitterAPI', 'ShowMessage', function($scope, $state, TwitterAPI, ShowMessage) {
    $scope.search_results = [];
    $scope.selected_tweets = {
        count: 0,
        checkboxes: {},
        tweets: {},
    };
    $scope.$on('search_results', function(event, arg) {
        $scope.selected_tweets = { count: 0, checkboxes: {}, tweets: {} };
        $scope.search_results = arg;
    });

    $scope.change_selected_tweets = function(tweet) {
        if($scope.selected_tweets.checkboxes[tweet.id_str]) {
            $scope.selected_tweets.tweets[tweet.id_str] = tweet;
            $scope.selected_tweets.count++;
        }
        else {
            delete $scope.selected_tweets.tweets[tweet.id_str];
            $scope.selected_tweets.count--;
        }
    };

    $scope.reply = function(tweet_id) {
        $state.go('main.tweets.reply', { tweet_id: tweet_id });
    };

    $scope.retweet = function(tweet_id) {
        $state.go('main.tweets.retweet', { tweet_id: tweet_id });
    };

    $scope.view_profile = function(user_id) {
        $state.go('main.tweets.profile', { user_id: user_id });
    };

    $scope.follow_selected = function() {
        var profile_ids = {};
        for(var i in $scope.selected_tweets.tweets) {
            profile_ids[$scope.selected_tweets.tweets[i].user.id_str] = true;
        }
        profile_ids = Object.keys(profile_ids);

        async.eachLimit(profile_ids, 2, function(user_id, callback) {
                TwitterAPI.ProfileResource.follow_user({user_id: user_id}, {}).$promise
                        .then(function(obj) {
                            callback();
                        })
                        .catch(function(error_obj) {
                            console.log("FOLLOW ERROR ", error_obj);
                            callback(error_obj);
                        });
            },
            function(err) {
                if(err) {
                    //ShowMessage.alert(err);
                }
                else {
                    ShowMessage.toast('Now Following ' + profile_ids.length + ' New Profiles');
                }
            }
        )
    };

    $scope.retweet_selected = function() {
        var tweet_ids = {};
        for(var i in $scope.selected_tweets.tweets) {
            tweet_ids[$scope.selected_tweets.tweets[i].id_str] = true;
        }
        tweet_ids = Object.keys(tweet_ids);

        async.eachLimit(tweet_ids, 2, function(tweet_id, callback) {
                TwitterAPI.TweetResource.retweet({tweet_id: tweet_id}, {}).$promise
                        .then(function(obj) {
                            callback();
                        })
                        .catch(function(error_obj) {
                            console.log("RETWEET ERROR ", error_obj);
                            callback(error_obj);
                        });
            },
            function(err) {
                if(err) {
                    //ShowMessage.alert(err);
                }
                else {
                    ShowMessage.toast('Retweeted ' + tweet_ids.length + ' Tweets!');
                }
            }
        )
    };

    $scope.load_lists = function() {
        $scope.lists = [];
        var ret = TwitterAPI.ListResource.list();
        ret.$promise
            .then(function(obj) {
                $scope.lists = obj;
            })
            .catch(function(error_obj) {
                console.log("LOAD LISTS ERROR ", error_obj);
            });
        return ret.$promise;
    };

    $scope.add_to_selected_list = function() {
        var profile_ids = {};
        for(var i in $scope.selected_tweets.tweets) {
            profile_ids[$scope.selected_tweets.tweets[i].user.id_str] = true;
        }
        profile_ids = Object.keys(profile_ids);

        async.eachLimit(profile_ids, 2, function(user_id, callback) {
                TwitterAPI.ListResource.add_member({list_id: $scope.selected_list.id_str, user_id: user_id}, {}).$promise
                        .then(function(obj) {
                            callback();
                        })
                        .catch(function(error_obj) {
                            console.log("ADD TO SELECTED LIST ERROR ", error_obj);
                            callback(error_obj);
                        });
            },
            function(err) {
                if(err) {
                    //ShowMessage.alert(err);
                }
                else {
                    ShowMessage.toast('Added ' + profile_ids.length + ' Profiles to List');
                    $scope.selected_list = null;
                }
            }
        )

    };
}]);


app.controller('TweetCtrl', ['$scope', '$state', 'TwitterAPI', 'Tweet', 'ShowMessage', function($scope, $state, TwitterAPI, Tweet, ShowMessage) {
    Tweet.$promise.then(function(obj) {
        $scope.tweet = obj;
        $scope.reply.text = "@" + $scope.tweet.user.screen_name + " ";
    });

    $scope.reply = function() {
        TwitterAPI.TweetResource.reply({tweet_id: $scope.tweet.id_str}, { status_message: $scope.reply.text}).$promise
            .then(function(obj) {
                ShowMessage.toast('Success Replying to Tweet');
                $state.go('^');
            })
            .catch(function(error_obj) {
                console.log("REPLY ERROR ", error_obj);
            });
    };

    $scope.retweet = function() {
        TwitterAPI.TweetResource.retweet({tweet_id: $scope.tweet.id_str}, {}).$promise
            .then(function(obj) {
                ShowMessage.toast('Success Retweeting');
                $state.go('^');
            })
            .catch(function(error_obj) {
                console.log("RETWEET ERROR ", error_obj);
            });
    };

    $scope.cancel = function() {
        $state.go('^');
    };
}]);

app.controller('ListCtrl', ['$scope', '$state', 'TwitterAPI', 'Me', 'ShowMessage', function($scope, $state, TwitterAPI, Me, ShowMessage) {

    $scope.refresh_lists = function() {
        $scope.lists = TwitterAPI.ListResource.list();
    };

    $scope.create_list = function() {
        TwitterAPI.ListResource.create({name: $scope.new_list_name}).$promise
            .then(function(obj) {
                ShowMessage.toast('Created List ' + $scope.new_list_name);
                $scope.refresh_lists();
            })
            .catch(function(error_obj) {
                console.log("LIST CREATE ERROR ", error_obj);
            });
    };

    $scope.delete_list = function(list_id) {
        TwitterAPI.ListResource.destroy({list_id: list_id}).$promise
            .then(function(obj) {
                ShowMessage.toast('Deleted List ' + list_id);
                $scope.refresh_lists();
            })
            .catch(function(error_obj) {
                console.log("LIST DELETE ERROR ", error_obj);
            });
    };

    $scope.select_list = function(list_id) {
        $scope.current_list_id = list_id;
        TwitterAPI.ListResource.get({list_id: list_id}).$promise
            .then(function(obj) {
                $scope.members = obj.users;
            })
            .catch(function(error_obj) {
                console.log("SELECT LIST ERROR ", error_obj);
            });
    };

    $scope.delete_member = function(list_id, user_id) {
        TwitterAPI.ListResource.remove_member({list_id: list_id, user_id: user_id}).$promise
           .then(function(obj) {
                ShowMessage.toast("Removed User from List");
                $scope.select_list(list_id);
            })
            .catch(function(error_obj) {
                console.log("Remove User from List ERROR ", error_obj);
            }); 
    };

    $scope.refresh_lists();
}]);

app.controller('ProfileCtrl', ['$scope', '$state', 'TwitterAPI', 'User', 'ShowMessage', function($scope, $state, TwitterAPI, User, ShowMessage) {
    User.$promise.then(function(obj) {
        $scope.profile = obj;
    });

    $scope.follow = function() {
        TwitterAPI.ProfileResource.follow_user({user_id: $scope.profile.id_str}, {}).$promise
            .then(function(obj) {
                ShowMessage.toast('Now Following @' + $scope.profile.screen_name);
                $state.reload();
            })
            .catch(function(error_obj) {
                console.log("FOLLOW ERROR ", error_obj);
            });
    };

    $scope.unfollow = function() {
        TwitterAPI.ProfileResource.unfollow_user({user_id: $scope.profile.id_str}, {}).$promise
            .then(function(obj) {
                ShowMessage.toast('No Longer Following @' + $scope.profile.screen_name);
                $state.reload();
            })
            .catch(function(error_obj) {
                console.log("UNFOLLOW ERROR ", error_obj);
            });
    };

    $scope.load_lists = function() {
        $scope.lists = [];
        TwitterAPI.ListResource.list().$promise
            .then(function(obj) {
                $scope.lists = obj;
            })
            .catch(function(error_obj) {
                console.log("SELECT LIST ERROR ", error_obj);
            });
    };
}]);
