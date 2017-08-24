var coroutine = require("coroutine");
var http = require("http");
var mq = require("mq");
var io = require("io");
var net = require("net");
var isStop = false;
var runStatus = {};

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
				runStatus.connectionTimes = runStatus.connectionTimes || 0;
				runStatus.connectionTimes++;
				if (runStatus.connectionTimes > 99999999999) runStatus.connectionTimes = 0;
				runStatus.lastTime = new Date();
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
	run: function(url, name, password, version, hdlr) {
		console.notice("proxy client is running")
		runStatus.url = url;
		runStatus.name = name;
		runStatus.version = version || "null";

		var key = password + "|" + version;

		rsvr(url, name, key, hdlr);
	},
	stop: function() {
		console.notice("proxy client is stopping")
		isStop = true;
	},
	info: function() {
		return runStatus;
	}
}