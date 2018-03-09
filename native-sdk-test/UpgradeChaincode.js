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
var eventhubs = [];

var chaincode_param = {
    path: "chaincode/exp/marbles02",
    name: "marbles",
    verison: "2.0",
    package: ""
}


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

    //eventhub listener

    let eh = client.newEventHub();
    //接下来设置EventHub，用于监听Transaction是否成功写入，这里也是启用了TLS 
    let data = fs.readFileSync(user_options.peer_tls_cacerts);
    let grpcOpts = {
        pem: Buffer.from(data).toString(),
        'ssl-target-name-override': user_options.server_hostname
    }
    eh.setPeerAddr(user_options.event_url, grpcOpts);
    eh.connect();
    eventhubs.push(eh);

    // read the config block from the orderer for the channel
    // and initialize the verify MSPs based on the participating
    // organizations
    return channel.initialize();
}).then(() => {
    tx_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);
    //构造查询request参数 
    // var request = {
    //     chaincodeId : chaincode_param.name,
    // 	chaincodeVersion : chaincode_param.verison,
    // 	fcn: 'init',
    // 	args: ['a', '500', 'b', '600'],
    //     txId: transaction_id
    // };
    var request = {
        // chaincodePath: chaincode_param.path,
        chaincodeId: chaincode_param.name,
        chaincodeVersion: chaincode_param.verison,
        // fcn: 'init',
        // args: [],
        txId: tx_id,
        // use this to demonstrate the following policy:
        // 'if signed by org1 admin, then that's the only signature required,
        // but if that signature is missing, then the policy can also be fulfilled
        // when members (non-admin) from both orgs signed'
        'endorsement-policy': {
            identities: [
                { role: { name: 'member', mspId: va.getOptions(va_opt_type.ORG1).msp_id } },
                { role: { name: 'member', mspId: va.getOptions(va_opt_type.ORG2).msp_id } },
                { role: { name: 'admin', mspId: va.getOptions(va_opt_type.ORG1).msp_id } }
            ],
            policy: {
                '1-of': [
                    { 'signed-by': 2 },
                    { '2-of': [{ 'signed-by': 0 }, { 'signed-by': 1 }] }
                ]
            }
        }
    };
    // this is the longest response delay in the test, sometimes
    // x86 CI times out. set the per-request timeout to a super-long value
    return channel.sendUpgradeProposal(request, 120000);
}).then((results) => {
    var proposalResponses = results[0];

    var proposal = results[1];
    var all_good = true;
    var error = null;
    for (var i in proposalResponses) {
        let one_good = false;
        if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
            one_good = true;
            logger.info(chaincode_param.name + ' - instantiate proposal was good');
        } else {
            logger.error(chaincode_param.name + ' - instantiate proposal was bad');
            error = proposalResponses[i];
        }
        all_good = all_good & one_good;
    }
    if (all_good) {
        logger.debug(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
        var request = {
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        // set the transaction listener and set a timeout of 30sec
        // if the transaction did not get committed within the timeout period,
        // fail the test
        var deployId = tx_id.getTransactionID();

        var eventPromises = [];
        eventhubs.forEach((eh) => {
            let txPromise = new Promise((resolve, reject) => {
                let handle = setTimeout(reject, 120000);

                eh.registerTxEvent(deployId.toString(), (tx, code) => {
                    logger.info('The chaincode ' + type + ' transaction has been committed on peer ' + eh.getPeerAddr());
                    clearTimeout(handle);
                    eh.unregisterTxEvent(deployId);

                    if (code !== 'VALID') {
                        logger.error('The chaincode ' + type + ' transaction was invalid, code = ' + code);
                        reject();
                    } else {
                        logger.info('The chaincode ' + type + ' transaction was valid.');
                        resolve();
                    }
                });
            });
            logger.debug('register eventhub %s with tx=%s', eh.getPeerAddr(), deployId);
            eventPromises.push(txPromise);
        });

        var sendPromise = channel.sendTransaction(request);
        return Promise.all([sendPromise].concat(eventPromises)).then((results) => {

            logger.debug('Event promise all complete and testing complete');
            logger.info(results[0]); // just first results are from orderer, the rest are from the peer events

        }).catch((err) => {

            logger.error('Failed to send ' + type + ' transaction and get notifications within the timeout period.');
        });
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
