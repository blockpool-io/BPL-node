'use strict';

var constants = require('../constants.json');
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
	var milestone = this.calcMilestone(height);
	var zeroReward ="0.0000000000";
	var down = bigdecimal.RoundingMode.DOWN();

		var rewardAmount = new bigdecimal.BigDecimal("0.0000000000");
		if(height >= this.rewardOffset) {
			if(constants.rewards.type === "proportional") {
			//last milestone
				if(milestone === (constants.rewards.milestones.length - 1)) {
					if(constants.rewards.fixedLastReward && typeof(constants.rewards.fixedLastReward) === "number") {
						var fixedReward = new bigdecimal.BigDecimal(""+constants.rewards.fixedLastReward);
						fixedReward = fixedReward.setScale(10, down);
						return cb(null, fixedReward.toString());
					}
					else
						this.getProportionalReward(dependentId, height, cb);
				}
				else
						this.getProportionalReward(dependentId, height, cb);
				}
				else if(constants.rewards.type === "static"){
					this.getStaticReward(height, cb);
				}
			}
			else {
				return cb(null, zeroReward);
			}
};

BlockReward.prototype.getStaticReward = function (height, cb) {
	var down = bigdecimal.RoundingMode.DOWN();
	var rewardAmount = new bigdecimal.BigDecimal(''+this.milestones[this.calcMilestone(height)]);
	rewardAmount = rewardAmount.setScale(10, down);
	return cb(null, rewardAmount.toString());
}

BlockReward.prototype.getProportionalReward = function (dependentId, height, cb) {
	var zeroReward ='0.0000000000';
	var down = bigdecimal.RoundingMode.DOWN();
	//calculate percentage corresponding to milestone
	var percent = this.calcPercentageForMilestone(height);

	//get all voters for delegate using delegateId i.e public key
	library.db.query(delegateSQL.getVoters, { publicKey: dependentId}).then(function (voters) {
		if(voters.length > 0 && voters[0].accountIds != null) {
			var votersTotalBalance = new bigdecimal.BigDecimal('0.0000000000');
			var accountIds = voters[0].accountIds;

			for(let i = 0; i < accountIds.length; i++ ) {
					var counter = 0;
				//get no of votes of this voter
					library.db.query(delegateSQL.getNoOfVotes, { accountId:accountIds[i] }).then(function (votes) {
							//get balance of each of the voters
							library.db.query(memAccountsSQL.getBalance, { address:accountIds[i] }).then(function (voter) {
								counter++;
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

										if(counter === accountIds.length) {
											//calculate reward amount based on current milestone percentage
											var bigDecimalPercent = new bigdecimal.BigDecimal(percent);
											var rewardAmount = new bigdecimal.BigDecimal('0.0000000000');
											rewardAmount =  votersTotalBalance.multiply(bigDecimalPercent);
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
	if(constants.rewards.type === "proportional") {
		library.db.query(blocksSQL.getSupplyByHeight, { height: height }).then(function (result) {
			if(result.length > 0){
				return cb(null, result[0].supply);
			}
		}).catch(function (err) {
			library.logger.error(err);
			return cb(err);
		});
	}
	else {
		var milestone = this.calcMilestone(height);
		var supply    = constants.totalAmount / Math.pow(10,8);
		var rewards   = [];

		var amount = 0, multiplier = 0;

		for (var i = 0; i < this.milestones.length; i++) {
			if (milestone >= i) {
				multiplier = (this.milestones[i] / Math.pow(10,8));

				if (height < this.rewardOffset) {
					break; // Rewards not started yet
				} else if (height < this.distance) {
					amount = height % this.distance; // Measure this.distance thus far
				} else {
					amount = this.distance; // Assign completed milestone
					height -= this.distance; // Deduct from total height

					// After last milestone
					if (height > 0 && i === this.milestones.length - 1) {
						var postHeight = this.rewardOffset - 1;

						if (height >= postHeight) {
							amount += (height - postHeight);
						} else {
							amount += (postHeight - height);
						}
					}
				}

				rewards.push([amount, multiplier]);
			} else {
				break; // Milestone out of bounds
			}
		}

		for (i = 0; i < rewards.length; i++) {
			var reward = rewards[i];
			supply += reward[0] * reward[1];
		}
		return cb(null, (supply * Math.pow(10,8)));
		//return supply * Math.pow(10,8);
	}
};

// Export
module.exports = BlockReward;
