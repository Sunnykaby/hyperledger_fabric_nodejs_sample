'use strict';

var hfc = require('fabric-client');
var path = require('path');
const fs = require('fs');
var VariesApp = require('./Varies.js');
var MSP = require('./Tools/MSP.js');
var FabricConfigBuilder = require('./Tools/FabricConfigBuilder.js');
var CryptoTool = require('./Tools/CryptoTool.js');
var ConfigTool = require('./Tools/ConfigTool.js');
var NodeTool = require('./NodesTool.js');
var log4js = require('log4js');
var logger = log4js.getLogger();

var configDir = {
    path: "config",
    origin_config: "oriCreateConfig.json",
    update_config: "updCreateConfig.json"
};

var channelConfig = "/home/sdy/channelConfig";
var new_channelName = "mychannel3";
var mspdir = "/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/msp";

var va = new VariesApp();
var configTool = new ConfigTool();
var nodeTool = new NodeTool();
var cryptoTool = new CryptoTool();
var va_opt_type = va.getOptType();
var channel = {};
var client = null;
var orderer = null;
var tx_id = null;
var orderer_opt = va.getOptions(va_opt_type.ORDERER);
var user_options = va.getOptions(va_opt_type.ORG1);
var tarChannel = new_channelName;
var updated_config_proto = null;
var updated_config_json = null;
var signatures = [];
var request = null;

var policies = {
    Readers: {
        mspids: [
            "Org1MSP",
            "Org2MSP"
        ]
    },
    Writers: {
        mspids: [
            "Org1MSP"
        ]
    }

}

function getCreatorPolicy(creatorId) {
    var fab = new FabricConfigBuilder();
    var creator_pol = fab.buildApplicationPolicy("SIGNATURE", creatorId, true);
    return creator_pol;
}

function getOrderPolicyMod() {
    var creator_pol = getCreatorPolicy(user_options.msp_id);
    var orderer_Config = {
        mod_policy: "Creator",
        policies: {},
        version: 1
    }
    orderer_Config.policies["Creator"] = creator_pol;

    return orderer_Config;
}


Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    return cryptoTool.getUserWithKeys(client,user_options);
}).then((user) => {
    //persist
    let envelope_bytes = fs.readFileSync(path.join(channelConfig, tarChannel + ".tx"));
    return configTool.loadConfigByTx(envelope_bytes);
}).then((envelope) => {
    //modify the config

    var fab = new FabricConfigBuilder();
    var creator_pol = fab.buildApplicationPolicy("SIGNATURE", user_options.msp_id, true);
    configTool.addPolicyToCreateChannelConfigGroups(creator_pol, "Creator");
    configTool.setModifyPolicyOfCreateChannelConfigGroups("Creator");

    //change the orderer cofnig
    // envelope.payload.data.config_update.write_set.groups["Orderer"] = getOrderPolicyMod();
    // envelope.payload.data.config_update.write_set.groups.Application["policies"] = 
    //
    return configTool.getPresignChannelCreateConfig(client)
}).then((config_proto) => {
    //for sign
    //get org1 signature
    var signature = client.signChannelConfig(config_proto);
    signatures.push(signature);

    //orderer sign
    //     return cryptoTool.getUserWithKeys(orderer_opt);
    // }).then((user) =>{
    //     var signature = client.signChannelConfig(config_proto);
    //     signatures.push(signature);

    orderer = nodeTool.getOrderer(client,orderer_opt);

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
    logger.debug('\n***\n completed the update \n***\n');

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


