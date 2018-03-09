'use strict';
var path = require('path');
var fs = require('fs');
var util = require('util');
var hfc = require('fabric-client');
var helper = require('./helper.js');
var logger = helper.getLogger('instantiate-chaincode');



var instantiateChaincode = function (peers, channelName, chaincodeName, chaincodeVersion, functionName,
	chaincodePath, args, org_name) {
	logger.debug('\n\n============ Instantiate chaincode on channel ' + channelName +
		' ============\n');

	helper.setupChaincodeDeploy();

	var client = null;
	var channel = null;

	var targets = [],
		eventhubs = [];
	var type = 'instantiate';
	var ORGS = helper.getORGS();
	var tx_id = null;

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
				// 'ssl-target-name-override': ORGS[org_name]['peer1']['server-hostname']
			}
		);
		eh.connect();
		eventhubs.push(eh);

		// read the config block from the peer for the channel
		// and initialize the verify MSPs based on the participating
		// organizations
		return channel.initialize();
	}, (err) => {
		throw new Error('Failed to enroll user \'admin\'. ' + err);
	}).then(() => {
		logger.debug(' orglist:: ', channel.getOrganizations());

		tx_id = client.newTransactionID();

		// send proposal to endorser
		var request = {
			// chaincodePath: chaincodePath,
			chaincodeId: chaincodeName,
			chaincodeVersion: chaincodeVersion,
			fcn: functionName,
			args: args,
			txId: tx_id,
			chaincodeType: "golang",
			// use this to demonstrate the following policy:
			// 'signed by org1 admin, then that's the only signature required
			// 'endorsement-policy': {
			// 	identities: [

			// 		{ role: { name: 'admin', mspId: ORGS[org_name].mspid } }
			// 	],
			// 	policy: {
			// 		'1-of': [
			// 			{ 'signed-by': 0 }
			// 		]
			// 	}
			// }
		};
		// this is the longest response delay in the test, sometimes
		// x86 CI times out. set the per-request timeout to a super-long value
		return channel.sendInstantiateProposal(request, 120000);
	}, (err) => {
		throw new Error('Failed to initialize the channel');
	}).then((results) => {

		var proposalResponses = results[0];

		var proposal = results[1];
		var all_good = true;
		for (var i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
				// special check only to test transient map support during chaincode upgrade
				one_good = true;
				logger.info(type + ' proposal was good');
			} else {
				logger.error(type + ' proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
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
					eh.registerTxEvent(deployId.toString(), (tx, code) => {
						clearTimeout(handle);
						eh.unregisterTxEvent(deployId);

						if (code !== 'VALID') {
							reject();
						} else {
							resolve();
						}
					}, (err) => {
						clearTimeout(handle);
						eh.unregisterTxEvent(deployId);
					});
				});
				logger.debug('register eventhub %s with tx=%s', eh.getPeerAddr(), deployId);
				eventPromises.push(txPromise);
			});

			var sendPromise = channel.sendTransaction(request);
			return Promise.all([sendPromise].concat(eventPromises))
				.then((results) => {

					logger.debug('Event promise all complete and testing complete');
					return results[0]; // just first results are from orderer, the rest are from the peer events

				}).catch((err) => {
					throw new Error('Failed to send ' + type + ' transaction and get notifications within the timeout period.');
				});

		} else {
			throw new Error('Failed to send ' + type + ' Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	}, (err) => {
		throw new Error('Failed to send ' + type + ' proposal due to error: ' + err.stack ? err.stack : err);
	}).then((response) => {
		//TODO should look into the event responses
		if (!(response instanceof Error) && response.status === 'SUCCESS') {
			logger.debug("Successfully Instantiate the chaincode")
			return {success:true, message:"Successfully Instantiate the chaincode"};
		} else {
			return new Error('Failed to order the ' + type + 'transaction. Error code: ' + response.status);
		}
	}, (err) => {
		return new Error('Failed to send instantiate due to error: ' + err.stack ? err.stack : err);
	});
};

exports.instantiateChaincode = instantiateChaincode;
