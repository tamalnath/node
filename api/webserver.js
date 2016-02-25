const http = require('http');
const fs = require('fs');
const path = require('path');
const mimeTypes = {
	'.html'  : 'text/html',
	'.css'   : 'text/css',
	'.js'	: 'text/javascript',
	'.png'   : 'image/png',
	'.jpg'   : 'image/jpg'
};
const port = process.argv[2] || 8080;
const base = process.argv[3] || process.cwd();
http.createServer(createServer).listen(port);
console.log('Serving ' + base + ' at http://127.0.0.1:' + port + '/');

function createServer (request, response) {
	var fsPath = request.url;
	fs.stat(base + fsPath, stat);

	function stat(err, stats) {
		if (err) {
			if (err.code === 'ENOENT') {
				response.writeHead(404);
				response.end('404 : ' + fsPath + ' Not found');
			} else {
				response.writeHead(403);
				response.end('500 : ' + fsPath + ' returns error: ' + err.code);
				console.log(err);
			}
			return;
		}
		if (stats.isDirectory()) {
			if (!fsPath.endsWith('/')) {
				fsPath += '/';
			}
			fsPath += 'index.html';
			fs.stat(base + fsPath, stat);
		} else if (stats.isFile()) {
			var headers = {
				'Content-Length' : stats.size,
				'Last-Modified' : stats.mtime.toUTCString(),
			};
			const contentType = mimeTypes[path.extname(fsPath)];
			if (contentType) {
				headers['Content-Type'] = contentType;
			}
			var modifiedSince = request.headers['if-modified-since'];
			if (modifiedSince) {
				modifiedSince = new Date(modifiedSince);
			}
			if (modifiedSince && stats.mtime.getTime() > modifiedSince.getTime()) {
				response.writeHead(304, headers);
				response.end();
			} else {
				if (fsPath.startsWith('/api/') && fsPath.endsWith('.js')) {
					const script = require(base + fsPath);
					if (typeof script.execute === 'function') {
						script.execute(request, response);
					}
					response.end();
				} else {
					response.writeHead(200, headers);
					fs.createReadStream(base + fsPath).pipe(response);
				}
			}
		} else {
			response.writeHead(403);
			response.end('403 : ' + fsPath + ' Not a regular file');
		}
	}
}
