'use strict';

var constants = require('../helpers/constants.js');
var memAccountsSQL = require('../sql/memAccounts.js');;
var blocksSQL = require('../sql/blocks.js');
var delegateSQL = require('../sql/delegates.js');
var bigdecimal = require("bigdecimal");

// Private fields
var __private = {};

// Constructor
function BlockReward () {
	// Array of milestones
	this.milestones = constants.rewards.milestones;

	// Distance between each milestone
	this.distance = Math.floor(constants.rewards.distance);

	// Start rewards at block (n)
	this.rewardOffset = Math.floor(constants.rewards.offset);
}

// Events
//
//__EVENT__ `onBind`

//
BlockReward.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
};


// Private methods
__private.parseHeight = function (height) {
	if (isNaN(height)) {
		throw 'Invalid block height';
	} else {
		return Math.abs(height);
	}
};

// Public methods
//
//__API__ `calcMilestone`

//
BlockReward.prototype.calcMilestone = function (height) {
	var location = Math.trunc((__private.parseHeight(height) - this.rewardOffset) / this.distance);
	var lastMile = this.milestones[this.milestones.length - 1];

	if (location > (this.milestones.length - 1)) {
		return this.milestones.lastIndexOf(lastMile);
	} else {
		return location;
	}
};

BlockReward.prototype.calcPercentageForMilestone = function (height) {
	height = __private.parseHeight(height);

	if (height < this.rewardOffset) {
		return -1;
	} else {
		var milestone = this.calcMilestone(height);
		return this.milestones[milestone];
	}
};

//
//__API__ `customCalcReward`
// calculate reward based on percentage
// 25 million tokens + forging rewards of 5% Annual decreasing 1% per year
// until 1% Annual then switching to a fixed block reward of 0.1 BPL/Block thereafter.
//
BlockReward.prototype.customCalcReward = function (dependentId, height, cb) {
	var self = this;
	var rewardAmount = new bigdecimal.BigDecimal('0.0000000000');
	var down = bigdecimal.RoundingMode.DOWN();
	var zeroReward ='0.0000000000';
	if(height >= this.rewardOffset) {
		//calculate percentage corresponding to milestone
		var percent = self.calcPercentageForMilestone(height);
		if(percent != this.milestones[5]) {
			//get all voters for delegate using delegateId i.e public key
			library.db.query(delegateSQL.getVoters, { publicKey: dependentId}).then(function (voters) {
				if(voters.length > 0 && voters[0].accountIds != null) {
					var votersTotalBalance = new bigdecimal.BigDecimal('0.0000000000');
					var accountIds = voters[0].accountIds;
					if(accountIds.length > 0) {
						var lastVoter = accountIds[accountIds.length-1];
					}
					for(let i = 0; i < accountIds.length; i++ ) {
						//get no of votes of this voter
							library.db.query(delegateSQL.getNoOfVotes, { accountId:accountIds[i] }).then(function (votes) {
									//get balance of each of the voters
									library.db.query(memAccountsSQL.getBalance, { address:accountIds[i] }).then(function (voter) {
										if (voter.length > 0) {
												try {
													var balance = new bigdecimal.BigDecimal(''+voter[0].balance);
													balance =  balance.setScale(10, down);

													var count = new bigdecimal.BigDecimal(''+votes[0].count);
													count =  count.setScale(10, down);

													var voteWeight = balance.divide(count, 10, down);
													voteWeight =  voteWeight.setScale(10, down);

													//sum up balance of all voters
													votersTotalBalance = votersTotalBalance.add(voteWeight);
													votersTotalBalance =  votersTotalBalance.setScale(10, down);
												} catch (e) {
													library.logger.error(e);
													return cb(e);
												}

												if(lastVoter === voter[0].address) {
													//calculate reward amount based on current milestone percentage
													var bigDecimalPercent = new bigdecimal.BigDecimal(percent);

													//while calculating rewards consider BPL values not 10^8 values, hence the conversion.
													//note: values are stored in the form of 10^8 in the database.
													var bplMultiplier = new bigdecimal.BigDecimal('100000000.0000000000');
													var votersTotalBalanceInBpl = votersTotalBalance.divide(bplMultiplier, 10, down);
													rewardAmount =  votersTotalBalanceInBpl.multiply(bigDecimalPercent);


													//To store rewardAmount in database,in the form of 10^8. Thus the below step.
													rewardAmount =  rewardAmount.multiply(bplMultiplier);
													rewardAmount =  rewardAmount.setScale(10, down);
													rewardAmount = rewardAmount.toString();

													if(rewardAmount == '0E-10')
														return cb (null, zeroReward);
													return cb(null, rewardAmount);
												}
											}

										}).catch(function (err) {
											library.logger.error(err);
											return cb(err);
										});
							}).catch(function (err) {
								library.logger.error(err);
								return cb(err);
							});

						}
					}
					else {
						library.logger.info('Couldn\'t find any voters for delegate: ',dependentId);
						return cb(null, zeroReward);
					}
			}).catch(function (err) {
				library.logger.error(err);
				return cb(err);
			});
		}
		else {
			var fixedReward = new bigdecimal.BigDecimal('10000000.0000000000');//0.1 BPL token
			return cb(null, fixedReward.toString());
		}
	}
	else {
		return cb(null, zeroReward);
	}
};

//
//__API__ `calcRewardForHeight`
// calculates reward given for specific block height
//
BlockReward.prototype.calcRewardForHeight = function (height, cb) {
	height = __private.parseHeight(height);

	if (height < this.rewardOffset) {
		return cb(null, {height: height, reward: "0"});
	} else {
		library.db.query(blocksSQL.getRewardByHeight, { height: height }).then(function (result) {
			if(result.length > 0)
				return cb(null, {height: result[0].height, reward: result[0].reward});
		}).catch(function (err) {
			library.logger.error(err);
			return cb(err);
		});
	}
};


//
//__API__ `calcSupply`
//calculates the total supply in the Blockchain at specific height
//
BlockReward.prototype.calcSupply = function(height, cb){
	library.db.query(blocksSQL.getSupplyByHeight, { height: height }).then(function (result) {
		if(result.length > 0){
			return cb(null, result[0].supply);
		}
	}).catch(function (err) {
		library.logger.error(err);
		return cb(err);
	});
};

// Export
module.exports = BlockReward;
