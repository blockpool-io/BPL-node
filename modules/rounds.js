// ### Database Structure
// a table mem_delegates persisting __private.activedelegates with votes, produced and missed blocks total per round
//
// ### rounds.tick(block)
// add block.fees to __private.collectedfees[round]
// push block.generatorPublicKey to __private.forgers[round]
// if end of round detected:
// - distribute fees to __private.activedelegates[round]
// - update stats for delegates that have missed block from __private.forgers[round]
// - calculate __private.activedelegates[round+1] and save to database
// - set __private.collectedfees[round+1] = 0
// - round = __private.current++
//
// ### rounds.backwardTick(block):
// if change to round - 1 detected:
// - sanity check that __private.collectedfees[round] == 0
// - delete __private.activedelegates[round]
// - check we have __private.collectedfees[round-1] and __private.activedelegates[round-1], grab them from database if needed
// - round = __private.current--
// remove block.fees from __private.collectedfees[round]
// pop block.generatorPublicKey from __private.forgers[round]

//

'use strict';

var async = require('async');
var constants = require('../constants.json');
var Router = require('../helpers/router.js');
var schema = require('../schema/rounds.js')
var slots = require('../helpers/slots.js');
var sql = require('../sql/rounds.js');
var crypto = require('crypto');
var bigdecimal = require("bigdecimal");

// managing globals
var modules, library, self, shared = {};


// holding the round state
var __private = {

	// for each round, it stores the active delegates of the round ordered by rank
	// `__private.activedelegates[round] = [delegaterank1, delegaterank2, ..., delegaterank51]`
	activedelegates: {},

	// for each round, store the forgers, so we can update stats about missing blocks
	// `__private.forgers[round] = [forger1, forger2, ..., forgerN]`
	forgers: {},

	// for each round, get the memorize the collected fees
	collectedfees: {},

	// current round
	current: 1

};


// Constructor
function Rounds (cb, scope) {
	library = scope;
	self = this;

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
		'get /lastForgedBlocks': 'getLastForgedBlocks',
		'get /': 'getRound',
	});

	library.network.app.use('/api/rounds', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error('API error ' + req.url, err);
		res.status(500).send({success: false, error: 'API error: ' + err.message});
	});
}


//
//__API__ `tick`

//
Rounds.prototype.tick = function(block, cb){
	var round = __private.current;

	// if genesis block, nothing to do about the forger
	// but make sure votes are updated properly to start the round
	if(block.height == 1){
		__private.updateTotalVotesOnDatabase(function(err){
			cb(err, block);
		});
	}

	else{
		var down = bigdecimal.RoundingMode.DOWN();
		var reward;
		if(block.reward == '0.0000000000')
			reward = new bigdecimal.BigDecimal('0.0000000000');
		else
			reward = new bigdecimal.BigDecimal(''+block.reward);
		var totalFee = new bigdecimal.BigDecimal(''+block.totalFee);
		var result = reward.add(totalFee);
		result = result.setScale(10, down);

		result = (result.toString() == '0E-10' ? '0.0000000000' : result.toString());

		// give block rewards + fees to the block forger
		modules.accounts.mergeAccountAndGet({
			publicKey: block.generatorPublicKey,
			balance: result,
			u_balance: result,
			fees: block.totalFee,
			rewards: block.reward,
			producedblocks: 1,
			blockId: block.id,
			round: round
		}, function (err) {
			if(err){
				return cb(err, block);
			}
			else {
				__private.collectedfees[round] += block.totalFee;
				__private.forgers[round].push(block.generatorPublicKey);

				// last block of the round? we prepare next round
				if(self.getRoundFromHeight(block.height+1) == round + 1){
					return __private.changeRoundForward(block, cb);
				}
				else {
					return cb(null, block);
				}
			}
		});
	}
}

// *backward tick*
//
//__API__ `backwardTick`

