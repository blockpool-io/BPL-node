module.exports = {
	getAutoUpdate: {
		id: 'autoUpdate.getAutoUpdate',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['id']
	}
};
