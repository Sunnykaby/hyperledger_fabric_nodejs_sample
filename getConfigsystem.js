'use strict';

var hfc = require('fabric-client');
var path = require('path');
var util = require('util');
var sdkUtils = require('fabric-client/lib/utils');
var blockDecoder = require('fabric-client/lib/BlockDecoder.js');
const fs = require('fs');
var VariesApp = require('./varies.js');
var MSP = require('./MSP.js');
var FabricConfigBuilder = require('./FabricConfigBuilder.js');
var log4js = require('log4js');
var logger = log4js.getLogger('temp.log');
var configtxlator = require('./configtxlator.js');

var configDir = {
    path: "config",
    origin_config: "originConfig.json",
    update_config: "updateConfig.json"
};

var mspdir = "/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/msp";

var va = new VariesApp();
var va_opt_type = va.getOptType();
var channel = {};
var client = null;
var orderer = null;
var targets = [];
var tx_id = null;
var orderer_opt = va.getOptions(va_opt_type.ORDERER);
var user_options = va.getOptions(va_opt_type.ORDERER);
var add_opt = va.getOptions(va_opt_type.ORG3_I);
var tarChannel = 'testchainid';
// var tarChannel = options.channel_id;
var consortium = "SampleConsortium";
var configtx = new configtxlator();

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
    var createUserOpt = {
        username: user_options.user_id,
        mspid: user_options.msp_id,
        cryptoContent: {
            privateKey: getKeyFilesInDir(user_options.privateKeyFolder)[0],
            signedCert: user_options.signedCert
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
    channel = client.newChannel(tarChannel);
    // let data = fs.readFileSync(options.peer_tls_cacerts);
    // let peer = client.newPeer(options.peer_url,
    //     {
    //         pem: Buffer.from(data).toString(),
    //         'ssl-target-name-override': options.server_hostname
    //     }
    // );
    // //因为启用了TLS，所以上面的代码就是指定Peer的TLS的CA证书 
    // channel.addPeer(peer);
    //接下来连接Orderer的时候也启用了TLS，也是同样的处理方法 
    let odata = fs.readFileSync(orderer_opt.orderer_tls_cacerts);
    let caroots = Buffer.from(odata).toString();
    orderer = client.newOrderer(orderer_opt.orderer_url, {
        'pem': caroots,
        'ssl-target-name-override': "orderer.example.com"
    });

    channel.addOrderer(orderer);
    // targets.push(peer);
    return;
}).then(() => {
    //get the config_envelope,
    return channel.getChannelConfig();
}).then((config_envelope) => {
    //extract the config data
    original_config_proto = config_envelope.config.toBuffer();
    return configtx.decode(original_config_proto, 'common.Config');
}).then((original_config_json) => {
    logger.info(' original_config_json :: %s', original_config_json);
    //log the config json ofr ori and update
    var orig_file = path.join(__dirname, configDir.path + "/" + tarChannel + "_" +configDir.origin_config);
    fs.writeFileSync(orig_file, original_config_json);
    // make a copy of the original so we can edit it
    updated_config_json = original_config_json;
    //json -> obj
    var updated_config = JSON.parse(updated_config_json);

    // Build new organization group
    var name = add_opt.msp_id;
    var mspid = add_opt.msp_id;
    var msp = new MSP(add_opt.msp_id);
    msp.load(mspdir);
    var builder = new FabricConfigBuilder();
    builder.addOrganization(name, mspid, msp.getMSP());
    //builder.addAnchorPeerArray(anchors);

    var org_consortium = builder.buildConsortiumGroup();
    updated_config.channel_group.groups.Consortiums.groups[consortium].groups[name] = org_consortium;
    updated_config_json = JSON.stringify(updated_config);//obj -> json
    logger.info(' updated_config_json :: %s', updated_config_json);
    return configtx.encode(updated_config_json, 'common.Config');
}).then(updated_config_proto => {
    return configtx.compute_delta(original_config_proto, updated_config_proto, tarChannel);
}).then(config_pd => {
    config_proto = config_pd;
    //log the config json of update
    var update_file = path.join(__dirname, configDir.path + "/" + tarChannel + "_" + configDir.update_config);
    fs.writeFileSync(update_file,updated_config_json);

    //for sign
    //get orderer signature
    var signature = client.signChannelConfig(config_proto);
    signatures.push(signature);

    //for sign test

    //get org1
//     var opt = options_org2_i;
//     var createUserOpt = {
//         username: opt.user_id,
//         mspid: opt.msp_id,
//         cryptoContent: {
//             privateKey: getKeyFilesInDir(opt.privateKeyFolder)[0],
//             signedCert: opt.signedCert
//         }
//     }
//     //以上代码指定了当前用户的私钥，证书等基本信息 
//     return sdkUtils.newKeyValueStore({
//         path: "/tmp/fabric-client-stateStore/"
//     }).then((store) => {
//         client.setStateStore(store)
//         return client.createUser(createUserOpt)
//     })
// }).then((user) =>{

    //sign
    //orderer signature
    // var signature = client.signChannelConfig(config_proto);
    // signatures.push(signature);


    //orderer sign
    //     var opt = options_org2_i;
//     var createUserOpt = {
//         username: opt.user_id,
//         mspid: opt.msp_id,
//         cryptoContent: {
//             privateKey: getKeyFilesInDir(opt.privateKeyFolder)[0],
//             signedCert: opt.signedCert
//         }
//     }
//     //以上代码指定了当前用户的私钥，证书等基本信息 
//     return sdkUtils.newKeyValueStore({
//         path: "/tmp/fabric-client-stateStore/"
//     }).then((store) => {
//         client.setStateStore(store)
//         return client.createUser(createUserOpt)
//     })
// }).then((user) =>{
    //for sign test
    //org2 signature
    // var signature = client.signChannelConfig(config_proto);
    // signatures.push(signature);

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
