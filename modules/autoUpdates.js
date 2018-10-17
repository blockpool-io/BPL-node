'use strict';

var Router = require('../helpers/router.js');
var transactionTypes = require('../helpers/transactionTypes.js');
var AutoUpdate = require('../logic/autoUpdate.js');
var sql = require('../sql/autoUpdates.js');
var schema = require('../schema/autoUpdates.js');
var spawn = require('child_process').spawn;
var version = require('../package.json').version;
var shell = require('shelljs');
var config = require('../'+process.env.CONFIG_NAME);

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};

// Constructor
function AutoUpdates (cb, scope) {
	library = scope;
	self = this;
	__private.downloadSuccess = null;
	__private.downloadInProgress = false;
	__private.assetTypes[transactionTypes.AUTOUPDATE] = library.logic.transaction.attachAssetType(transactionTypes.AUTOUPDATE, new AutoUpdate());
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
		'get /get': 'getAutoUpdate',
		'get /getLatest': 'getLatest'
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: 'API endpoint not found'});
	});

	library.network.app.use('/api/autoUpdates', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error(`API error ${  req.url}`, err);
		res.status(500).send({success: false, error: 'API error', message: err.message});
	});
};


__private.switchCodebase = function () {
	if (__private.downloadSuccess) {
		__private.downloadSuccess = false;
		var result = spawn('bash',['scripts/switchCodebase.sh', process.env.CONFIG_NAME, process.env.GENESIS_NAME, config.port]);
		result.on('close', function(code) {
			if (code) {
				library.logger.error('Switch code base was successful');
			}
			else {
				library.logger.error('Switch code base exited with exit code - ', code);
			}
		});
	}
};

// Shared
shared.getLatest = function (req, cb) {
	library.db.query(sql.getAllById).then(function (rows) {
		if(rows.length) {
			var lastRow = rows[rows.length-1];

			library.db.query(sql.getByTransactionId, { transactionId:lastRow.transactionId}).then(function (row) {
				if(row.length) {
					return cb(null, { update: row[0] });
				}
				return cb('Couldn\'t find latest auto update.');
			}).catch(function (err) {
				library.logger.error('stack', err.stack);
				return cb('Couldn\'t find latest auto update.');
			});
		}
		else {
			return cb('Couldn\'t find latest auto update.');
		}
	}).catch(function (err) {
		library.logger.error('stack', err.stack);
		return cb('Failed to get latest update.');
	});
};

shared.getAutoUpdate = function (req, cb) {
	library.schema.validate(req.body, schema.getAutoUpdate, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		library.db.query(sql.getByTransactionId, { transactionId:req.body.id}).then(function (row) {
			if(row.length) {
				return cb(null, { update: row[0] });
			}

			return cb('Couldn\'t find auto update: '+req.body.id);
		}).catch(function (err) {
			library.logger.error('stack', err.stack);
			return cb('Failed to get update.');
		});
	});
};

AutoUpdates.prototype.verifyTransactionAsset = function (data, cb) {
	library.db.query(sql.getByTransactionId, { transactionId: data.verifyingTransactionId}).then(function (rows) {
		if (rows.length) {
			var valid = true, msg = '';

			for (var prop in rows[0]) {
				switch (prop) {
				case 'versionLabel': if(data.versionLabel !== rows[0].versionLabel) {
					valid = false;
					msg = 'Invalid transaction version label asset.';
				}
					break;
				case 'triggerHeight': if(data.triggerHeight !== rows[0].triggerHeight) {
					valid = false;
					msg = 'Invalid transaction trigger height asset.';
				}
					break;
				case 'ipfsHash': if(data.ipfsHash !== rows[0].ipfsHash) {
					valid = false;
					msg = 'Invalid transaction IPFS hash asset.';
				}
					break;
				default: break;
				}
				if (!valid) {
					return cb(msg);
				}
			}
			return cb(null);
		}
		return cb ('Invalid verifying transaction id.');
	}).catch(function (err) {
		library.logger.error('stack', err.stack);
		return cb('Failed to get verifying transaction.');
	});
};

AutoUpdates.prototype.checkAutoUpdate = function (height) {
	library.db.query(sql.getByTriggerHeight, { height: height}).then(function (rows) {
		if (rows.length) {
			var cancelUpdate = false;
			for (var i=0; i<rows.length; i++) {
				if (rows[i].cancellationStatus) {
					cancelUpdate = rows[i].cancellationStatus;
					break;
				}
			}

			if (!cancelUpdate) {
				self.verifyTransactionAsset(rows[0], function (err) {
					if (!err) {
						__private.switchCodebase();
					}
				});
			}
		}
	}).catch(function (err) {
		library.logger.error('stack', err.stack);
	});
};

__private.isSoftwareUpToDate = function (cb) {
	var block = modules.blockchain.getLastBlock();
	library.db.query(sql.getLastAppliedAutoUpdate, {height: block.height}).then(function (rows) {
		if (!rows.length) {
			return cb('Couldn\'t find last applied auto update.');
		}

		var nodeVersion = version.split('.');
		var updateVersion = rows[0].versionLabel.split('.');

		if (parseInt(nodeVersion[0]) < parseInt(updateVersion[0])) {
			return cb(null, {status: false, update: rows[0]});
		}
		else if (parseInt(nodeVersion[0]) === parseInt(updateVersion[0])) {
			if (parseInt(nodeVersion[1]) < parseInt(updateVersion[1])) {
				return cb(null, {status: false, update: rows[0]});
			}
			else if (parseInt(nodeVersion[1]) === parseInt(updateVersion[1])) {
				if (parseInt(nodeVersion[2]) < parseInt(updateVersion[2])) {
					return cb(null, {status: false, update: rows[0]});
				}
				else if (parseInt(nodeVersion[2]) === parseInt(updateVersion[2])) {
					return cb(null, {status: true});
				}
				// else {
				// 	return cb(null, {status: false, update: rows[0]});
				// }
			}
		}
	});
};


AutoUpdates.prototype.getMissedUpdate = function () {
	__private.isSoftwareUpToDate(function (err, res) {
		if (!err && !res.status) {
			__private.downloadInProgress = true;
			self.downloadUpdate(res.update.ipfsHash, res.update.triggerHeight, function (err) {
				__private.downloadInProgress = false;
				if (!err) {
					self.checkAutoUpdate(res.update.triggerHeight);
				}
			});

		}
	});
};

AutoUpdates.prototype.downloadUpdate = function (hash, triggerHeight, cb) {
	shell.exec('./scripts/downloadUpdate.sh ' + hash + ' ' + triggerHeight + ' ' + config.address + ' ' + config.port,
		function (code, stdout, stderr) {
			if (code) {
				__private.downloadSuccess = false;
				library.logger.error('Get update failed: ', stderr);
				return cb('Get update failed: '+ stderr);
			}
			else {
				__private.downloadSuccess = true;
				library.logger.info('Get update was successful.');
				return cb(null);
			}
		});
};

AutoUpdates.prototype.isSoftwareDownloadInProgress = function () {
	return __private.downloadInProgress;
};


// Events
//
//__EVENT__ `onBind`

//
AutoUpdates.prototype.onBind = function (scope) {
	modules = scope;
	__private.assetTypes[transactionTypes.AUTOUPDATE].bind({
		modules, library
	});
};


// Events
//
//__EVENT__ `onAttachPublicApi`

//
AutoUpdates.prototype.onAttachPublicApi = function () {
	__private.attachApi();
};

// Export
module.exports = AutoUpdates;
