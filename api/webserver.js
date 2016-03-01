const http = require('http');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

const base = process.argv[3] || process.cwd();
const port = process.argv[2] || 8080;
const pidFile = process.argv[1].replace(/.js$/, '.pid');

if (cluster.isMaster) {
	fs.stat(pidFile, pidStat);
} else {
	http.createServer(createServer).listen(port);
}

function pidStat(error, stats) {
	if (error) {
		if (error.code === 'ENOENT') {
			if (process.argv[2] === 'stop') {
				console.log('Service not started');
				process.exit();
			} else {
				fs.writeFile(pidFile, process.pid, function(error) {
					if (error) {
						throw error;
					}
					fs.watch(pidFile, process.exit);
				});
				var cpus = os.cpus().length;
				var workers = [];
				for (var i = 0; i < cpus; i++) {
					workers[i] = cluster.fork().process.pid;
				}
				console.log('Serving ' + base + ' at http://127.0.0.1:' + port + '/ (Master: ' + process.pid + ', Workers: ' + workers + ')');
				process.on('SIGINT', process.exit);
				process.on('exit', function() {
					console.log('Stopping service');
					fs.unlinkSync(pidFile);
				});
			}
		} else {
			throw error;
		}
	} else {
		if (process.argv[2] === 'stop') {
			fs.unlink(pidFile, function(err) {
				if (err) {
					throw err;
				} else {
					console.log('Service stopped');
					process.exit();
				}
			});
		} else {
			console.log('Service is already started');
			process.exit();
		}
	}
}

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
