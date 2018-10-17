'use strict';

var async = require('async');
var constants = require('../constants.json');
var sql = require('../sql/autoUpdates.js');

// Private fields
var modules, library, __private = {};

// Constructor
function AutoUpdate () {}

//Private methods
__private.getDuplicate = function (data, cb) {
	var where = [], params = {};

	where.push('"versionLabel" = ${versionLabel}');
	where.push('"triggerHeight" = ${triggerHeight}');
	where.push('"ipfsHash" = ${ipfsHash}');

	if (data.verifyingTransactionId) {
		where.push('"verifyingTransactionId" = ${verifyingTransactionId}');
		if (data.cancellationStatus) {
			where.push('"cancellationStatus" = TRUE');
		}
		else {
			where.push('"cancellationStatus" = FALSE');
		}
	}
	else {
		where.push('"verifyingTransactionId" IS NULL');
	}

	params.versionLabel = data.versionLabel;
	params.triggerHeight = data.triggerHeight;
	params.ipfsHash = data.ipfsHash;
	params.verifyingTransactionId = data.verifyingTransactionId;
	params.cancellationStatus = data.cancellationStatus;

	library.db.query(sql.getDuplicate({where: where}), params).then(function (rows) {
		if(rows.length) {
			return cb(rows[0].transactionId);
		}

		return cb(null);
	}).catch(function (err) {
		library.logger.error('stack', err.stack);
		return cb('Failed to get duplicate autoupdate transaction.');
	});
};

// Public methods
//
//__API__ `bind`

//
AutoUpdate.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
};

//
//__API__ `create`

//
AutoUpdate.prototype.create = function (data, trs) {
	trs.recipientId = null;
	trs.amount = 0;

	return trs;
};

//
//__API__ `calculateFee`

//
AutoUpdate.prototype.calculateFee = function (trs) {
	return constants.fees.autoupdate;
};

//
//__API__ `verify`

//
AutoUpdate.prototype.verify = function (trs, sender, cb) {
	if (trs.senderPublicKey !== constants.autoupdate.senderPublicKey) {
		return cb('Invalid sender public key.');
	}
	if (!trs.asset || !trs.asset.autoUpdate) {
		return cb('Invalid transaction asset.');
	}
	if (!trs.asset.autoUpdate.versionLabel && !trs.asset.autoUpdate.versionLabel.length) {
		return cb('Invalid version label asset.');
	}
	if (!trs.asset.autoUpdate.ipfsHash && trs.asset.autoUpdate.ipfsHash.length === 46) {
		return cb('Invalid IPFS hash asset.');
	}
	if (!trs.asset.autoUpdate.triggerHeight) {
		return cb('Invalid trigger height asset.');
	}
	else {
		var block = modules.blockchain.getLastBlock();
		//Autoupdate trigger needs to be minimum 5760(i.e blocks generated in 1 day) blocks ahead of current height
		if (trs.asset.autoUpdate.triggerHeight <= (block.height /*+ 5760*/)) {
			return cb('Invalid trigger height asset.');
		}
	}
	if (!(trs.asset.autoUpdate.cancellationStatus === true || trs.asset.autoUpdate.cancellationStatus === false)) {
		return cb('Invalid cancellation status asset.');
	}
	if (!trs.asset.autoUpdate.verifyingTransactionId) {
		trs.asset.autoUpdate.verifyingTransactionId = null;
	}
	else if (trs.asset.autoUpdate.verifyingTransactionId === null && trs.asset.autoUpdate.cancellationStatus === true) {
		return cb('Invalid cancellation status asset for first autoupdate transaction.');
	}


	async.parallel([
		function(callback) {
			__private.getDuplicate(trs.asset.autoUpdate, function(res) {
				if (res) {
					callback('Duplicate autoupdate transaction.');
				}
				else {
					callback(null);
				}
			});
		},
		function(callback) {
			if (trs.asset.autoUpdate.verifyingTransactionId) {
				modules.autoupdates.verifyTransactionAsset(trs.asset.autoUpdate, function (err) {
					if (err) {
						callback(err);
					}
					else {
						callback(null);
					}
				});
			}
			else {
				callback(null);
			}
		}
	], function(err) {
		if(err) {
			return cb(err);
		}
		else {
			return cb(null, trs);
		}
	});
};

