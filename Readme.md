## General proxy server for fibjs

## Install

```sh
npm install fib-rproxy [--save]
```

## Test

```sh
npm run ci
```

## Simple example.

```js

//create proxy server
var rproxy = require("index");

rpoxy.server.run(() => {});
```


```js
//create proxy client
var rproxy = require("index");
var http = require("http");

var hdlr = http.fileHandler("./");
rpoxy.client.run(hdlr);
```