'use strict';
var path = require('path');
var fs = require('fs');
var util = require('util');
var hfc = require('fabric-client');
var helper = require('./helper.js');
var logger = helper.getLogger('invoke-chaincode');

var invokeChaincode = function (peers, channelName, chaincodeName, fcn, args, org_name) {
	logger.debug(util.format('\n============ invoke transaction on channel %s ============\n', channelName));

	helper.setupChaincodeDeploy();

	var client = null;
	var channel = null;

	var targets = [],
		eventhubs = [];
	var ORGS = helper.getORGS();
	var tx_id = null;
	var pass_results = null;

	return helper.getClientForOrg(org_name).then(_client => {
		client = _client;
		channel = client.newChannel(channelName);
		var targets = [];
		helper.setTargetPeers(client, channel, targets, org_name);
		helper.setTargetOrderer(client, channel);
		// an event listener can only register with a peer in its own org
		logger.debug(' create new eventhub %s', ORGS[org_name]['peer1'].events);
		let data = fs.readFileSync(path.join(__dirname, ORGS[org_name]['peer1']['tls_cacerts']));
		let eh = client.newEventHub();
		eh.setPeerAddr(
			ORGS[org_name]['peer1'].events,
			{
				pem: Buffer.from(data).toString()
				// 'ssl-target-name-override': ORGS[org_name]['peer1']['server-hostname']，
				// 'grpc.keepalive_timeout_ms': 3000, // time to respond to the ping, 3 seconds
				// 'grpc.keepalive_time_ms': 360000, // time to wait for ping response, 6 minutes
			}
		);
		eh.connect();
		eventhubs.push(eh);
		return channel.initialize();
	}, (err) => {
		throw new Error('Failed to enroll user \'admin\'. ' + err);
	}).then((nothing) => {
		logger.debug(' orglist:: ', channel.getOrganizations());

		tx_id = client.newTransactionID();

		// send proposal to endorser
		
		var request = {
			chaincodeId: chaincodeName,
			fcn: fcn,
			args: args,
			txId: tx_id,
		};
		return channel.sendTransactionProposal(request);
	}, (err) => {
		throw new Error('Failed to initialize the channel');
	}).then((results) => {
		pass_results = results;
		var proposalResponses = pass_results[0];

		var proposal = pass_results[1];
		var all_good = true;
		for (var i in proposalResponses) {
			let one_good = false;
			let proposal_response = proposalResponses[i];
			if (proposal_response.response && proposal_response.response.status === 200) {
				one_good = channel.verifyProposalResponse(proposal_response);
				if (one_good) {
					logger.debug('transaction proposal signature and endorser are valid');
				}

				// check payload,if the proposal has a payload. We can check it.
				// let payload = proposal_response.response.payload.toString();
			} else {
				logger.error('transaction proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			// check all the read/write sets to see if the same, verify that each peer
			// got the same results on the proposal
			all_good = channel.compareProposalResponseResults(proposalResponses);
			if (all_good) {
				logger.debug(' All proposals have a matching read/writes sets');
			}
			else {
				logger.error(' All proposals do not have matching read/write sets');
			}
		}
		if (all_good) {
			// check to see if all the results match
			logger.debug(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			// set the transaction listener and set a timeout of 30sec
			// if the transaction did not get committed within the timeout period,
			// fail the test
			var deployId = tx_id.getTransactionID();
			var eventPromises = [];
			eventhubs.forEach((eh) => {
				let txPromise = new Promise((resolve, reject) => {
					let handle = setTimeout(reject, 120000);

					eh.registerTxEvent(deployId.toString(),
						(tx, code) => {
							clearTimeout(handle);
							eh.unregisterTxEvent(deployId);

							if (code !== 'VALID') {
								logger.error('The balance transfer transaction was invalid, code = ' + code);
								reject();
							} else {
								logger.debug('The balance transfer transaction has been committed on peer ' + eh.getPeerAddr());
								resolve();
							}
						},
						(err) => {
							clearTimeout(handle);
							logger.debug('Successfully received notification of the event call back being cancelled for ' + deployId);
							resolve();
						}
					);
				});
				eventPromises.push(txPromise);
			});
			var sendPromise = channel.sendTransaction(request);
			return Promise.all([sendPromise].concat(eventPromises))
				.then((results) => {
					logger.debug(' event promise all complete and testing complete');
					return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
				}).catch((err) => {
					logger.error('Failed to send transaction and get notifications within the timeout period.');
					throw new Error('Failed to send transaction and get notifications within the timeout period.');
				});
		} else {
			logger.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	}, (err) => {
		logger.error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);
	}).then((response) => {
		if (response.status === 'SUCCESS') {
			logger.debug('Successfully sent transaction to the orderer.');
			logger.debug('invokeChaincode end');
			// close the connections
			channel.close();
			logger.debug('Successfully closed all connections');
			return { success: true, message: 'Successfully invoke transaction' };
		} else {
			logger.error('Failed to order the transaction. Error code: ' + response.status);
			throw new Error('Failed to order the transaction. Error code: ' + response.status);
		}
	}, (err) => {
		logger.error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);

	});
};

exports.invokeChaincode = invokeChaincode;
