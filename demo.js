var coroutine = require("coroutine");
var http = require("http");
var mq = require("mq");
var io = require("io");
var net = require("net");

function rsvr(proxy, host, key, hdlr) {
    var httpHdlr = new http.Handler(hdlr);

    function worker() {
        while (true) {
            try {
                var sock = net.connect(proxy);

                sock.write("server " + host + ":" + key + "\r\n");

                var bs = new io.BufferedStream(sock);
                bs.EOL = "\r\n";

                if (bs.readLine() == "ok") {
                    mq.invoke(httpHdlr, bs, () => sock.close());
                } else
                    sock.close(() => {});
            } catch (e) {
                coroutine.sleep(1000);
            }
        }
    }

    for (var i = 0; i < 10; i++)
        coroutine.start(worker);
}

var hdlr = http.fileHandler("../fibjs/docs/html");

rsvr("tcp://127.0.0.1:9980", "lion", "123456", hdlr);
var svr = new http.Server(8888, hdlr);
svr.run();
