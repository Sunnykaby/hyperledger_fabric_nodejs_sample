'use strict';
var install = require('./install-chaincode.js');
var instantiate = require('./instantiate-chaincode.js');
var invoke = require('./invoke-chaincode');
var query = require('./query-chaincode');
var createChannel = require('./create-channel.js');
var joinChannel = require('./join-channel.js');
var queryChannel = require('./query-channel.js');
var queryChaincodeInfo = require('./query-chaincode-info.js')
var enroll = require('./ca-enroll.js')

module.exports.enroll = function (enrollReq) {
    return enroll.caEnroll(enrollReq.enrollmentId, enrollReq.enrollmentSecret);
}

module.exports.createChannel = function (createChReq) {
    return createChannel.createChannel(createChReq.chanName, createChReq.orgs, createChReq.isFromFile);
}

module.exports.joinChannel = function (joinChReq) {
    return joinChannel.joinChannel(joinChReq.chanName, joinChReq.peers, joinChReq.isAddToFile);
}

module.exports.installChaincode = function (installReq) {
    return install.installChaincode(installReq.chaincodeId, installReq.chaincodePath, installReq.chaincodeVersion);
}

module.exports.instantiateChaincode = function (instantiateReq) {
    return instantiate.instantiateChaincode(instantiateReq.chanName, instantiateReq.chaincodeId,
        instantiateReq.chaincodeVersion, instantiateReq.fcn, instantiateReq.args);
}

module.exports.invokeChaincode = function (invokeReq) {
    return invoke.invokeChaincode(invokeReq.chanName, invokeReq.chaincodeId,
        invokeReq.fcn, invokeReq.args);
}

module.exports.queryChaincode = function (queryReq) {
    return query.queryChaincode(queryReq.chanName, queryReq.chaincodeId,
        queryReq.fcn, queryReq.args);
}

module.exports.queryChannel = function (queryReq) {
    return queryChannel.queryChannel(queryReq.chanName, queryReq.peer, queryReq.txid);
}

module.exports.queryChaincodeInfo = function(queryReq) {
    return queryChaincodeInfo.queryChaincodeInfo(queryReq.chanName, queryReq.peer, queryReq.chainId);
}
