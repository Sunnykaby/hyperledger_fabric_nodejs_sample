var helper = require("./app/tools/helper.js");
var api = require("./app/api-handler.js");
var program = require('commander');
var logger = helper.getLogger();

program
    .version('0.1 Beta')
    .description('A sample fabric node sdk test program')
    .option('-m, --method [method]', 'run method for single', 'init');

program.parse(process.argv)



// Param declaration
var CHANNEL_NAME = 'channel2';
var CHAINCODE_ID = 'example02-3';
var CHAINCODE_PATH = 'github.com';
var CHAINCODE_VERSION = 'v0';

//Reload the new args : Channel name


var installChaincodeRequest = {
    chaincodePath: CHAINCODE_PATH,
    chaincodeId: CHAINCODE_ID,
    chaincodeVersion: CHAINCODE_VERSION
};

var instantiateChaincodeRequest = {
    chanName: CHANNEL_NAME,
    chaincodeId: CHAINCODE_ID,
    chaincodeVersion: CHAINCODE_VERSION,
    fcn: 'init',
    args: ["a", "1000", "b", "1000"]
};

var invokeChaincodeRequest = {
    chanName: CHANNEL_NAME,
    chaincodeId: CHAINCODE_ID,
    chaincodeVersion: CHAINCODE_VERSION,
    fcn: 'invoke',
    args: ["move", "b", "a", "10"]
};

var queryChaincodeRequest = {
    chanName: CHANNEL_NAME,
    chaincodeId: CHAINCODE_ID,
    chaincodeVersion: CHAINCODE_VERSION,
    fcn: 'invoke',
    args: ["query", "a"]
};

var createChannelRequest = {
    chanName: CHANNEL_NAME,
    orgs: [],
    isFromFile: true
}

var joinChannelRequest = {
    chanName: CHANNEL_NAME,
    peers: [],
    isAddToFile: false
}

var queryChannelRequest = {
    chanName: CHANNEL_NAME,
    peer: "peer0.org1.example.com",
    txid: ""
}

var queryChaincodeInfoRequest = {
    chanName: CHANNEL_NAME,
    peer: "peer0.org1.example.com",
    chainId: CHAINCODE_ID
}

var enrollReq = {
    enrollmentId: "admin",
    enrollmentSecret: "adminpw"
}

try {
    helper.initNetworkConfig().then(result => {
        //Just enroll the client tls cert and key
        return api.enroll(enrollReq);
    // }).then(result => {
    //     console.log(result);
    //     return api.createChannel(createChannelRequest);
    // }).then((result) => {
    //     console.log(result);
    //     return api.joinChannel(joinChannelRequest);
    // }).then(result => {
    //     console.log(result);
    //     // Install chaincode
    //     return api.installChaincode(installChaincodeRequest);
    // }).then((result) => {
    //     // Instantiate chaincode
    //     return api.instantiateChaincode(instantiateChaincodeRequest);
    // }).then((result) => {
    //     console.log(result)
    //     // invoke chaincode
    //     return api.invokeChaincode(invokeChaincodeRequest);
    // }).then((result) => {
    //     console.log(result)
    //     queryChannelRequest.txid = result.tx_id;
    //     // query chaincode
    //     return api.queryChaincode(queryChaincodeRequest)
    // }).then((result) => {
    //     console.log(result)
    //     return api.queryChannel(queryChannelRequest);
    // }).then(result => {
    //     console.log(result);
    //     return api.queryChaincodeInfo(queryChaincodeInfoRequest);
    // }).then(result => {
        console.log(result);
        console.log("All Steps Completed Sucessfully");
        process.exit();
    }).catch(err => {
        console.error(err);
        return;
    });
} catch (e) {
    console.log(
        '\n\n*******************************************************************************' +
        '\n*******************************************************************************' +
        '\n*                                          ' +
        '\n* Error!!!!!' +
        '\n*                                          ' +
        '\n*******************************************************************************' +
        '\n*******************************************************************************\n');
    console.log(e);
    return;
}

