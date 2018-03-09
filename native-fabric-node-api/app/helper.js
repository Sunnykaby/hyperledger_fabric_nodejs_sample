/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('Helper');
logger.setLevel('DEBUG');

var path = require('path');
var util = require('util');
var fs = require('fs');
var copService = require('fabric-ca-client');
var CryptoTool = require('./Tools/CryptoTool.js');

var hfc = require('fabric-client');
hfc.setLogger(logger);
var ORGS = hfc.getConfigSetting('obcs');

var clients = {};
var channels = {};
var caClients = {};
var cryptoTool = new CryptoTool();

var sleep = function (sleep_time_ms) {
	return new Promise(resolve => setTimeout(resolve, sleep_time_ms));
}

function getOrderer_Opt(){

}

function getOrg_Peer_opt(org_name){

}

function getORGS(){
	return ORGS;
}

function getOrg_User_opt(org_name){
	//set absolute path
	var base_project = path.resolve(__dirname,"..");

	var createUserOpt = {
		username: ORGS[org_name].admin_name,
		mspid: ORGS[org_name].mspid,
		privateKey_path: path.join(base_project,ORGS[org_name].admin_key),
		signedCert: path.join(base_project, ORGS[org_name].signedCert)
	}
	return createUserOpt;
}

function setTargetPeers(client, channel, targets, org_name){
	for (let key in ORGS[org_name]) {
		if (ORGS[org_name].hasOwnProperty(key)) {
			if (key.indexOf('peer') === 0) {
				let data = fs.readFileSync(path.join(__dirname, ORGS[org_name][key]['tls_cacerts']));
				let peer = client.newPeer(
					ORGS[org_name][key].requests,
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
		}
	}
}

function setTargetOrderer(client, channel){
	let data = fs.readFileSync(path.join(__dirname, ORGS["orderer"]['tls_cacerts']));
	//If the tls cert does include the orderer dns like *.org
	channel.addOrderer(
		client.newOrderer(
			ORGS.orderer.url,
			{
				pem: Buffer.from(data).toString()
				// 'ssl-target-name-override': ORGS.orderer['server-hostname']
			}
		)
	);
}


function getClientForOrg (userorg) {
	logger.debug('getClientForOrg - ****** START %s %s', userorg)
	let client = new hfc();
	return new Promise((resolve, reject) =>{
		return cryptoTool.getUserWithKeys(client, getOrg_User_opt(userorg)).then(user =>{
			resolve(client);
		}).catch(err =>{
			reject(err);
		})
	});
	
}


var setupChaincodeDeploy = function() {
	process.env.GOPATH = path.join(__dirname, hfc.getConfigSetting('CC_SRC_PATH'));
};

var getLogger = function(moduleName) {
	var logger = log4js.getLogger(moduleName);
	logger.setLevel('DEBUG');
	return logger;
};

var getChaincodePath = function(){
	return path.join(__dirname, hfc.getConfigSetting("chaincode_path"))
}



exports.getClientForOrg = getClientForOrg;
exports.getLogger = getLogger;
exports.getORGS = getORGS;
exports.setupChaincodeDeploy = setupChaincodeDeploy;
exports.getChaincodePath = getChaincodePath;
exports.setTargetPeers = setTargetPeers;
exports.setTargetOrderer = setTargetOrderer;
