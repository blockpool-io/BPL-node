"use strict";

module.exports = {
	getPollResults: {
		id: "polls.getPollResults",
		type: "object",
		properties: {
			address: {
				type: "string",
				minLength: 1,
				format: "address"
			}
		},
		required: ["address"]
	},
	getPoll: {
		id: "polls.getPoll",
		type: "object",
		properties: {
			name: {
				type: "string",
				minLength: 1,
			}
		}
	},
	getPolls: {
		id: "polls.getPolls",
		type: "object",
		properties: {
			name: {
				type: "string",
				minLength: 1,
			},
			address: {
				type: "string",
				minLength: 1,
				format: "address"
			}
		}
	}
};
