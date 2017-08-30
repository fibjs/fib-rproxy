var coroutine = require("coroutine");
var util = require("util");
var http = require("http");
var mq = require("mq");
var io = require("io");
var net = require("net");
var isStop = false;
var runStatus = {
	list: {}
};
var Hosts = [];
var Handlers = {};

function initHosts() {
	Hosts = [];
	for (var k in Handlers) {
		Hosts.push(k);
	}
}

function rsvr(proxy, key) {
	function one_conn() {
		if (!Hosts.length) {
			coroutine.sleep(1 * 1000);
			return;
		}

		var sock = net.connect(proxy);

		sock.write("saas " + Hosts.join(",") + ":" + key + "\r\n");

		var bs = new io.BufferedStream(sock);
		bs.EOL = "\r\n";

		var k = Number(bs.readLine()),
			hdlr = Handlers[k];
		if (k && hdlr) {
			runStatus.list[k] = new Date();
			mq.invoke(hdlr, bs, () => sock.close());
		} else
			sock.close(() => {});
	}

	function worker() {
		while (!isStop) {
			try {
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
	handlers: {
		put: function(k, v) {
			if (Handlers[k]) return {
				error: " handler is exist"
			};

			Handlers[k] = v;

			initHosts();
		},
		remove: function(k) {
			delete Handlers[k];

			initHosts();
		}
	},
	run: function(config) {
		var url = config.url,
			password = config.password,
			version = config.version,
			handlers = config.handlers;

		Handlers = util.extend(Handlers, handlers);

		console.notice("proxy client is running");

		runStatus.url = url;

		runStatus.version = version || "null";

		initHosts();

		var key = password + "|" + version;

		rsvr(url, key);
	},
	stop: function() {
		console.notice("proxy client is stopping")
		isStop = true;
	},
	info: function() {
		runStatus.hosts = Hosts;
		return runStatus;
	}
}