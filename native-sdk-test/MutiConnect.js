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
var channel2 = {};
var client = null;
var orderer = null;
var tx_id = null;
var va_opt_type = va.getOptType();
var orderer_opt = va.getOptions(va_opt_type.ORDERER);
var user_options = va.getOptions(va_opt_type.ORG1);
var add_opt = va.getOptions(va_opt_type.ORG3);
// var tarChannel = 'testchainid';
var tarChannel = "mychannel";
var tarChannel2 = "mychannel2"

var config_proto = null;
var original_config_proto = null;
var original_config_json = null;
var updated_config_proto = null;
var updated_config_json = null;
var signatures = [];
var request = null;


Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    return cryptoTool.getUserWithKeys(client, user_options);
}).then((user) => {
    channel = client.newChannel(tarChannel);
    channel2 = client.newChannel(tarChannel2);
    var peer = nodeTool.getPeer(client, user_options);
    channel.addPeer(peer);
    channel2.addPeer(peer);
    orderer = nodeTool.getOrderer(client, orderer_opt);
    channel.addOrderer(orderer);
    channel2.addOrderer(orderer);
    return;
}).then(() => {
    return configTool.loadConfigByChannel(channel, configTool.getType().COMMON_CONFIG_APP);
}).then((updated_config) => {
    // Build new organization group
    var name = add_opt.org_name;
    var mspid = add_opt.msp_id;
    var msp = new MSP(add_opt.msp_id);
    msp.load(add_opt.msp_dir);
    // msp.loadNul();
    var builder = new FabricConfigBuilder();
    builder.addOrganization(name, mspid, msp.getMSP());
    // builder.addAnchorPeer(add_opt.server_hostname, add_opt.server_port);
    //builder.addAnchorPeerArray(anchors);

    var org_app = builder.buildApplicationGroup(false);
    // var org_app = builder.buildAnchor();

    // var creator_mod_policy = builder.buildApplicationPolicy("SIGNATURE","Org1MSP",true);
    //add the new group into the app groups(app channel)
    configTool.addOrgToAppliacitionGroups(name, org_app);

    return configTool.getPreSignUpdatedConfig(tarChannel,configTool.getType().COMMON_CONFIG_APP);
}).then(config_pb => {
    config_proto = config_pb;
    //sign
    //org1 signature
    var signature = client.signChannelConfig(config_proto);
    signatures.push(signature);

    //get org2 signature
    return cryptoTool.getUserWithKeys(client, va.getOptions(va_opt_type.ORG2));
}).then((user) => {
    //org2 signature
    var signature = client.signChannelConfig(config_proto);
    signatures.push(signature);

    //create a transaction
    tx_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);

    var request = {
        config: config_proto,
        signatures: signatures,
        name: tarChannel,
        orderer: orderer,
        txId: tx_id
    };

    // send create request to orderer
    return client.updateChannel(request);
}).then((result) => {
    logger.debug('\n***\n completed the update \n***\n')

    logger.debug(' response ::%j', result);
    if (result.status && result.status === 'SUCCESS') {
        return Promise.resolve(result.status);
    } else {
        return Promise.reject(result.status);
    }
}).then(() => {
    return configTool.loadConfigByChannel(channel2, configTool.getType().COMMON_CONFIG_APP);
}).then((updated_config) => {
    // Build new organization group
    var name = add_opt.org_name;
    var mspid = add_opt.msp_id;
    var msp = new MSP(add_opt.msp_id);
    msp.load(add_opt.msp_dir);
    // msp.loadNul();
    var builder = new FabricConfigBuilder();
    builder.addOrganization(name, mspid, msp.getMSP());
    // builder.addAnchorPeer(add_opt.server_hostname, add_opt.server_port);
    //builder.addAnchorPeerArray(anchors);

    var org_app = builder.buildApplicationGroup(false);
    // var org_app = builder.buildAnchor();

    // var creator_mod_policy = builder.buildApplicationPolicy("SIGNATURE","Org1MSP",true);
    //add the new group into the app groups(app channel)
    configTool.addOrgToAppliacitionGroups(name, org_app);

    return configTool.getPreSignUpdatedConfig(tarChannel,configTool.getType().COMMON_CONFIG_APP);
}).then(config_pb => {
    config_proto = config_pb;
    //sign
    //org1 signature
    var signature = client.signChannelConfig(config_proto);
    signatures.push(signature);

    //get org2 signature
    return cryptoTool.getUserWithKeys(client, va.getOptions(va_opt_type.ORG2));
}).then((user) => {
    //org2 signature
    var signature = client.signChannelConfig(config_proto);
    signatures.push(signature);

    //create a transaction
    tx_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);

    var request = {
        config: config_proto,
        signatures: signatures,
        name: tarChannel2,
        orderer: orderer,
        txId: tx_id
    };

    // send create request to orderer
    return client.updateChannel(request);
}).then((result) => {
    logger.debug('\n***\n completed the update \n***\n')

    logger.debug(' response ::%j', result);
    if (result.status && result.status === 'SUCCESS') {
        return Promise.resolve(result.status);
    } else {
        return Promise.reject(result.status);
    }
}, (err) => {
    logger.error('Failed to update the channel: ' + err.stack ? err.stack : err);
    return Promise.reject(err);
}).catch(err => {
    logger.error('Exception on update channel: ' + err.stack ? err.stack : err);
    return Promise.reject(err);
});
