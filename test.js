var test = require("test");
test.setup();

var io = require("io");
var net = require("net");
var http = require("http");
var coroutine = require("coroutine");
var server = require("./lib/server");
var client = require("./lib/client");

coroutine.start(function() {
	server.run({
		server_timeout: 5 * 1000
	});
});

coroutine.sleep(10);

describe("fibyun", () => {
	describe("server", () => {
		it("disconnect on error key", () => {
			var sock = net.connect("tcp://127.0.0.1:9980");
			sock.write("server lion:1234\r\n");
			var t1 = new Date();
			assert.equal(sock.read(), null);
			assert.lessThan(new Date() - t1, 1000);
		});

		it("disconnect on timeout", () => {
			var sock = net.connect("tcp://127.0.0.1:9980");
			sock.write("server lion:123456\r\n");

			var t1 = new Date();
			assert.equal(sock.read(), null);
			assert.greaterThan(new Date() - t1, 5000);
		});
	});

	describe("client", () => {
		it("disconnect on error domain", () => {
			var sock = net.connect("tcp://127.0.0.1:9980");
			sock.write("GET / HTTP\r\nhost: lion.baidu.com\r\n");
			var t1 = new Date();
			assert.equal(sock.read().toString(), "HTTP/1.0 500\n\n unknown domain");
			assert.lessThan(new Date() - t1, 1000);
		});

		it("disconnect on timeout", () => {
			var sock = net.connect("tcp://127.0.0.1:9980");
			sock.write("GET / HTTP\r\nhost: lion.d3j.io\r\n");

			var t1 = new Date();
			assert.equal(sock.read().toString(), "HTTP/1.0 500\n\n server not online");
			assert.greaterThan(new Date() - t1, 5000);
		});

		it("accept with post", () => {
			var sock = net.connect("tcp://127.0.0.1:9980");
			sock.write("GET / HTTP\r\nhost: lion.d3j.io:9980\r\n");

			var t1 = new Date();
			assert.equal(sock.read().toString(), "HTTP/1.0 500\n\n server not online");
			assert.greaterThan(new Date() - t1, 5000);
		});
	});

	it("link", () => {
		var req = [
			"GET / HTTP",
			"host: lion.d3j.io",
			"something else"
		];

		var sock = net.connect("tcp://127.0.0.1:9980");
		sock.write("server lion:123456\r\n");

		var client = net.connect("tcp://127.0.0.1:9980");
		client.write(req.join("\r\n") + "\r\n");

		var bs = new io.BufferedStream(sock);
		bs.EOL = "\r\n";

		var t1 = new Date();
		assert.equal(bs.readLine(), "ok");
		assert.lessThan(new Date() - t1, 1000);

		req.forEach((line) => {
			var t1 = new Date();
			assert.equal(bs.readLine(), line);
			assert.lessThan(new Date() - t1, 1000);
		});
	});

	it("link-saas", () => {
		var req = [
			"GET / HTTP",
			"host: lion.d3j.io",
			"something else"
		];

		var sock = net.connect("tcp://127.0.0.1:9980");
		sock.write("saas lion,lion2:123456\r\n");

		var client = net.connect("tcp://127.0.0.1:9980");
		client.write(req.join("\r\n") + "\r\n");

		var bs = new io.BufferedStream(sock);
		bs.EOL = "\r\n";

		var t1 = new Date();
		assert.equal(bs.readLine(), "lion");
		assert.lessThan(new Date() - t1, 1000);

		req.forEach((line) => {
			var t1 = new Date();
			assert.equal(bs.readLine(), line);
			assert.lessThan(new Date() - t1, 1000);
		});
	});

	it("link-hosts", () => {
		var req = [
			"GET / HTTP",
			"host: lion3.d3j.io",
			"something else"
		];

		var sock = net.connect("tcp://127.0.0.1:9980");
		sock.write("saas lion,lion2,lion3:123456\r\n");

		var client = net.connect("tcp://127.0.0.1:9980");
		client.write(req.join("\r\n") + "\r\n");

		var bs = new io.BufferedStream(sock);
		bs.EOL = "\r\n";

		var t1 = new Date();
		assert.equal(bs.readLine(), "lion3");
		assert.lessThan(new Date() - t1, 1000);

		req.forEach((line) => {
			var t1 = new Date();
			assert.equal(bs.readLine(), line);
			assert.lessThan(new Date() - t1, 1000);
		});
	});

	oit("client handler", () => {
		client.run({
		 url: "tcp://127.0.0.1:9980",
		 password: "123456",
		 handlers: {
		  lion4: new http.Handler(function (r) {
		   r.response.write('hello');
		  })
		 }
		});

		var conn = net.connect("tcp://127.0.0.1:9980");
		conn.write("GET / HTTP/1.0\r\nHost: lion4.d3j.io\r\n\r\n");

		var data = conn.recv();
		console.log(data.toString());

		coroutine.sleep(10000000)

	   });
});

test.run(console.DEBUG);
process.exit(0);