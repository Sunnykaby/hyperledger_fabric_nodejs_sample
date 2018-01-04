'use strict';

var hfc = require('fabric-client');
var path = require('path');
const fs = require('fs');
var VariesApp = require('./Varies.js');
var MSP = require('./Tools/MSP.js');
var CryptoTool = require('./Tools/CryptoTool.js');
var ConfigTool = require('./Tools/ConfigTool.js');
var NodeTool = require('./NodesTool.js');
var util = require('util');
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


Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    return cryptoTool.getUserWithKeys(client, user_options);
}).then((user) => {
    channel = client.newChannel(tarChannel);
    var peer = nodeTool.getPeer(client,user_options);
    channel.addPeer(peer);
    orderer = nodeTool.getOrderer(client, orderer_opt);
    channel.addOrderer(orderer);
    targets.push(peer);
    //join org1 or org2 peer
    var peer_org2 = nodeTool.getPeer(client, va.getOptions(va_opt_type.ORG2))
    channel.addPeer(peer_org2);
    targets.push(peer_org2);
    return channel.initialize();
}).then((config) => {
    console.log(config);
    console.log(' orglist:: ', channel.getOrganizations());
    tx_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);
    //发起转账行为，将a->b 10元 
    var request = {
        targets: targets,
        chaincodeId: user_options.chaincode_id,
        fcn: 'invoke',
        args: ['b', 'a', '10'],
        chainId: tarChannel,
        txId: tx_id
    };
    return channel.sendTransactionProposal(request);
}).then((results) => {
    var proposalResponses = results[0];
    var proposal = results[1];
    var header = results[2];
    let isProposalGood = false;
    var all_good = true ;
    for(var i in proposalResponses) {
        let one_good = false;
        let proposal_response = proposalResponses[i];
        if( proposal_response.response && proposal_response.response.status === 200) {
            console.log('transaction proposal has response status of good');
            one_good = channel.verifyProposalResponse(proposal_response);
            if(one_good) {
                break;
            }
        } else {
            console.log('transaction proposal was bad');
        }
        all_good = all_good & one_good;
    }
    if (all_good) {
        // check all the read/write sets to see if the same, verify that each peer
        // got the same results on the proposal
        all_good = channel.compareProposalResponseResults(proposalResponses);
        console.log('compareProposalResponseResults exection did not throw an error');
        if(all_good){
            console.log(' All proposals have a matching read/writes sets');
            isProposalGood = true;
        }
        else {
            console.log(' All proposals do not have matching read/write sets');
        }
    }
    // if (proposalResponses && proposalResponses[0].response &&
    //     proposalResponses[0].response.status === 200) {
    //     isProposalGood = true;
    //     console.log('transaction proposal was good');
    // } else {
    //     console.error('transaction proposal was bad');
    // }
    if (isProposalGood) {
        console.log(util.format(
            'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
            proposalResponses[0].response.status, proposalResponses[0].response.message,
            proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
        var request = {
            proposalResponses: proposalResponses,
            proposal: proposal,
            header: header
        };
        // set the transaction listener and set a timeout of 30sec 
        // if the transaction did not get committed within the timeout period, 
        // fail the test 
        var transactionID = tx_id.getTransactionID();
        var eventPromises = [];
        let eh = client.newEventHub();
        //接下来设置EventHub，用于监听Transaction是否成功写入，这里也是启用了TLS 
        let data = fs.readFileSync(user_options.peer_tls_cacerts);
        let grpcOpts = {
            pem: Buffer.from(data).toString(),
            'ssl-target-name-override': user_options.server_hostname
        }
        eh.setPeerAddr(user_options.event_url, grpcOpts);
        eh.connect();

        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(() => {
                eh.disconnect();
                reject();
            }, 30000);
            //向EventHub注册事件的处理办法 
            eh.registerTxEvent(transactionID, (tx, code) => {
                clearTimeout(handle);
                eh.unregisterTxEvent(transactionID);
                eh.disconnect();

                if (code !== 'VALID') {
                    console.error(
                        'The transaction was invalid, code = ' + code);
                    reject();
                } else {
                    console.log(
                        'The transaction has been committed on peer ' +
                        eh._ep._endpoint.addr);
                    resolve();
                }
            });
        });
        eventPromises.push(txPromise);
        var sendPromise = channel.sendTransaction(request);
        return Promise.all([sendPromise].concat(eventPromises)).then((results) => {
            console.log(' event promise all complete and testing complete');
            return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call 
        }).catch((err) => {
            console.error(
                'Failed to send transaction and get notifications within the timeout period.'
            );
            return 'Failed to send transaction and get notifications within the timeout period.';
        });
    } else {
        console.error(
            'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...'
        );
        return 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...';
    }
}, (err) => {
    console.error('Failed to send proposal due to error: ' + err.stack ? err.stack :
        err);
    return 'Failed to send proposal due to error: ' + err.stack ? err.stack :
        err;
}).then((response) => {
    if (response.status === 'SUCCESS') {
        console.log('Successfully sent transaction to the orderer.');
        return tx_id.getTransactionID();
    } else {
        console.error('Failed to order the transaction. Error code: ' + response.status);
        return 'Failed to order the transaction. Error code: ' + response.status;
    }
}, (err) => {
    console.error('Failed to send transaction due to error: ' + err.stack ? err
        .stack : err);
    return 'Failed to send transaction due to error: ' + err.stack ? err.stack :
        err;
});