//
Rounds.prototype.backwardTick = function(block, cb){
	__private.checkAndChangeRoundBackward(block, function(err){
		if(err){
			return cb(err, block);
		}
		else{
			var round = __private.current;

			var down = bigdecimal.RoundingMode.DOWN();
			var reward;
			if(block.reward == '0.0000000000')
				reward = new bigdecimal.BigDecimal('0.0000000000');
			else
				reward = new bigdecimal.BigDecimal(''+block.reward);
			var totalFee = new bigdecimal.BigDecimal(''+block.totalFee);
			var result = reward.add(totalFee);
			result = result.setScale(10, down);

			result = (result.toString() == '0E-10' ? '0.0000000000' : result.toString());

			// remove block rewards + fees from the block forger
			modules.accounts.mergeAccountAndGet({
				publicKey: block.generatorPublicKey,
				balance: -(result),
				u_balance: -(result),
				fees: -block.totalFee,
				rewards: -block.reward,
				producedblocks: -1,
				blockId: block.id,
				round: round
			}, function (err) {
				if(err){
					return cb(err, block);
				}
				else {
					__private.collectedfees[round] -= block.totalFee;
					var generator = __private.forgers[round].pop();
					if(generator != block.generatorPublicKey){
						return cb("Expecting to remove forger "+block.generatorPublicKey+" but removed "+generator, block)
					}
					else {
						return cb(null, block);
					}
				}
			});
		}
	});
};

/*
 * mitigation for expected generator errors that occur on a clean sync 
 * due to a corrupted database state propogated through a bad snapshot
 *
 * re-apply votes that were unvoted in round 9823 block 1974290, but persisted in the bad DB
 * do a delete first just as a protection against rewind shenanigans since there's no constraint on this table
 *
 * in case of a backwards tick after applying, just delete the votes as we cross back into round 9823
 * so the unvotes can be properly reverted if it ticks back far enough
 *
 * round 12437 ends at block 2499837, remove the votes at that point
 *
 * in case of a backwards tick after removing the votes in round 12437, put the votes back to allow slot validation to succeed
 */
__private.checkAndFixDatabaseState = function(block, cb) {
	var badround = 9823;
	var cleanround = 12437;

	if(
		(self.getRoundFromHeight(block.height) == badround && __private.current == badround) || 
		(self.getRoundFromHeight(block.height) == cleanround && __private.current == cleanround + 1)
	) {
		library.logger.info("Fixing DB state due to round 9823 issues. Restoring votes.");
		library.db.none('DELETE FROM mem_accounts2delegates WHERE "accountId" IN ' + 
							'(\'BLuFPk7w2QpvT3S67iLejmhzrcxXYNfvx8\', \'BAdB4EwqsXmodb49UA1vTZcQq9id91hLVW\', \'BCaDpHnVVGSZzk2LHr57p6juHMj7FasKZi\');' + 
						'INSERT INTO mem_accounts2delegates VALUES ' + 
							'(\'BLuFPk7w2QpvT3S67iLejmhzrcxXYNfvx8\', \'02be3547360e47f3169bff6fee5e016381d85dd4ba814d73aca859a9fdc9435fb5\'),' +
							'(\'BAdB4EwqsXmodb49UA1vTZcQq9id91hLVW\', \'039476ed9678c3b95d7f46d09f01572fcce7f2ed4be79a10f9f325230d7f4e15ad\'),' +
							'(\'BCaDpHnVVGSZzk2LHr57p6juHMj7FasKZi\', \'039388ae2ade9404981e92115b0b346d002b6bfdf4a58e6f76b1f54e902080af9d\');'
		).then(cb).catch(cb);
	} else if(
		(self.getRoundFromHeight(block.height) == badround && __private.current == badround + 1) || 
		(self.getRoundFromHeight(block.height) == cleanround && __private.current == cleanround)
	) { 
		library.logger.info("Fixing DB state due to round 9823 issues. Removing votes.");
		library.db.none('DELETE FROM mem_accounts2delegates WHERE "accountId" IN ' + 
							'(\'BLuFPk7w2QpvT3S67iLejmhzrcxXYNfvx8\', \'BAdB4EwqsXmodb49UA1vTZcQq9id91hLVW\', \'BCaDpHnVVGSZzk2LHr57p6juHMj7FasKZi\');'
		).then(cb).catch(cb);
	} else {
		return cb();
	}
}

