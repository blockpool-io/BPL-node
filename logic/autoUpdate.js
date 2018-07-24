'use strict';
var constants = require('../constants.json');
//var sql = require('../sql/autoUpdate.js');

// Private fields
var modules, library;

// Constructor
function AutoUpdate () {}

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
	if (!trs.asset || !trs.asset.autoUpdate) {
		return cb('Invalid transaction asset.');
	}
	if (!trs.asset.autoUpdate.versionLabel) {
		return cb('Invalid version label asset.');
	}
	//TODO validate ipfsHash length
	if (!trs.asset.autoUpdate.ipfsHash && !trs.asset.autoUpdate.ipfsHash.length) {
		return cb('Invalid IPFS hash asset.');
	}
	//TODO validate if triggerHeight is greater than current height
	if (!trs.asset.autoUpdate.triggerHeight) {
		return cb('Invalid trigger height asset.');
	}
	if (!trs.asset.autoUpdate.ipfsPath && !trs.asset.autoUpdate.ipfsPath.length) {
		return cb('Invalid IPFS path asset.');
	}
	//TODO validate if this tx id exists
	if (trs.asset.autoUpdate.verifyingTransactionId === undefined) {
		return cb('Invalid verifying transaction id asset.');
	}

	return cb(null, trs);
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
	if(!trs.asset.autoUpdate.ipfsHash) {
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
	//TODO see if below code is needed
	var data = {
		address: sender.address
	};

	modules.accounts.setAccountAndGet(data, cb);
};

//
//__API__ `undo`

//
AutoUpdate.prototype.undo = function (trs, block, sender, cb) {
	modules.accounts.setAccountAndGet({address: trs.recipientId}, function (err, recipient) {
		if (err) {
			return cb(err);
		}

		modules.accounts.mergeAccountAndGet({
			address: trs.recipientId,
			balance: -trs.amount,
			u_balance: -trs.amount,
			blockId: block.id,
			round: modules.rounds.getRoundFromHeight(block.height)
		}, cb);
	});
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
		//  triggerHeight: 1000,
		//  verifyingTransactionId: null
		versionLabel: {
			type: 'string',
		},
		ipfsHash: {
			type: 'string'
		},
		ipfsPath: {
			type: 'string'
		}
	},
	required: ['versionLabel', 'ipfsHash', 'ipfsPath']
};

//
//__API__ `objectNormalize`

//
AutoUpdate.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset.autoUpdate, AutoUpdate.prototype.schema);

	if (!report) {
		throw 'Failed to validate autoupdate schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

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
AutoUpdate.prototype.dbTable = 'autoupdate';

AutoUpdate.prototype.dbFields = [
	'transactionId',
	'versionLabel',
	'triggerHeight',
	'ipfsHash',
	'ipfsPath',
	'verifyingTransactionId'
];

AutoUpdate.prototype.dbSave = function (trs) {
	if(trs.asset.autoUpdate.verifyingTransactionId)
	{
		return {
			table: this.dbTable,
			fields: this.dbFields,
			values: {
				transactionId: trs.id,
				versionLabel: trs.asset.autoUpdate.versionLabel,
				triggerHeight: trs.asset.autoUpdate.triggerHeight,
				ipfsHash: trs.asset.autoUpdate.ipfsHash,
				ipfsPath: trs.asset.autoUpdate.ipfsPath,
				verifyingTransactionId: trs.asset.autoUpdate.verifyingTransactionId
			}
		};
	}
	return null;
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
