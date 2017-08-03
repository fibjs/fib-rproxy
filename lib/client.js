var coroutine = require("coroutine");
var http = require("http");
var mq = require("mq");
var io = require("io");
var net = require("net");
var isStop = false;
var runStats = {};

function rsvr(proxy, host, key, hdlr) {
	var httpHdlr = new http.Handler(hdlr);

	function one_conn() {
		var sock = net.connect(proxy);

		sock.write("server " + host + ":" + key + "\r\n");

		var bs = new io.BufferedStream(sock);
		bs.EOL = "\r\n";

		if (bs.readLine() == "ok") {
			mq.invoke(httpHdlr, bs, () => sock.close());
		} else
			sock.close(() => {});
	}

	function worker() {
		while (!isStop) {
			try {
				runStats.connectionTimes = runStats.connectionTimes || 0;
				runStats.connectionTimes++;
				if (runStats.connectionTimes > 99999999999) runStats.connectionTimes = 0;
				runStats.lastTime = new Date();
				one_conn();
			} catch (e) {
				coroutine.sleep(1 * 1000);
			}
		}
	}

	for (var i = 0; i < 3; i++)
		coroutine.start(worker);
}

module.exports = {
	run: function(url, name, password, hdlr) {
		console.notice("proxy client is running")
		rsvr(url, name, password, hdlr);
	},
	stop: function() {
		console.notice("proxy client is stopping")
		isStop = true;
	},
	info: function() {
		return runStats;
	}
}