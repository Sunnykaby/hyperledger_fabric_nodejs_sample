/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
var path = require('path');
var fs = require('fs');
var util = require('util');
var hfc = require('fabric-client');
var helper = require('./helper.js');
var logger = helper.getLogger('Query');

var queryChaincode = function (peer, channelName, chaincodeName, args, fcn, org_name) {
	logger.debug('\n\n============ Query chaincode on organizations ============\n');
	helper.setupChaincodeDeploy();

	var client = null;
	var channel = null;
	var ORGS = helper.getORGS();
	var tx_id = null;

	return helper.getClientForOrg(org_name).then(_client => {
		client = _client;
		channel = client.newChannel(channelName);
		var targets = [];
		helper.setTargetPeers(client, channel, targets, org_name);
		tx_id = client.newTransactionID();
		// send query
		var request = {
			chaincodeId: chaincodeName,
			txId: tx_id,
			fcn: fcn,
			args: args
		};
		return channel.queryByChaincode(request);
	}, (err) => {
		logger.error('Failed to get submitter \'admin\'. Error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to get submitter');
	}).then((response_payloads) => {
		if (response_payloads) {
			for (let i = 0; i < response_payloads.length; i++) {
				//check the response is correct or not
			}
			return Promise.resolve({ success: true, message: response_payloads[0].toString('utf8') });
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
