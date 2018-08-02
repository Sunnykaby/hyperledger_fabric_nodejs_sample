'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('Helper');
var path = require('path');
var ConfigTool = require('./config-tool.js');
var hfc = require('fabric-client');

logger.setLevel('INFO');
hfc.setLogger(logger);

var configTool = new ConfigTool();

var sleep = function (sleep_time_ms) {
	return new Promise(resolve => setTimeout(resolve, sleep_time_ms));
}

/**
 * Check the org input and get org
 * @param {*} default_org 
 */
function checkOrg(client, default_org) {
	//If default, get the org from the config file
	if (default_org == "default") {
		var client_org = client.getClientConfig().organization;
		if (client_org == undefined || client_org == null) return default_org;
		else return client_org;
	} else {
		return default_org;
	}
}

function getOrderer(client, index){
	return 'orderer.example.com';
}

function getPeers(client, index, org){
	return ['peer0.org1.example.com'];
}

function initNetworkConfig() {
	return Promise.resolve("Init network succussfully");
}


/**
 * Create a fabric client with the target user context config
 */
function getClient() {
	return new Promise((resolve, reject) => {
		return  configTool.initClient().then(client => {
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
	process.env.GOPATH = path.join(__dirname, "../../../artifacts");
};

var getLogger = function (moduleName) {
	var logger = log4js.getLogger(moduleName);
	logger.setLevel('INFO');
	return logger;
};

exports.getClient = getClient;
exports.getLogger = getLogger;
exports.setupChaincodeDeploy = setupChaincodeDeploy;
exports.checkOrg = checkOrg;
exports.initNetworkConfig = initNetworkConfig;
exports.getOrderer = getOrderer;
exports.getPeers = getPeers;
