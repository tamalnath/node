const http = require('http');

http.createServer( (request, response) => {
  	response.writeHead(200, {'Content-Type': 'application/json'});
  	const r = {
  		'method' : request.method,
  		'url' : request.url,
  		'httpVersion' : request.httpVersion,
  		'headers' : request.headers,
  		'connection' : {
  			'remoteAddress' : request.connection.remoteAddress,
  			'remotePort' : request.connection.remotePort
  		}
  	};
  	response.write(JSON.stringify(r, null, 2));
  	response.end();
}).listen(8080);

console.log('Server running at http://127.0.0.1:8080/');