// Changing round on next block
__private.changeRoundForward = function(block, cb){
	var nextround = __private.current + 1;

	__private.checkAndFixDatabaseState(block, function(err) {
		if(err){
			return cb(err, block);
		} else {
			__private.updateTotalVotesOnDatabase(function(err){
				if(err){
					return cb(err, block);
				}
				else {
					__private.generateDelegateList(nextround, function(err, fullactivedelegates){
						if(err){
							return cb(err, block);
						}
						else {
							__private.collectedfees[nextround] = 0;
							__private.forgers[nextround] = [];
							__private.activedelegates[nextround] = fullactivedelegates.map(function(ad){return ad.publicKey});
							__private.updateActiveDelegatesStats(function(err){
								if(err){
									return cb(err, block);
								}
								else{
									__private.saveActiveDelegatesOnDatabase(fullactivedelegates, nextround, function(err){
										if(err){
											return cb(err, block);
										}
										else{
											// we are good to go, let's move to the new round
											__private.current = nextround;
											return cb(null, block);
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});
};

// block belongs to the previous round? we prepare state of this previous round
__private.checkAndChangeRoundBackward = function(block, cb){
	var round = __private.current;
	var blockround = self.getRoundFromHeight(block.height);

	//no round change, do nothing
	if(round == blockround){
		return cb(null, block);
	}
	// round change prepare the previous round data
	else {
		__private.checkAndFixDatabaseState(block, function(err) {
			if(err){
				return cb(err, block);
			} else {
				library.logger.info("Detected backward round change, preparing data for round", blockround);
				delete __private.activedelegates[round];
				delete __private.forgers[round];
				__private.current = blockround;

				return async.series([
					function(seriesCb){
						library.db.none("delete from mem_delegates where round = "+round).then(seriesCb).catch(seriesCb);
					},
					function(seriesCb){
						self.getActiveDelegates(seriesCb);
					},
					function(seriesCb){
						__private.getCurrentRoundForgers(function(err, forgers){
							__private.forgers[blockround]=forgers.map(function(forger){
								return forger.publicKey;
							});
							return seriesCb(err, block);
						});
					}
				], function(err){
					return cb(err, block);
				});
			}
		});
	}
};

// Calculate and update on database the forging stats for the round active delegates
__private.updateActiveDelegatesStats = function(cb){
	var round = __private.current;
	var activedelegates = __private.activedelegates[round];
	var forgers = __private.forgers[round];
	var forgerStats = {};

	for(var i in forgers){
		if(forgerStats[forgers[i]]){
			forgerStats[forgers[i]].producedblocks++;
		}
		else{
			forgerStats[forgers[i]] = {
				producedblocks:1,
				missedblocks:0
			};
		}
	}

	for(var j in activedelegates){
		if(!forgerStats[activedelegates[j]]){
			forgerStats[activedelegates[j]] = {
				producedblocks:0,
				missedblocks:1
			};
		}
	}

	return __private.updateActiveDelegatesStatsOnDatabase(forgerStats, round, cb);

};

__private.saveActiveDelegatesOnDatabase = function(fullactivedelegates, round, cb){
	library.db.none(sql.saveActiveDelegates(fullactivedelegates), {round: round}).then(cb).catch(cb);
};

__private.updateTotalVotesOnDatabase = function(cb){
	library.db.none(sql.updateTotalVotes).then(cb).catch(cb);
};

__private.updateActiveDelegatesStatsOnDatabase = function(forgerStats, round, cb){
	library.db.none(sql.updateActiveDelegatesStats(forgerStats), {round: round}).then(cb).catch(cb);
};

// generate the list of active delegates of the round
// *WARNING*: To be used exclusively at the beginning of the new round
__private.generateDelegateList = function (round, cb) {
	__private.getKeysSortByVote(function (err, activedelegates) {
		if (err) {
			return cb(err);
		}
		modules.delegates.updateActiveDelegate(activedelegates);

		return cb(null, __private.randomizeDelegateList(activedelegates, round));
	});
};

// the algorithm to randomize active delegate list after they are ordered by vote descending.
// Return the new list in the order the delegates are allowed to forge in this round
__private.randomizeDelegateList = function (activedelegates, round) {
	// pseudorandom (?!) permutation algorithm.
	// TODO: useless? to improve?
	var seedSource = round.toString();
	var currentSeed = crypto.createHash('sha256').update(seedSource, 'utf8').digest();

	for (var i = 0, delCount = activedelegates.length; i < delCount; i++) {
		for (var x = 0; x < 4 && i < delCount; i++, x++) {
			var newIndex = currentSeed[x] % delCount;
			var b = activedelegates[newIndex];
			activedelegates[newIndex] = activedelegates[i];
			activedelegates[i] = b;
		}
		currentSeed = crypto.createHash('sha256').update(currentSeed).digest();
	}

	return activedelegates;
}

// return the list of active delegates from database ranked by votes
// *WARNING* to be used at the round change only
__private.getKeysSortByVote = function (cb) {
	modules.accounts.getAccounts({
		isDelegate: 1,
		sort: {'vote': -1, 'publicKey': 1},
		limit: slots.delegates
	}, ['publicKey', 'vote'], function (err, rows) {
		if (err) {
			return cb(err);
		}
		return cb(null, rows);
	});
};

// Retrieve from the database the delegate that have forged blocks during the current round
__private.getCurrentRoundForgers = function(cb) {
	var round = __private.current;
	var lastBlock = modules.blockchain.getLastBlock();

	// well exactly the last height of previous round,
	// but using '>' in sql query will actually select the first block of the current round
	var firstHeightOfround = __private.getLastHeightOfRound(round-1);

	library.db.query(sql.getRoundForgers, {minheight: firstHeightOfround, maxheight: lastBlock.height}).then(function(rows){
		return cb(null, rows);
	}).catch(cb);

}

__private.getFirstHeightOfRound = function(round) {
	return __private.getLastHeightOfRound(round - 1) + 1;
}

__private.getLastHeightOfRound = function(round) {
	return round * slots.delegates;
}

// ## API getRoundFromHeight
// - `height = 1                   -> round = 1`
// - `height = slots.delegates     -> round = 1`
// - `height = slots.delegates + 1 -> round = 2`
//
//__API__ `getRoundFromHeight`

//
Rounds.prototype.getRoundFromHeight = function (height) {
	return Math.floor((height-1) / slots.delegates) + 1;
};


// return the active delegates of the current round.
// *SAFE* to be be invoked whenever
//
//__API__ `getActiveDelegates`

//
Rounds.prototype.getActiveDelegates = function(cb) {
	var round = __private.current;
	if(__private.activedelegates[round]){
		return cb(null, __private.activedelegates[round]);
	}
	else {
		// let's get active delegates from database if any
		library.db.query(sql.getActiveDelegates, {round: round}).then(function(rows){
			if(rows.length == constants.activeDelegates){
				rows=__private.randomizeDelegateList(rows, round);
				__private.activedelegates[round]=rows.map(function(row){return row.publicKey;});
				return cb(null, __private.activedelegates[round]);
			}
			// ok maybe we just started node from scratch, so need to generate it.
			else if(modules.blockchain.getLastBlock().height == 1 && round == 1) {
				__private.generateDelegateList(round, function(err, activedelegates){
					if(err){
						return cb(err);
					}
					__private.activedelegates[round] = activedelegates.map(function(ad){return ad.publicKey;});
					__private.saveActiveDelegatesOnDatabase(activedelegates, round, function(){});
					return cb(null, __private.activedelegates[round]);
				});
			}
			else {
				return cb("Can't build active delegates list. Please report. Rebuild form scratch is necessary.");
				//TODO: add here a sql query to drop all mem_ tables
				process.exit(0);
			}
		});
	}
}

// return the active delegates from a historical round.
// *SAFE* to be be invoked whenever
//
//__API__ `getActiveDelegates`

//
Rounds.prototype.getActiveDelegatesFromRound = function(round, cb) {
	if(round > __private.current){
		return cb("Node has not reached yet this round", {requestedRound: round, currentRound: __private.current});
	}
	if(__private.activedelegates[round]){
		return cb(null, __private.activedelegates[round]);
	}
	else {
		// let's get active delegates from database if any
		library.db.query(sql.getActiveDelegates, {round: round}).then(function(rows){
			if(rows.length == constants.activeDelegates){
				rows=__private.randomizeDelegateList(rows, round);
				__private.activedelegates[round]=rows.map(function(row){return row.publicKey;});
				return cb(null, __private.activedelegates[round]);
			}
			else {
				return cb("Can't build active delegates list for round: "+round+". This is likely a bug. Please report. Rebuild form scratch is likely necessary.");
			}
		});
	}
}



// Events
//
//__EVENT__ `onAttachPublicApi`

//
Rounds.prototype.onAttachPublicApi = function () {
	__private.attachApi();
};

//
//__EVENT__ `onBind`

//
Rounds.prototype.onBind = function (scope) {
	modules = scope;
};

// When database state is reflected into the code state
// we prepare __private data
//
//__EVENT__ `onDatabaseLoaded`

//
Rounds.prototype.onDatabaseLoaded = function (lastBlock) {

	var round = self.getRoundFromHeight(lastBlock.height);

	__private.current = round;

	self.getActiveDelegates(function(err, delegates){
		if(self.getRoundFromHeight(lastBlock.height+1) == round+1){
			__private.changeRoundForward(lastBlock, function(err, block){
				library.logger.info("End of round detected, next round prepared");
			});
		}
		library.logger.info("loaded "+delegates.length+" active delegates of round "+round);
	});

	__private.getCurrentRoundForgers(function(err, forgers){
		__private.forgers[round]=forgers.map(function(forger){
			return forger.publicKey;
		});
		library.logger.info("loaded "+__private.forgers[round].length+" forgers of round "+round);
	});


};

//
//__API__ `cleanup`

//
Rounds.prototype.cleanup = function (cb) {
	return cb();
};


// Shared
shared.getRound = function (req, cb) {
	library.schema.validate(req.body, schema.getRound, function(err) {
		if (err) return cb(err[0].message);

		var round = req.body.round || __private.current;
		if (round > __private.current) {
			return cb('Round ' + round + ' is greater than current round ' + __private.current);
		}

		var blocksParams = {
			endHeight: __private.getLastHeightOfRound(round),
			startHeight: __private.getLastHeightOfRound(round - 1),
		};
		library.db.query(sql.getRoundBlocks, blocksParams)
			.then(function (rows) {
				var blocks = rows.map(function (row) { return library.logic.block.dbRead(row); });
				var lastBlockOfLastRound = blocks.shift()
				library.db.query(sql.getRoundDelegates, { round: round })
					.then(function (delegates) {
						var currentSupply = (blocks.length > 0 ? blocks[blocks.length - 1] : lastBlockOfLastRound).supply;
						delegates.forEach(function (delegate, i) {
							// Copied directly from modules/delegates lines 542-550 
							delegate.rate = i + 1;
							delegate.approval = (delegate.vote / currentSupply) * 100;
							delegate.approval = Math.round(delegate.approval * 1e2) / 1e2;
			
							var percent = 100 - (delegate.missedblocks / ((delegate.producedblocks + delegate.missedblocks) / 100));
							percent = Math.abs(percent) || 0;
			
							var outsider = i + 1 > slots.delegates;
							delegate.productivity = (!outsider) ? Math.round(percent * 1e2) / 1e2 : 0;
						});
						delegates = __private.randomizeDelegateList(delegates, round);

						var firstSlotOfRound = slots.getSlotNumber(lastBlockOfLastRound.timestamp) + 1
						var delegatesInForgingOrder = []
						for (var i = 0; i < slots.delegates; i += 1) {
							var slotNumber = firstSlotOfRound + i
							var delegateIndex = slotNumber % slots.delegates
							delegatesInForgingOrder.push(delegates[delegateIndex])
						}
						return cb(null, {
							activeDelegates: delegatesInForgingOrder,
							endHeight: __private.getLastHeightOfRound(round),
							blocks: blocks,
							round: round,
							startHeight: __private.getFirstHeightOfRound(round),
						});
					}).catch(function (err) {
						library.logger.error("stack", err.stack);
						return cb('Rounds#getRoundDelegates error');
					});
			}).catch(function (err) {
				library.logger.error("stack", err.stack);
				return cb('Rounds#getRoundBlocks error');
			});
	});
}

shared.getLastForgedBlocks = function (req, cb) {
	library.schema.validate(req.body, schema.lastForgedBlocks, function(err) {
		if (err) return cb(err[0].message);

		var round = req.body.round || __private.current;
		if (round > __private.current) {
			return cb('Round ' + round + ' is greater than current round ' + __private.current);
		}

		var sqlParams = {
			height: __private.getFirstHeightOfRound(round + 1),
			round: round,
		};
		library.db.query(sql.getActiveDelegatesLastForgedBlock, sqlParams)
			.then(function (rows) {
				var result = rows.map(function (row) {
					return library.logic.block.dbRead(row);
				});
		
				return cb(null, {
					lastBlocks: result,
					round: round,
				});
			}).catch(function (err) {
				library.logger.error("stack", err.stack);
				return cb('Rounds#getLastForgedBlock error');
			});
	});
}


// Export
module.exports = Rounds;
