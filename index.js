var http = require('http');
var async = require('async');
fs = require('fs')

var config = {'myPort': 8080};

if(!process.env.PING_PORTS){
	// read config file (please setup the right path)
	fs.readFile('./config', 'utf8', function (err,data) {
  		if (err) {
    			console.log('error loading config file: '+err);
    			process.exit(-1);
  		}
  		config.ports = data.trim().split(';');
  		console.log('Will ping those ports: '+config.ports);
	});
}else{
	config.ports = process.env.PING_PORTS.trim().split(';');
	console.log('Will ping those ports: '+config.ports);
}

function getLocalPing(port) {
	return function(callback) {
		var request = http.request({host: 'localhost', port: port, path: '/ping', method: 'GET' } , function(res) {
			// error if statusCode != 200
		    callback((res.statusCode != 200)?true:null, res.statusCode);
		});
		request.on('error', function(e) {
			callback(true, 500);
		});
		request.end();
	}
}

// send http response to the client
function sendResponse(response, code, message) {
  response.writeHead(code, {'Content-Type': 'text/plain'})
  response.write(message)
  response.end();
}


var server = http.createServer(function(request, response) {

	// build list of functions to be executed in parallel
	var localCalls = {};
	for (var i in config.ports) {
		localCalls[config.ports[i]] = getLocalPing(config.ports[i]);
	}

	// parallel execution of all the calls and send response when all terminated
	async.parallel(localCalls, function(err, results) {
		var resultsStr = ((err !== null)?'failed':'ok');
		var returnCode = (err !== null)?500:200;
		sendResponse(response, returnCode, resultsStr);
	});
});

// start http server
server.listen(config.myPort, function() {
	console.log('Listening on '+config.myPort);
});


