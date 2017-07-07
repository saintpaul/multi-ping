var http = require('http');
var async = require('async');
fs = require('fs')

var config = {
	'myPort': 8080,
	endPoints : []
};

function getEndPointsFromArgs(args) {
	return args.trim().split(';').map(function(url) { 
		var splittedUrl = url.split(':');
		return {
			host : splittedUrl.length > 1 ? splittedUrl[0] : 'localhost',
			port : splittedUrl.length === 0 ? splittedUrl[0] : splittedUrl[1],
		}  
	});
}

if(!process.env.PING_ENDPOINTS){
	// read config file (please setup the right path)
	fs.readFile('./config', 'utf8', function (err,data) {
  		if (err) {
    			console.log('error loading config file: '+err);
    			process.exit(-1);
  		}
  		config.endPoints = getEndPointsFromArgs(data);
  		console.log('Will ping those endPoints: ' + config.endPoints);
	});
}else{
	config.endPoints = getEndPointsFromArgs(process.env.PING_ENDPOINTS);
	console.log('Will ping those endPointss: ' + config.endPoints);
}

function getLocalPing(endPoint) {
	return function(callback) {
		var request = http.request({host: endPoint.host, port: endPoint.port, path: '/ping', method: 'GET' } , function(res) {
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
	for (var i in config.endPoints) {
		localCalls[config.endPoints[i]] = getLocalPing(config.endPoints[i]);
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


