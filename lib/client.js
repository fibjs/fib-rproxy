var coroutine = require("coroutine");
var http = require("http");
var mq = require("mq");
var io = require("io");
var net = require("net");
var isStop = false;
var Accouts = {
	name: "hello",
	password: "123456"
};

function rsvr(proxy, host, key, hdlr) {
	var httpHdlr = new http.Handler(hdlr);

	function worker() {
		while (!isStop) {
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
				coroutine.sleep(1 * 1000);
			}
		}
	}

	for (var i = 0; i < 3; i++)
		coroutine.start(worker);
}

module.exports = {
	run: function(hdlr) {
		rsvr("tcp://127.0.0.1:9980", Accouts.name, Accouts.password, hdlr);
	},
	stop: function() {
		isStop = true;
	}
}