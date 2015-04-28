# twitter-app
######by Charles Daniel

An example Twitter UI app written in NodeJS (backend) and Angular-Material (frontend).

###Installation

```
$ git clone https://github.com/charlesdaniel/twitter-app.git

$ cd twitter-app/
$ npm install
$ cp example.config.js config.js

```

Now get a dev account and setup an App configuration on Twitter’s API site via [https://apps.twitter.com/](https://apps.twitter.com/) . You should get a Consumer Key and a Consumer Secret when you’re done creating the App. Copy that Consumer Key and Consumer Secret to the `config.js` file in the `twitter-app/` directory.

Change the `callback_url` in `config.js` to have the correct fully qualified domain name of where you’ll be running this server so that the Twitter OAuth redirection will work correctly.

Change the `session_keys` in `config.js` to an array set of random strings (this is used as the key in encrypting the session cookie on the user’s browser).

Optionally change the `server_port` in `config.js` to whatever port you like.

###Running

```
$ node server.js
```

Test the server by pointing your browser at the hostname for the server and using the port specified in the config.js (default is port `3000`).