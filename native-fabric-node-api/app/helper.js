'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('Helper');
var path = require('path');
var fs = require('fs');
var CryptoTool = require('./Tools/CryptoTool.js');
var hfc = require('fabric-client');
var ORGS = hfc.getConfigSetting('obcs');

logger.setLevel('DEBUG');
hfc.setLogger(logger);

var clients = {};
var channels = {};
var caClients = {};
var cryptoTool = new CryptoTool();

var sleep = function (sleep_time_ms) {
	return new Promise(resolve => setTimeout(resolve, sleep_time_ms));
}

function getORGS() {
	return ORGS;
}
/**
 * Get the target org's user options for create user context
 * @param {*Org name} org_name 
 */
function getOrg_User_opt(org_name) {
	//set absolute path
	var base_project = path.resolve(__dirname, "..");

	var createUserOpt = {
		username: ORGS[org_name].name,
		mspid: ORGS[org_name].mspid,
		privateKey_path: path.join(base_project, ORGS[org_name].keystore),
		signedCert: path.join(base_project, ORGS[org_name].signcert)
	}
	return createUserOpt;
}

/**
 * Set the target peers from config into the channel and target array
 * @param {*} client 
 * @param {*} channel 
 * @param {*} targets 
 * @param {*} org_name 
 */
function setTargetPeers(client, channel, targets, org_name, peer_urls) {
	var peers = ORGS[org_name]["peers"];
	if (peers.length == 0) return new Error("No Peers in the network");
	var peers_obj = {};
	//TODO:check the peer_urls validition
	peer_urls.forEach(element => {
		peers_obj[element] = "";
	});
	if (peer_urls == null || peer_urls.length == 0) {
		peers.forEach(element => {
			//Set the target peer
			let data = fs.readFileSync(path.join(__dirname, "..", element['tlscacert']));
			let peer = client.newPeer(
				element['url'],
				{
					pem: Buffer.from(data).toString()
					// 'ssl-target-name-override': ORGS[org_name][key]['server-hostname']
				}
			);
			targets.push(peer);    // a peer can be the target this way
			channel.addPeer(peer); // or a peer can be the target this way
			// you do not have to do both, just one, when there are
			// 'targets' in the request, those will be used and not
			// the peers added to the channel
		});
	}
	else {
		peers.forEach(element => {
			if (peers_obj.hasOwnProperty(element.id)) {
				//Set the target peer
				let data = fs.readFileSync(path.join(__dirname, "..", element['tlscacert']));
				let peer = client.newPeer(
					element['url'],
					{
						pem: Buffer.from(data).toString()
						// 'ssl-target-name-override': ORGS[org_name][key]['server-hostname']
					}
				);
				targets.push(peer);    // a peer can be the target this way
				channel.addPeer(peer); // or a peer can be the target this way
				// you do not have to do both, just one, when there are
				// 'targets' in the request, those will be used and not
				// the peers added to the channel
			}
		});
	}
}

function setTargetEh(eh, org_name, peer_url) {

	var peers = ORGS[org_name]["peers"];
	if (peers.length == 0) return new Error("No Peers in the network");
	if (peer_url != null) {
		logger
		peers.forEach(element => {
			if (element.id == peer_url) {
				let data = fs.readFileSync(path.join(__dirname, "..", element['tlscacert']));
				eh.setPeerAddr(
					element.event_url,
					{
						pem: Buffer.from(data).toString()
						// 'ssl-target-name-override': ORGS[org_name]['peer1']['server-hostname']
					}
				);
			}
		});
	}
	else {
		return new Error("No peer for eventhub")
	}

}

/**
 * Set the target orderer from config into the channel
 * @param {*} client 
 * @param {*} channel 
 * @param {* the index of the target orderer in the orderers list(in config.json file)} index
 */
function setTargetOrderer(client, channel, index) {
	//TODO： check the index 
	let data = fs.readFileSync(path.join(__dirname, "..", ORGS["orderers"][index]['tlscacert']));
	//If the tls cert does include the orderer dns like *.org
	channel.addOrderer(
		client.newOrderer(
			ORGS.orderers[index].url,
			{
				pem: Buffer.from(data).toString()
				// 'ssl-target-name-override': ORGS.orderer['server-hostname']
			}
		)
	);
}

/**
 * Create a fabric client with the target user context config
 * @param {*} userorg 
 */
function getClientForOrg(userorg) {
	logger.debug('getClientForOrg - ****** START %s %s', userorg)
	let client = new hfc();
	return new Promise((resolve, reject) => {
		return cryptoTool.getUserWithKeys(client, getOrg_User_opt(userorg)).then(user => {
			resolve(client);
		}).catch(err => {
			reject(err);
		})
	});

}

/**
 * Set the system env gopath with the target chaincode root path
 */
var setupChaincodeDeploy = function () {
	process.env.GOPATH = path.join(__dirname, "../artifacts");
};

var getLogger = function (moduleName) {
	var logger = log4js.getLogger(moduleName);
	logger.setLevel('DEBUG');
	return logger;
};

exports.getClientForOrg = getClientForOrg;
exports.getLogger = getLogger;
exports.getORGS = getORGS;
exports.setupChaincodeDeploy = setupChaincodeDeploy;
exports.setTargetPeers = setTargetPeers;
exports.setTargetOrderer = setTargetOrderer;
exports.setTargetEh = setTargetEh;
