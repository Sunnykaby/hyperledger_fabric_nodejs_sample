'use strict';

var hfc = require('fabric-client');
var path = require('path');
var util = require('util');
var sdkUtils = require('fabric-client/lib/utils');
const fs = require('fs');
var VariesApp = require('./varies.js');

var va = new VariesApp();
var opt_type = va.getOptType();
var channel = {};
var client = null;
var targets = [];
var tx_id = null;
var options = va.getOptions(opt_type.ORG3_I);
const getKeyFilesInDir = (dir) => {
    //该函数用于找到keystore目录下的私钥文件的路径 
    const files = fs.readdirSync(dir)
    const keyFiles = []
    files.forEach((file_name) => {
        let filePath = path.join(dir, file_name)
        if (file_name.endsWith('_sk')) {
            keyFiles.push(filePath)
        }
    })
    return keyFiles
}
Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    var createUserOpt = {
        username: options.user_id,
        mspid: options.msp_id,
        cryptoContent: {
            privateKey: getKeyFilesInDir(options.privateKeyFolder)[0],
            signedCert: options.signedCert
        }
    }
    //以上代码指定了当前用户的私钥，证书等基本信息 
    return sdkUtils.newKeyValueStore({
        path: "/tmp/fabric-client-stateStore/"
    }).then((store) => {
        client.setStateStore(store)
        return client.createUser(createUserOpt)
    })
}).then((user) => {
    channel = client.newChannel(options.channel_id);
    let data = fs.readFileSync(options.peer_tls_cacerts);
    let peer = client.newPeer(options.peer_url,
        {
            pem: Buffer.from(data).toString(),
            'ssl-target-name-override': options.server_hostname
        }
    );
    //因为启用了TLS，所以上面的代码就是指定Peer的TLS的CA证书 
    channel.addPeer(peer);
    //接下来连接Orderer的时候也启用了TLS，也是同样的处理方法 
    let odata = fs.readFileSync(options.orderer_tls_cacerts);
    let caroots = Buffer.from(odata).toString();
    var orderer = client.newOrderer(options.orderer_url, {
        'pem': caroots,
        'ssl-target-name-override': "orderer.example.com"
    });

    channel.addOrderer(orderer);
    targets.push(peer);
    //join org1 or org2 peer
    var org1_peer = va.getOptions(opt_type.ORG1_I);
    let data_org1 = fs.readFileSync(org1_peer.peer_tls_cacerts);
    let peer_org1 = client.newPeer(org1_peer.peer_url,
        {
            pem: Buffer.from(data_org1).toString(),
            'ssl-target-name-override': org1_peer.server_hostname
        }
    );
    channel.addPeer(peer_org1);
    targets.push(peer_org1);
    var org2_peer = va.getOptions(opt_type.ORG2_I);
    let data_org2 = fs.readFileSync(org2_peer.peer_tls_cacerts);
    let peer_org2 = client.newPeer(org2_peer.peer_url,
        {
            pem: Buffer.from(data_org2).toString(),
            'ssl-target-name-override': org2_peer.server_hostname
        }
    );
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
        chaincodeId: options.chaincode_id,
        fcn: 'invoke',
        args: ['b', 'a', '10'],
        chainId: options.channel_id,
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
        let data = fs.readFileSync(options.peer_tls_cacerts);
        let grpcOpts = {
            pem: Buffer.from(data).toString(),
            'ssl-target-name-override': options.server_hostname
        }
        eh.setPeerAddr(options.event_url, grpcOpts);
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
