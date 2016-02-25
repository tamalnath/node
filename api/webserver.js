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
const colors = {
	regular : {
		black  : '\x1b[30;2m',
		red    : '\x1b[31;2m',
		green  : '\x1b[32;2m',
		yellow : '\x1b[33;2m',
		blue   : '\x1b[34;2m',
		magenta: '\x1b[35;2m',
		cyan   : '\x1b[36;2m',
		white  : '\x1b[37;2m'
	},
	bold : {
		black  : '\x1b[30;1m',
		red    : '\x1b[31;1m',
		green  : '\x1b[32;1m',
		yellow : '\x1b[33;1m',
		blue   : '\x1b[34;1m',
		magenta: '\x1b[35;1m',
		cyan   : '\x1b[36;1m',
		white  : '\x1b[37;1m'
	},
	reset : '\x1b[0m'
};
const port = process.argv[2] || 8080;
const base = process.argv[3] || process.cwd();
process.title = "Web Server";
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
			log(response.statusCode, fsPath);
			return;
		}
		if (stats.isDirectory()) {
			if (!fsPath.endsWith('/')) {
				fsPath += '/';
			}
			fsPath += 'index.html';
			fs.stat(base + fsPath, stat);
			return;
		}
		if (stats.isFile()) {
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
		log(response.statusCode, fsPath);
	}
}

function log(statusCode, fsPath) {
	console.log(colors.regular.magenta + new Date().toUTCString() + colors.regular.yellow + ' [' + statusCode + '] ' + colors.regular.white + fsPath + colors.reset);
}
