var util = require("util");
var net = require("net");
var io = require("io");
var runStatus = {};
var Saas = {};

function stats(cloudid, version) {
	var v = runStatus[version] || {};

	v[cloudid] = new Date();

	runStatus[version] = v;
}

var config = {
	server_timeout: 5 * 1000,
	client_timeout: 5 * 1000,
	domain: ["d3j.io"],
	port: 9980,
	error_domain: `HTTP/1.0 500\n\n unknown domain`,
	error_timeout: `HTTP/1.0 500\n\n server not online`
};

function ConnPool(is_client) {
	var _timeout = is_client ? config.client_timeout : config.server_timeout;
	var pool = {};

	this.get = (host) => {
		var conns = pool[host];
		if (!conns)
			return;

		var conn = conns.pop();
		if (conns.length == 0)
			delete pool[host];

		return conn;
	}

	this.put = (host, c) => {
		var conns = pool[host];
		if (!conns)
			pool[host] = conns = [];

		c.date = new Date();
		conns.push(c);
	}

	// timeout
	setInterval(() => {
		function conn_timeout(conn) {
			if (is_client) {
				conn.write(config.error_timeout, () => conn.done());
			} else
				conn.done();
		}
		var now = new Date();

		for (var k in pool) {
			var conns = pool[k];
			while (conns.length > 0) {
				var conn = conns[0];
				if (now - conn.date > _timeout) {
					pool[k] = conns = conns.slice(1);
					conn.is_closed = true;
					conn_timeout(conn);
				} else
					break;
			}

			if (conns.length == 0)
				delete pool[k];
		}
	}, 200);
}

var servers;
var clients;

function link(server, client) {
	function end() {
		server.done();
		client.done();
	}

	server.write(client.first_req.join("\r\n") + "\r\n",
		(err) => {
			if (err)
				end();
			else
				io.bridge(server, client, end);
		});
}

var re_server = /server (\w+):(.+)/;
var re_saas = /saas ([0-9a-zA-Z,]+):(.+)/;

var re_host = /host: *(\w+)\.([^:]+)(:[0-9]+)?/i;

module.exports = {
	run: function(d) {
		d = d || {};

		servers = new ConnPool();
		clients = new ConnPool(true);
		config = util.extend(config, d);

		var svr = new net.TcpServer(config.port, util.sync((c, done) => {
			var first_req = ["ok"];
			var bs = new io.BufferedStream(c);
			bs.EOL = "\r\n";

			function new_line(err, line) {
				if (err || line === null)
					return done();

				first_req.push(line);

				var m = re_host.exec(line);
				if (m) {
					if (config.domain.indexOf(m[2]) === -1)
						return c.write(config.error_domain, done);



					var host = m[1];
					var server = servers.get(host);

					if (Saas[host]) first_req[0] = host; //????????????nat client????????????????????????cloudi??????

					bs.first_req = first_req;

					bs.done = done;
					if (server)
						link(server, bs);
					else
						clients.put(host, bs);
				} else
					bs.readLine(new_line);
			}

			function first_line(err, line) {
				var issaas = false;
				if (err || line === null)
					return done();

				var m = re_server.exec(line);

				if (!m) {
					m = re_saas.exec(line);
					issaas = true;
				}

				if (m) {
					var key = (m[2] || "").split("|"); //password|version
					var password = key[0],
						version = key[1] || "null";

					if (password != "123456") // password
						return done();

					var host = m[1];

					var hosts = host.split(",");

					hosts.forEach(function(h) {
						stats(h, version);

						if (issaas) Saas[h] = 1; //?????????T1???????????????????????????????????????cloudid??????
					});

					var client;

					hosts.some(function(h) {
						//?????????????????????
						var c1 = clients.get(h);
						if (c1) {
							client = c1;
							return true;
						} else {
							return false;
						}
					});

					c.done = done;
					if (client) {
						link(c, client);
					} else {
						hosts.forEach(function(h) {
							servers.put(h, c);
						});
					}
				} else
					return new_line(err, line);
			}

			bs.readLine(first_line);
		}));
		svr.start();
	},
	info: function() {
		var live = 0,
			info = {};
		for (var version in runStatus) {
			var data = runStatus[version];

			for (var cloudid in data) {
				if (new Date().getTime() - new Date(data[cloudid]).getTime() > 10 * 1000) {
					delete data[cloudid];
				} else {
					live++;
					var c = info[version] || 0;
					c++;
					info[version] = c;
				}
			}
		};

		return {
			live: live,
			info: info,
			list: runStatus
		};
	}
};