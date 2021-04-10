## General proxy server for fibjs

## Install

```sh
fibjs --install fib-rproxy
```

## Test

```sh
fibjs test
```

## Simple example.

```js

//create proxy server
var rproxy = require("fib-rproxy");

rproxy.server.run({
    // config
    server_timeout: 5 * 1000,
	client_timeout: 5 * 1000,
	domain: ["d3j.io"],
	port: 9988,
	error_domain: `HTTP/1.0 500\n\n unknown domain`,
	error_timeout: `HTTP/1.0 500\n\n server not online`
});
```


```js
//create proxy client
var http = require("http");

var rproxy = require("fib-rproxy");
var rproxyClient = rproxy.client;

var hdlr = new http.Handler({
    '^/ping': function(v) {
        v.response.write("pong");
    },
    '(.*)': [
        http.fileHandler("./", {}, true),
    ]
})

rproxyClient.run({
    url: "tcp://127.0.0.1:9988",
    version: "0.1",
    password: "123456",
    handlers: {
        "proxy": hdlr,
    }
});

```