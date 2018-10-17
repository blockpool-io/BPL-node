"use strict";

var PollsSql = {
	countByAddress: 'SELECT COUNT(*) FROM polls WHERE "address" = ${address};',
	getPollResultByAddress: 'SELECT p.name, t."senderId", t.payload AS intention, t.id as "transactionId" FROM polls AS p, transactions AS t WHERE p.address = ${address} AND t."recipientId" = p."address" AND t.type=0 AND t.timestamp <= extract ("epoch" from p."endTimestamp") AND t.timestamp >= extract ("epoch" from  p."startTimestamp");',
	getAllPolls: 'SELECT name, address,"startTimestamp", "endTimestamp", intentions, description, "transactionId" FROM polls',
	getPoll: 'SELECT name, address,"startTimestamp", "endTimestamp", intentions, description, "transactionId" FROM polls WHERE name = ${name}',
	getPollByAddress: 'SELECT name, address,"startTimestamp", "endTimestamp", intentions, description, "transactionId" FROM polls WHERE address = ${address}'
};

module.exports = PollsSql;
