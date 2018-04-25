'use strict';

var os = require('os');
const PublicIp = require('public-ip');
var Router = require('../helpers/router.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

// Constructor
function System (cb, scope) {
	library = scope;
	self = this;

	__private.version = library.config.version;
	__private.port = library.config.port;
	__private.nethash = library.config.nethash;
	__private.osName = os.platform() + os.release();

	return cb(null, self);
}

// Private methods
__private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	});

	router.map(shared, {
		'get /getPublicIp': 'getPublicIp'
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: 'API endpoint not found'});
	});

	library.network.app.use('/api/system', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error('API error ' + req.url, err);
		res.status(500).send({success: false, error: 'API error: ' + err.message});
	});
};

// Public methods
//
//__API__ `getOS`

//
System.prototype.getOS = function () {
	return __private.osName;
};

//
//__API__ `getVersion`

//
System.prototype.getVersion = function () {
	return __private.version;
};

//
//__API__ `getPort`

//
System.prototype.getPort = function () {
	return __private.port;
};

//
//__API__ `getNethash`

//
System.prototype.getNethash = function () {
	return __private.nethash;
};

// Events
//
//__EVENT__ `onBind`

//
System.prototype.onBind = function (scope) {
	modules = scope;
};

//
//__API__ `isMyself`

//
System.prototype.isMyself = function (peer) {
	var interfaces = os.networkInterfaces();
	return Object.keys(interfaces).some(function(family){
		return interfaces[family].some(function(nic){
			return nic.address == peer.ip && peer.port == __private.port;
		});
	});
}

// Shared
shared.getPublicIp = function (req, cb) {
	PublicIp.v4().then(ip => {
    	return cb(null, {publicIp: ip});
	});
};

//
//__EVENT__ `onAttachPublicApi`

//
System.prototype.onAttachPublicApi = function () {
 	__private.attachApi();
};

// Export
module.exports = System;
