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


Promise.resolve().then(() => { 
    console.log("Load privateKey and signedCert"); 
    client = new hfc(); 
    return cryptoTool.getUserWithKeys(client,user_options); 
}).then((user) => { 
    channel = client.newChannel(tarChannel); 
    var peer= nodeTool.getPeer(client,user_options);
    channel.addPeer(peer); 
    return; 
}).then(() => { 
    console.log("Make query"); 
    var transaction_id = client.newTransactionID(); 
    console.log("Assigning transaction_id: ", transaction_id._transaction_id); 
//构造查询request参数 
    const request = { 
        chaincodeId: user_options.chaincode_id, 
        txId: transaction_id, 
        fcn: 'query', 
        args: ['a'] 
    }; 
     return channel.queryByChaincode(request); 
}).then((query_responses) => { 
    console.log("returned from query"); 
    if (!query_responses.length) { 
        console.log("No payloads were returned from query"); 
    } else { 
        console.log("Query result count = ", query_responses.length) 
    } 
    if (query_responses[0] instanceof Error) { 
        console.error("error from query = ", query_responses[0]); 
    } 
    console.log("Response is ", query_responses[0].toString());//打印返回的结果 
}).catch((err) => { 
    console.error("Caught Error", err); 
});
