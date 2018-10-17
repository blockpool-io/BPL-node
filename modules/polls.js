"use strict";

var genesisblock = null;
var OrderBy = require("../helpers/orderBy.js");
var Router = require("../helpers/router.js");
var schema = require("../schema/polls.js");
var sql = require("../sql/polls.js");
var Poll = require("../logic/poll.js");
var epochTime = require("../constants.json").epochTime;
var transactionTypes = require("../helpers/transactionTypes.js");

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};

// Constructor
function Polls (cb, scope) {
	library = scope;
	genesisblock = library.genesisblock;
	self = this;

	__private.assetTypes[transactionTypes.POLL] = library.logic.transaction.attachAssetType(
		transactionTypes.POLL, new Poll()
	);

	return cb(null, self);
}

// Private methods
__private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) { return next(); }
		res.status(500).send({success: false, error: "Blockchain is loading"});
	});

	router.map(shared, {
		"get /getPollResults": "getPollResults",
		"get /": "getPolls",
		"get /get": "getPoll"
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: "API endpoint not found"});
	});

	library.network.app.use("/api/polls", router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error("API error " + req.url, err);
		res.status(500).send({success: false, error: "API error", message: err.message});
	});
};

// Private methods

__private.getAllPolls = function (cb) {
	library.db.query(sql.getAllPolls).then(function (rows) {
		var count = rows.length ? rows[0].count : 0;
		if (!rows.length) {
			return cb("Polls not found");
		}
		return cb(null, { polls: rows });
	}).catch(function (err) {
		library.logger.error("stack", err);
		return cb("Polls#getAllPolls error" + err);
	});
};

__private.getPoll = function (name, cb) {
	library.db.query(sql.getPoll, { name: name }).then(function (rows) {
		var count = rows.length ? rows[0].count : 0;
		if (!rows.length) {
			return cb("Poll not found: " + name);
		}
		return cb(null, { polls: rows });
	}).catch(function (err) {
		library.logger.error("stack", err);
		return cb("Polls#getPoll error" + err);
	});
};

__private.getPollByAddress = function (address, cb) {
	library.db.query(sql.getPollByAddress, { address: address }).then(function (rows) {
		var count = rows.length ? rows[0].count : 0;
		if (!rows.length) {
			return cb("Poll not found: " + address);
		}
		return cb(null,{ poll:rows[0] });
	}).catch(function (err) {
		library.logger.error("stack", err);
		return cb("Polls#getPoll error" + err);
	});
};


// Events
//
//__EVENT__ `onBind`

//
Polls.prototype.onBind = function (scope) {
	modules = scope;

	__private.assetTypes[transactionTypes.POLL].bind({
		modules: modules, library: library
	});
};


//
//__EVENT__ `onAttachPublicApi`

//
Polls.prototype.onAttachPublicApi = function () {
	__private.attachApi();
};

//
//__EVENT__ `onPeersReady`

//
Polls.prototype.onPeersReady = function () {
};

Polls.prototype.isDuplicateAddress = function (address, cb) {
	library.db.query(sql.countByAddress, { address: address }).then(function (rows) {
		if (parseInt(rows[0].count)) {
			return cb(true);
		}
		return cb(null,true);
	}).catch(function (err) {
		library.logger.error("stack", err);
		return cb("Polls#getContract error");
	});
};


Polls.prototype.isDupliateIntentions = function (intentions) {
	for(var i=0; i<intentions.length-1; i++) {
		for(var j=i+1; j<intentions.length; j++) {
			if(intentions[i]==intentions[j])
			{
				return true;
			}
		}
	}
	return false;
};
// Shared
shared.getPollResults = function (req, cb) {
	library.schema.validate(req.body, schema.getPollResults, function (err) {
		if (err) {
			return cb(err[0].message);
		}
		__private.getPollByAddress(req.body.address,function(error,result){
			if(error){
				return cb(error);
			}
			else{
				library.db.query(sql.getPollResultByAddress, { address: req.body.address }).then(function (rows) {
					return cb(null, { results: rows });
				}).catch(function (err) {
					library.logger.error("stack", err);
					return cb("Polls#getContract error");
				});
			}
		});
	});
};

shared.getPolls = function (req, cb) {
	library.schema.validate(req.body, schema.getPolls, function (err) {
		if (err) {
			return cb(err[0].message);
		}
		__private.getAllPolls(function (err, res) {
			if (err) {
				cb(err);
			}
			else {
				cb(null, res);
			}
		});
	});
};

shared.getPoll = function (req, cb) {
	library.schema.validate(req.body, schema.getPoll, function (err) {
		if (err) {
			return cb(err[0].message);
		}
		if (req.body.name) {
			__private.getPoll(req.body.name, function (err, res) {
				if (err) {
					cb(err);
				}
				else {
					cb(null, res);
				}
			});
		}
		else if (req.body.address) {
			__private.getPollByAddress(req.body.address, function (err, res) {
				if (err) {
					cb(err);
				}
				else {
					cb(null, res);
				}
			});
		}
		else {
			return cb("Missing required property name or address");
		}
	});
};
// Export
module.exports = Polls;