//
//__API__ `process`

//
AutoUpdate.prototype.process = function (trs, sender, cb) {
	return cb(null, trs);
};

//
//__API__ `getBytes`

//
AutoUpdate.prototype.getBytes = function (trs) {
	if (!trs.asset.autoUpdate.ipfsHash) {
		return null;
	}

	var buf;

	try {
		buf = new Buffer(trs.asset.autoUpdate.ipfsHash, 'utf8');
	} catch (e) {
		throw e;
	}

	return buf;
};

//
//__API__ `apply`

//
AutoUpdate.prototype.apply = function (trs, block, sender, cb) {
	modules.accounts.setAccountAndGet({address: sender.address}, cb);
};

//
//__API__ `undo`

//
AutoUpdate.prototype.undo = function (trs, block, sender, cb) {
	modules.accounts.setAccountAndGet({address: sender.address}, cb);
};

//
//__API__ `applyUnconfirmed`

//
AutoUpdate.prototype.applyUnconfirmed = function (trs, sender, cb) {
	return cb(null, trs);
};

//
//__API__ `undoUnconfirmed`

//
AutoUpdate.prototype.undoUnconfirmed = function (trs, sender, cb) {
	return cb(null, trs);
};

AutoUpdate.prototype.schema = {
	id: 'Update',
	type: 'object',
	properties: {
		transactionId: {
			type: 'string'
		},
		triggerHeight: {
			type: 'integer',
		},
		versionLabel: {
			type: 'string',
		},
		ipfsHash: {
			type: 'string'
		},
		cancellationStatus: {
			type: 'boolean'
		}
	},
	required: ['transactionId','triggerHeight','versionLabel', 'ipfsHash', 'cancellationStatus']
};

//
//__API__ `objectNormalize`

//
AutoUpdate.prototype.objectNormalize = function (trs) {
	//  var report = library.schema.validate(trs.asset.autoUpdate, AutoUpdate.prototype.schema);
	//
	// if (!report) {
	// 	throw 'Failed to validate autoupdate schema: ' + this.scope.schema.getLastErrors().map(function (err) {
	// 		return err.message;
	// 	}).join(', ');
	// }

	return trs;
};

//
//__API__ `dbRead`

//
AutoUpdate.prototype.dbRead = function (raw) {
	return null;
};

//
//__API__ `dbSave`

//
AutoUpdate.prototype.dbTable = 'autoupdates';

AutoUpdate.prototype.dbFields = [
	'transactionId',
	'versionLabel',
	'triggerHeight',
	'ipfsHash',
	'verifyingTransactionId',
	'cancellationStatus'
];

AutoUpdate.prototype.dbSave = function (trs) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			transactionId: trs.id,
			versionLabel: trs.asset.autoUpdate.versionLabel,
			triggerHeight: trs.asset.autoUpdate.triggerHeight,
			ipfsHash: trs.asset.autoUpdate.ipfsHash,
			verifyingTransactionId: trs.asset.autoUpdate.verifyingTransactionId,
			cancellationStatus:trs.asset.autoUpdate.cancellationStatus
		}
	};
};

//
//__API__ `afterSave`

//
AutoUpdate.prototype.afterSave = function (trs, cb) {
	if(!modules.nodeManager.isSyncing() && trs.asset.autoUpdate.verifyingTransactionId && !trs.asset.autoUpdate.cancellationStatus) {
		modules.autoupdates.downloadUpdate(trs.asset.autoUpdate.ipfsHash,trs.asset.autoUpdate.triggerHeight, function (err) {});
	}
	return cb();
};
//
//__API__ `ready`

//
AutoUpdate.prototype.ready = function (trs, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(trs.signatures)) {
			return false;
		}
		return trs.signatures.length >= sender.multimin;
	} else {
		return true;
	}
};

// Export
module.exports = AutoUpdate;
