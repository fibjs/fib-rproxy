var http = require("http");

var rproxy = require("../index");
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