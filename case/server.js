var rproxy = require("../index");

rproxy.server.run({
    // config
    server_timeout: 5 * 1000,
	client_timeout: 5 * 1000,
	domain: ["d3j.io"],
	port: 9988,
	error_domain: `HTTP/1.0 500\n\n unknown domain`,
	error_timeout: `HTTP/1.0 500\n\n server not online`
});