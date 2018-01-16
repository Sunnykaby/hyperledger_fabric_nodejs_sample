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
var user_options = va.getOptions(va_opt_type.ORG1);
var tarChannel = "mychannel";
var targets = [];

var chaincode_param = {
    path: "chaincode/exp/marbles02",
    name: "marbles",
    verison: "1.0",
    package: ""
}


Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    return cryptoTool.getUserWithKeys(client, user_options);
}).then((user) => {
    channel = client.newChannel(tarChannel);
    var peer = nodeTool.getPeer(client, user_options);
    channel.addPeer(peer);
    targets.push(peer);
    return;
}).then(() => {
    var transaction_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", transaction_id._transaction_id);
    //构造查询request参数 
    var request = {
        targets: targets,
        chaincodePath: chaincode_param.path,
        chaincodeId: chaincode_param.name,
        chaincodeVersion: chaincode_param.verison,
        chaincodePackage: chaincode_param.package
    };

    return client.installChaincode(request);
}).then((results) => {
    var proposalResponses = results[0];

    var proposal = results[1];
    var all_good = true;
    var error = null;
    for (var i in proposalResponses) {
        let one_good = false;
        if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
            one_good = true;
            logger.info(chaincode_param.name + ' - install proposal was good');
        } else {
            logger.error(chaincode_param.name + ' - install proposal was bad');
            error = proposalResponses[i];
        }
        all_good = all_good & one_good;
    }
    if (all_good) {
        console.log('success');
    } else {
        if (error) {
            if (typeof error === 'Error') console.log(error.stack ? error.stack : error);
            else console.log(error)
        }
        else console.log("fail");
    }
}, (err) => {
    console.log(err.stack ? err.stack : err);
    
}).catch((err) => {
    console.log(err.stack ? err.stack : err)
});
