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
var tarChannel = "chg";
var targets = [];



Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    return cryptoTool.getUserWithKeys(client, user_options);
}).then((user) => {
    channel = client.newChannel(tarChannel);
    //add orderer
    orderer = nodeTool.getOrderer(client, orderer_opt);
    channel.addOrderer(orderer);
    var peer = nodeTool.getPeer(client, user_options);
    channel.addPeer(peer);
    targets.push(peer);

    // read the config block from the orderer for the channel
    // and initialize the verify MSPs based on the participating
    // organizations
    return channel.initialize();
}).then(() => {
    return configTool.loadConfigByChannel(channel, configTool.getType().COMMON_CONFIG_APP);
}).then((updated_config) => {
    logger.error(updated_config)
    //user default primary peer to send query
    return channel.queryBlock(0);
}).then((block) => {
    logger.info(block);
    return channel.queryInfo();
}).then((info) =>{
    logger.info(info);
    var peer = nodeTool.getPeer(client, va.getOptions(va_opt_type.ORG2));
    return channel.queryInfo(peer);
}).then((info) =>{
    logger.info(info);
    return channel.queryInstantiatedChaincodes();
}).then((chaincodes) =>{
    logger.info(chaincodes);

}, (err) => {
    console.log(err.stack ? err.stack : err);

}).catch((err) => {
    console.log(err.stack ? err.stack : err)
});
