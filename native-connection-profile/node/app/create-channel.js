'use strict';
var helper = require('./tools/helper.js');
var logger = helper.getLogger('create-channel');
var path = require("path");
var fs = require("fs");
var base_path = '../../artifacts/channel-artifacts/';

var createChannel = function (channelName, orgs,
	isFromFile) {
	logger.info('\n\n============ Create channel ============\n');

	var client = null;
	var signatures  = [];

	return helper.getClient().then(_client => {
		client = _client;
		// get the config envelope created by the configtx tool
		//configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel3.tx -channelID mychannel3
		let envelope_bytes = fs.readFileSync(path.join(__dirname, base_path+channelName+'.tx'));
		// have the sdk get the config update object from the envelope generated by configtxgen
		// the config update object is what is required to be signed by all
		// participating organizations
		let config = client.extractChannelConfig(envelope_bytes);
		// Sign the config bytes
		// ---- the signChannelConfig() will have the admin identity sign the
		//      config if the client instance has been assigned an admin otherwise
		//      it will use the currently user context assigned. When loading a
		//      connection profile that has a client section that also has
		//      an admin defined for the organization defined in that client
		//      section it will be automatically assigned to the client instance.
		let signature1 = client.signChannelConfig(config);
		// convert signature to a storable string
		// fabric-client SDK will convert any strings it finds back
		// to GRPC protobuf objects during the channel create
		let string_signature1 = signature1.toBuffer().toString('hex');
		// collect signature from current org admin
		signatures.push(string_signature1);

		// now we have enough signatures...

		// get an admin based transaction
		// in this case we are assuming that the connection profile
		// has an admin defined for the current organization defined in the
		// client part of the connection profile, otherwise the setAdminSigningIdentity()
		// method would need to be called to setup the admin. If no admin is in the config
		// or has been assigned the transaction will based on the current user.
		let tx_id = client.newTransactionID(true);
		// build up the create request
		let request = {
			config: config,
			signatures : signatures,
			name : channelName,
			orderer : helper.getOrderer(client,0), //this assumes we have loaded a connection profile
			txId  : tx_id
		};
		// If the orderer not set, it will take the first orderer in target channel config

		// send create request to orderer
		return client.createChannel(request); //admin from current org
	}, (err) => {
		throw new Error('Failed to create client. ' + err);
	}).then((result) => {
		logger.info('\n***\n completed the create \n***\n');

		logger.info(' response ::%j',result);
		if(result.status && result.status === 'SUCCESS') {
			return { status: "Create channel successfully" }
		} else {
			throw new Error('Failed to create the channel. ');
		}
	}, (err) => {
		logger.error('Failed to create the channel due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to create the channel due to error: ' + err.stack ? err.stack : err);
	}).catch(err => {
		logger.error('Failed to create the channel due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to create the channel due to error: ' + err.stack ? err.stack : err);
	});
};

exports.createChannel = createChannel;
