'use strict';

var hfc = require('fabric-client');
var path = require('path');
const fs = require('fs');
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

var channel = {};
var client = null;
var orderer = null;
var tx_id = null;
var va_opt_type = va.getOptType();
var orderer_opt = va.getOptions(va_opt_type.ORDERER);
var user_options = va.getOptions(va_opt_type.ORG2);
var add_opt = va.getOptions(va_opt_type.ORDERER);
var tarChannel = "mychannel2";

var signatures = [];
var request = null;
var targets = [];


Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    return cryptoTool.getUserWithKeys(client, user_options);
}).then((user) => {
    // 为网络节点启动channel
    channel = client.newChannel(tarChannel);
    var peer = nodeTool.getPeer(client, user_options);
    channel.addPeer(peer);
    targets.push(peer);
    orderer = nodeTool.getOrderer(client, orderer_opt);
    channel.addOrderer(orderer);
    return;
}).then(() => {
    tx_id = client.newTransactionID();
    let g_request = {
        txId: tx_id
    };
    // 从orderer中获取genesis block
    return channel.getGenesisBlock(g_request);
}).then((genesis_block) => {
    tx_id = client.newTransactionID();
    let j_request = {
        targets: targets,
        block: genesis_block,
        txId: tx_id
    };

    // 将genesis block发送给peer
    return channel.joinChannel(j_request);
}).then((result) => {
    logger.debug('\n***\n completed the join \n***\n');

    logger.debug(' response ::%j', result);
    if (result.status && result.status === '200') {
        return Promise.resolve(result.status);
    } else {
        return Promise.reject(result.status);
    }
}, (err) => {
    logger.error('Failed to join the channel: ' + err.stack ? err.stack : err);
    return Promise.reject(err);
}).catch(err => {
    logger.error('Exception on join channel: ' + err.stack ? err.stack : err);
    return Promise.reject(err);
});
``