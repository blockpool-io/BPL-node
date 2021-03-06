'use strict'; /*jslint mocha:true */

var chai = require('chai');
var expect = require('chai').expect;

var BlockReward = require('../../../logic/blockReward.js');
var constants = require('../../../constants.json');

constants.rewards.distance = 3000000;
constants.rewards.offset = 1451520;

describe('BlockReward', function () {

	var blockReward = new BlockReward();

	describe('returning calcMilestone', function () {

		it('when height is undefined should throw an error', function () {
			expect(blockReward.calcMilestone).to.throw(/Invalid block height/);
		});

		it('when height == 0 should return 0', function () {
			expect(blockReward.calcMilestone(0)).to.equal(0);
		});

		it('when height == 1 should return 0', function () {
			expect(blockReward.calcMilestone(1)).to.equal(0);
		});

		it('when height == (offset - 1) should return 0', function () {
			expect(blockReward.calcMilestone(1451519)).to.equal(0);
		});

		it('when height == (offset) should return 0', function () {
			expect(blockReward.calcMilestone(1451520)).to.equal(0);
		});

		it('when height == (offset + 1) should return 0', function () {
			expect(blockReward.calcMilestone(1451521)).to.equal(0);
		});

		it('when height == (offset + 2) should return 0', function () {
			expect(blockReward.calcMilestone(1451522)).to.equal(0);
		});

		it('when height == (distance) should return 0', function () {
			expect(blockReward.calcMilestone(3000000)).to.equal(0);
		});

		it('when height == (distance + 1) should return 0', function () {
			expect(blockReward.calcMilestone(3000001)).to.equal(0);
		});

		it('when height == (distance + 2) should return 0', function () {
			expect(blockReward.calcMilestone(3000002)).to.equal(0);
		});

		it('when height == (milestoneOne - 1) should return 0', function () {
			expect(blockReward.calcMilestone(4451519)).to.equal(0);
		});

		it('when height == (milestoneOne) should return 1', function () {
			expect(blockReward.calcMilestone(4451520)).to.equal(1);
		});

		it('when height == (milestoneOne + 1) should return 1', function () {
			expect(blockReward.calcMilestone(4451521)).to.equal(1);
		});

		it('when height == (milestoneTwo - 1) should return 1', function () {
			expect(blockReward.calcMilestone(7451519)).to.equal(1);
		});

		it('when height == (milestoneTwo) should return 2', function () {
			expect(blockReward.calcMilestone(7451520)).to.equal(2);
		});

		it('when height == (milestoneTwo + 1) should return 2', function () {
			expect(blockReward.calcMilestone(7451521)).to.equal(2);
		});

		it('when height == (milestoneThree - 1) should return 2', function () {
			expect(blockReward.calcMilestone(10451519)).to.equal(2);
		});

		it('when height == (milestoneThree) should return 3', function () {
			expect(blockReward.calcMilestone(10451520)).to.equal(3);
		});

		it('when height == (milestoneThree + 1) should return 3', function () {
			expect(blockReward.calcMilestone(10451521)).to.equal(3);
		});

		it('when height == (milestoneFour - 1) should return 3', function () {
			expect(blockReward.calcMilestone(13451519)).to.equal(3);
		});

		it('when height == (milestoneFour) should return 4', function () {
			expect(blockReward.calcMilestone(13451520)).to.equal(4);
		});

		it('when height == (milestoneFour + 1) should return 4', function () {
			expect(blockReward.calcMilestone(13451521)).to.equal(4);
		});

		it('when height == (milestoneFour * 2) should return 5', function () {
			expect(blockReward.calcMilestone(26903040)).to.equal(5);
		});

		it('when height == (milestoneFour * 10) should return 5', function () {
			expect(blockReward.calcMilestone(134515200)).to.equal(5);
		});

		it('when height == (milestoneFour * 100) should return 5', function () {
			expect(blockReward.calcMilestone(1345152000)).to.equal(5);
		});

		it('when height == (milestoneFour * 1000) should return 5', function () {
			expect(blockReward.calcMilestone(13451520000)).to.equal(5);
		});

		it('when height == (milestoneFour * 10000) should return 5', function () {
			expect(blockReward.calcMilestone(134615200000)).to.equal(5);
		});

		it('when height == (milestoneFour * 100000) should return 5', function () {
			expect(blockReward.calcMilestone(1346152000000)).to.equal(5);
		});
	});

	describe('returning calcReward', function () {

		it('when height is undefined should throw an error', function () {
			expect(blockReward.calcRewardForHeight).to.throw(/Invalid block height/);
		});

		it('when height == 0 should return 0', function () {
		blockReward.calcRewardForHeight(0,function(err,res){
			expect(res).to.have.property('reward').that.is.an('string');
			expect(res.reward).to.equal('0');
			});
		});

		it('when height == 1 should return 0', function () {
			blockReward.calcRewardForHeight(1,function(err,res){
				expect(res).to.have.property('reward').that.is.an('string');
				expect(res.reward).to.equal('0');
				});
		});

		it('when height == (offset - 1) should return 0', function () {
			blockReward.calcRewardForHeight(1451519,function(err,res){
				expect(res).to.have.property('reward').that.is.an('string');
				expect(res.reward).to.equal('0');
				});
		});

		// it('when height == (offset) should return 500000000', function () {
		// 	expect(blockReward.calcReward(1451520)).to.equal(200000000);
		// });

		it('when height == (offset) should return 500000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(1451520,function(err,res){
					expect(res).to.equal('500000000.0000000000');
					});
			}
		});

		// it('when height == (offset + 1) should return 500000000', function () {
		// 	expect(blockReward.calcReward(1451521)).to.equal(200000000);
		// });

		it('when height == (offset + 1) should return 500000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(1451521,function(err,res){
					expect(res).to.equal('500000000.0000000000');
					});
  		}
		});

		// it('when height == (offset + 2) should return 500000000', function () {
		// 	expect(blockReward.calcReward(1451522)).to.equal(200000000);
		// });

		it('when height == (offset + 2) should return 500000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(1451522,function(err,res){
					expect(res).to.equal('500000000.0000000000');
					});
 			}
		});

		// it('when height == (distance) should return 500000000', function () {
		// 	expect(blockReward.calcReward(3000000)).to.equal(200000000);
		// });

		it('when height == (distance) should return 500000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(3000000,function(err,res){
					expect(res).to.equal('500000000.0000000000');
					});
				}
		});

		// it('when height == (distance + 1) should return 500000000', function () {
		// 	expect(blockReward.calcReward(3000001)).to.equal(200000000);
		// });

		it('when height == (distance + 1) should return 500000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(3000001,function(err,res){
					expect(res).to.equal('500000000.0000000000');
					});
				}
		});

		// it('when height == (distance + 2) should return 500000000', function () {
		// 	expect(blockReward.calcReward(3000002)).to.equal(200000000);
		// });

		it('when height == (distance + 2) should return 500000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(3000002,function(err,res){
					expect(res).to.equal('500000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneOne - 1) should return 500000000', function () {
		// 	expect(blockReward.calcReward(4451519)).to.equal(200000000);
		// });

		it('when height == (milestoneOne - 1) should return 500000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(4451519,function(err,res){
					expect(res).to.equal('500000000.0000000000');
					});
				}
		});


		// it('when height == (milestoneOne) should return 400000000', function () {
		// 	expect(blockReward.calcReward(4451520)).to.equal(200000000);
		// });

		it('when height == (milestoneOne) should return 400000000', function () {
			if (constants.rewards.type === 'static') {

				blockReward.getStaticReward(4451520,function(err,res){
					expect(res).to.equal('400000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneOne + 1) should return 400000000', function () {
		// 	expect(blockReward.calcReward(4451521)).to.equal(200000000);
		// });

		it('when height == (milestoneOne + 1) should return 400000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(4451521,function(err,res){
					expect(res).to.equal('400000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneTwo - 1) should return 400000000', function () {
		// 	expect(blockReward.calcReward(7451519)).to.equal(200000000);
		// });

		it('when height == (milestoneTwo - 1) should return 400000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(7451519,function(err,res){
					expect(res).to.equal('400000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneTwo) should return 300000000', function () {
		// 	expect(blockReward.calcReward(7451520)).to.equal(200000000);
		// });

		it('when height == (milestoneTwo) should return 300000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(7451520,function(err,res){
					expect(res).to.equal('300000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneTwo + 1) should return 300000000', function () {
		// 	expect(blockReward.calcReward(7451521)).to.equal(200000000);
		// });

		it('when height == (milestoneTwo + 1) should return 300000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(7451521,function(err,res){
					expect(res).to.equal('300000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneThree - 1) should return 300000000', function () {
		// 	expect(blockReward.calcReward(10451519)).to.equal(200000000);
		// });

		it('when height == (milestoneThree - 1) should return 300000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(10451519,function(err,res){
					expect(res).to.equal('300000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneThree) should return 200000000', function () {
		// 	expect(blockReward.calcReward(10451520)).to.equal(200000000);
		// });

		it('when height == (milestoneThree) should return 200000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(10451520,function(err,res){
					expect(res).to.equal('200000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneThree + 1) should return 200000000', function () {
		// 	expect(blockReward.calcReward(10451521)).to.equal(200000000);
		// });

		it('when height == (milestoneThree + 1) should return 200000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(10451521,function(err,res){
					expect(res).to.equal('200000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneFour - 1) should return 200000000', function () {
		// 	expect(blockReward.calcReward(13451519)).to.equal(200000000);
		// });

		it('when height == (milestoneFour - 1) should return 200000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(13451519,function(err,res){
					expect(res).to.equal('200000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneFour) should return 100000000', function () {
		// 	expect(blockReward.calcReward(13451520)).to.equal(200000000);
		// });

		it('when height == (milestoneFour) should return 1000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(13451520,function(err,res){
					expect(res).to.equal('10000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneFour + 1) should return 100000000', function () {
		// 	expect(blockReward.calcReward(13451521)).to.equal(200000000);
		// });

		it('when height == (milestoneFour + 1) should return 10000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(13451521,function(err,res){
					expect(res).to.equal('10000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneFour * 2) should return 100000000', function () {
		// 	expect(blockReward.calcReward(26903040)).to.equal(200000000);
		// });

		it('when height == (milestoneFour * 2) should return 10000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(26903040,function(err,res){
					expect(res).to.equal('10000000.0000000000');
					});
				}
		});
		// it('when height == (milestoneFour * 10) should return 100000000', function () {
		// 	expect(blockReward.calcReward(134515200)).to.equal(200000000);
		// });

		it('when height == (milestoneFour * 10) should return 10000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(134515200,function(err,res){
					expect(res).to.equal('10000000.0000000000');
					});
				}
		});
		// it('when height == (milestoneFour * 100) should return 100000000', function () {
		// 	expect(blockReward.calcReward(1345152000)).to.equal(200000000);
		// });

		it('when height == (milestoneFour * 100) should return 10000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(1345152000,function(err,res){
					expect(res).to.equal('10000000.0000000000');
					});
				}
		});
		// it('when height == (milestoneFour * 1000) should return 100000000', function () {
		// 	expect(blockReward.calcReward(13451520000)).to.equal(200000000);
		// });

		it('when height == (milestoneFour * 1000) should return 10000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(13451520000,function(err,res){
					expect(res).to.equal('10000000.0000000000');
					});
				}
		});

		// it('when height == (milestoneFour * 10000) should return 100000000', function () {
		// 	expect(blockReward.calcReward(134615200000)).to.equal(200000000);
		// });

		it('when height == (milestoneFour * 10000) should return 10000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.getStaticReward(134615200000,function(err,res){
					expect(res).to.equal('10000000.0000000000');
					});
				}
		});

	// 	it('when height == (milestoneFour * 100000) should return 100000000', function () {
	// 		expect(blockReward.calcReward(1346152000000)).to.equal(200000000);
	// 	});
	// });

	it('when height == (milestoneFour * 100000) should return 10000000', function () {
		if (constants.rewards.type === 'static') {
			blockReward.getStaticReward(1346152000000,function(err,res){
				expect(res).to.equal('10000000.0000000000');
				});
			}
	});

	describe('returning calcSupply', function () {

		// it('when height is undefined should throw an error', function () {
		// 	expect(blockReward.calcSupply).to.throw(/Invalid block height/);
		// });

		it('when height is undefined should throw an error', function () {
	 	 if (constants.rewards.type === 'static') {
	 		 blockReward.calcSupply(undefined,function(err,res){
				 expect(blockReward.calcSupply).to.throw(/Invalid block height/);
	 			 });
	 		 }
	  });
		// it('when height == 0 should return 12500000000000000', function () {
		// 	expect(blockReward.calcSupply(0)).to.equal(12500000000000000);
		// });
		//
		// it('when height == 1 should return 12500000000000000', function () {
		// 	expect(blockReward.calcSupply(1)).to.equal(12500000000000000);
		// });
		//
		// it('when height == (offset - 1) should return 12500000000000000', function () {
		// 	expect(blockReward.calcSupply(1451519)).to.equal(12500000000000000);
		// });
		it('when height == 0 should return 12500000000000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.calcSupply(0,function(err,res){
					expect(res).to.equal(12500000000000000);
					});
				}
		});

		it('when height == 1 should return 12500000000000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.calcSupply(1,function(err,res){
					expect(res).to.equal(12500000000000000);
					});
				}
		});

		it('when height == (offset - 1) should return 12500000000000000', function () {
			if (constants.rewards.type === 'static') {
				blockReward.calcSupply(18000,function(err,res){
					expect(res).to.equal(12500000000000000);
					});
				}
			});
	});
});
});
		// it('when height == (offset) should return 10725760000000000', function () {
		// 	expect(blockReward.calcSupply(1451520)).to.equal(10725760000000000);
		// });
		//
		// it('when height == (offset + 1) should return 10725760500000000', function () {
		// 	expect(blockReward.calcSupply(1451521)).to.equal(10725760500000000);
		// });
		//
		// it('when height == (offset + 2) should return 10725761000000000', function () {
		// 	expect(blockReward.calcSupply(1451522)).to.equal(10725761000000000);
		// });
		//
		// it('when height == (distance) should return 11500000000000000', function () {
		// 	expect(blockReward.calcSupply(3000000)).to.equal(11500000000000000);
		// });
		//
		// it('when height == (distance + 1) should return 11500000000000000', function () {
		// 	expect(blockReward.calcSupply(3000001)).to.equal(11500000000000000);
		// });
		//
		// it('when height == (distance + 2) should return 11500000000000000', function () {
		// 	expect(blockReward.calcSupply(3000002)).to.equal(11500000000000000);
		// });
		//
		// it('when height == (milestoneOne - 1) should return 11500000000000000', function () {
		// 	expect(blockReward.calcSupply(4451519)).to.equal(11500000000000000);
		// });
		//
		// it('when height == (milestoneOne) should return 12080608000000000', function () {
		// 	expect(blockReward.calcSupply(4451520)).to.equal(12080608000000000);
		// });
		//
		// it('when height == (milestoneOne + 1) should return 12080608400000000', function () {
		// 	expect(blockReward.calcSupply(4451521)).to.equal(12080608400000000);
		// });
		//
		// it('when height == (milestoneTwo - 1) should return 12700000000000000', function () {
		// 	expect(blockReward.calcSupply(7451519)).to.equal(12700000000000000);
		// });
		//
		// it('when height == (milestoneTwo) should return 13135456000000000', function () {
		// 	expect(blockReward.calcSupply(7451520)).to.equal(13135456000000000);
		// });
		//
		// it('when height == (milestoneTwo + 1) should return 13135456300000000', function () {
		// 	expect(blockReward.calcSupply(7451521)).to.equal(13135456300000000);
		// });
		//
		// it('when height == (milestoneThree - 1) should return 13600000000000000', function () {
		// 	expect(blockReward.calcSupply(10451519)).to.equal(13600000000000000);
		// });
		//
		// it('when height == (milestoneThree) should return 13890304000000000', function () {
		// 	expect(blockReward.calcSupply(10451520)).to.equal(13890304000000000);
		// });
		//
		// it('when height == (milestoneThree + 1) should return 13890304200000000', function () {
		// 	expect(blockReward.calcSupply(10451521)).to.equal(13890304200000000);
		// });
		//
		// it('when height == (milestoneFour - 1) should return 14200000000000000', function () {
		// 	expect(blockReward.calcSupply(13451519)).to.equal(14200000000000000);
		// });
		//
		// it('when height == (milestoneFour) should return 14345152000000000', function () {
		// 	expect(blockReward.calcSupply(13451520)).to.equal(14345152000000000);
		// });
		//
		// it('when height == (milestoneFour + 1) should return 14345152100000000', function () {
		// 	expect(blockReward.calcSupply(13451521)).to.equal(14345152100000000);
		// });
		//
		// it('when height == (milestoneFour * 2) should return 15545152100000000', function () {
		// 	expect(blockReward.calcSupply(26903040)).to.equal(15545152100000000);
		// });
		//
		// it('when height == (milestoneFour * 10) should return 26306368100000000', function () {
		// 	expect(blockReward.calcSupply(134515200)).to.equal(26306368100000000);
		// });
		//
		// it('when height == (milestoneFour * 100) should return 147370048100000000', function () {
		// 	expect(blockReward.calcSupply(1345152000)).to.equal(147370048100000000);
		// });
		//
		// it('when height == (milestoneFour * 1000) should return 1358006848100000000', function () {
		// 	expect(blockReward.calcSupply(13451520000)).to.equal(1358006848100000000);
		// });
		//
		// it('when height == (milestoneFour * 10000) should return 13474374848100000000', function () {
		// 	expect(blockReward.calcSupply(134615200000)).to.equal(13474374848100000000);
		// });
		//
		// it('when height == (milestoneFour * 100000) should return 134628054848100000000', function () {
		// 	expect(blockReward.calcSupply(1346152000000)).to.equal(134628054848100000000);
		// });
