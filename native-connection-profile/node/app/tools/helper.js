'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('Helper');
var path = require('path');
var hfc = require('fabric-client');
var ORGS = hfc.getConfigSetting('fabric');
var ConfigTool = require('./config-tool.js');

logger.setLevel('INFO');
hfc.setLogger(logger);

var configTool = new ConfigTool();

var sleep = function (sleep_time_ms) {
	return new Promise(resolve => setTimeout(resolve, sleep_time_ms));
}


/**
 * Check the org input and get org
 * @param {*} org_name 
 */
function checkOrg(org_name) {
	//If default, get the org from the config file
	if (org_name == "default") {
		return getDefaultOrg();
	}
	else return org_name;

}

function getDefaultOrg() {
	let local_org = "";
	for (let key in ORGS) {
		if (key != "orderers") local_org = key;
	}
	return local_org;
}

/**
 * Create a fabric client with the target user context config
 * @param {*} userorg 
 */
function getClientForOrg(userorg) {
	logger.info('getClientForOrg - ****** START %s %s', userorg);
	return new Promise((resolve, reject) => {
		return  configTool.initClientWithOrg(userorg).then(client => {
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

function getLogger(moduleName) {
	var logger = log4js.getLogger(moduleName);
	logger.setLevel('INFO');
	return logger;
};

exports.getClientForOrg = getClientForOrg;
exports.getLogger = getLogger;
exports.setupChaincodeDeploy = setupChaincodeDeploy;
exports.checkOrg = checkOrg;
