'use strict';

var hfc = require('fabric-client');
var path = require('path');
const fs = require('fs');
var util = require('util')
var VariesApp = require('./Varies.js');
var MSP = require('./Tools/MSP.js');
var CryptoTool = require('./Tools/CryptoTool.js');
var ConfigTool = require('./Tools/ConfigTool.js');
var NodeTool = require('./NodesTool.js');
var FabricConfigBuilder = require('./Tools/FabricConfigBuilder.js');
var log4js = require('log4js');
var logger = log4js.getLogger();

var configTool = new ConfigTool();
var nodeTool = new NodeTool();
var cryptoTool = new CryptoTool();
var va = new VariesApp();
var type = 'install'

var channel = {};
var client = null;
var orderer = null;
var tx_id = null;
var va_opt_type = va.getOptType();
var orderer_opt = va.getOptions(va_opt_type.ORDERER);
var user_options = va.getOptions(va_opt_type.ORG1);
var tarChannel = "mychannel";
var targets = [];



Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    return cryptoTool.getUserWithKeys(client, user_options);
}).then((user) => {
    var peer = nodeTool.getPeer(client, user_options);
    targets.push(peer);
    return client.queryChannels(peer);
}).then((channels) => {
    logger.info(channels);
    return client.queryInstalledChaincodes(targets[0]);
}).then((chaincodes) =>{
    logger.info(chaincodes);
    //Reset the user context
    return cryptoTool.getUserWithKeys(client, va.getOptions(va_opt_type.ORG2))
}).then((user) =>{
    var peer = nodeTool.getPeer(client, va.getOptions(va_opt_type.ORG2));
    return client.queryInstalledChaincodes(peer);
}).then((chaincodes) =>{
    logger.info(chaincodes);
}, (err) => {
    console.log(err.stack ? err.stack : err);

}).catch((err) => {
    console.log(err.stack ? err.stack : err)
});
