'use strict';
var helper = require('./tools/helper');
var logger = helper.getLogger('Query');

/**
 * Query the chaincode with target function and args
 * @param {*} channelName 
 * @param {*} chaincodeName 
 * @param {*Query function args} args 
 * @param {*Query function name} fcn 
 * @param {*} org_name 
 */
var queryChaincode = function (channelName, chaincodeName, args, fcn, org_name) {
	logger.info('\n\n============ Query chaincode on organizations ============\n');
	helper.setupChaincodeDeploy();

	var client = null;
	var channel = null;

	org_name =  helper.checkOrg(org_name);

	return helper.getClientForOrg(org_name).then(_client => {
		client = _client;
		channel = client.getChannel(channelName);
		// send query
		var request = {
			chaincodeId: chaincodeName,
			fcn: fcn,
			args: args
		};
		return channel.queryByChaincode(request, true);
	}, (err) => {
		logger.error('Failed to get submitter \'admin\'. Error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to get submitter');
	}).then((response_payloads) => {
		if (response_payloads) {
			for (let i = 0; i < response_payloads.length; i++) {
				//check the response is correct or not
			}
			return { success: true, message: response_payloads[0].toString('utf8') };
		} else {
			logger.error('response_payloads is null');
			throw new Error('Failed to get response on query');
		}
	}, (err) => {
		logger.error('Failed to send query due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed, got error on query');
	});
};


exports.queryChaincode = queryChaincode;
