var net = require("net");
var io = require("io");
var mq = require("mq");

var config = {
	timeout: 5 * 1000,
	domain: "d3j.io",
	port: 9980,
	error_domain: `HTTP/1.0 500\n\n unknown domain`,
	error_timeout: `HTTP/1.0 500\n\n server not online`
};

function ConnPool(is_client) {
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
		var now = new Date();

		for (var k in pool) {
			var conns = pool[k];
			while (conns.length > 0) {
				var conn = conns[0];
				if (now - conn.date > config.timeout) {
					if (is_client) {
						conn.write(config.error_timeout,
							() => conn.aw.end());
					} else
						conn.aw.end();
					conns = conns.slice(1);
				} else
					break;
			}

			if (conns.length == 0)
				delete pool[k];
		}
	}, 200);
}

var servers = new ConnPool();
var clients = new ConnPool(true);

function link(server, client) {
	function end() {
		server.aw.end();
		client.aw.end();
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
var re_host = /host: *(\w+)\.([^:]+)(:[0-9]+)?/i;

var svr = new net.TcpServer(config.port, (c) => {
	var first_req = ["ok"];
	var aw = mq.await();
	var bs = new io.BufferedStream(c);
	bs.EOL = "\r\n";

	function new_line(err, line) {
		if (err)
			return aw.end();

		first_req.push(line);

		var m = re_host.exec(line);
		if (m) {
			if (m[2] != config.domain)
				return c.write(config.error_domain,
					() => aw.end());

			bs.first_req = first_req;

			var host = m[1];
			var server = servers.get(host);
			bs.aw = aw;
			if (server)
				link(server, bs);
			else
				clients.put(host, bs);
		} else
			bs.readLine(new_line);
	}

	function first_line(err, line) {
		if (err)
			return aw.end();

		var m = re_server.exec(line);
		if (m) {
			if (m[2] != "123456") // password
				return aw.end();

			var host = m[1];
			var client = clients.get(host);
			c.aw = aw;
			if (client)
				link(c, client);
			else
				servers.put(host, c);
		} else
			return new_line(err, line);
	}

	bs.readLine(first_line);

	return aw;
});

svr.run(() => {});