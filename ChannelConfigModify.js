'use strict';

var hfc = require('fabric-client');
var path = require('path');
var util = require('util');
var sdkUtils = require('fabric-client/lib/utils');
const fs = require('fs');
var VariesApp = require('./Varies.js');
var MSP = require('./Tools/MSP.js');
var CryptoTool = require('./Tools/CryptoTool.js');
var ConfigTool = require('./Tools/ConfigTool.js');
var NodeTool = require('./NodesTool.js');
var FabricConfigBuilder = require('./Tools/FabricConfigBuilder.js');
var log4js = require('log4js');
var logger = log4js.getLogger();


var configDir = {
    path: "config",
    origin_config: "originConfig.json",
    update_config: "updateConfig.json"
};

var mspdir = "/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/msp";

var configTool = new ConfigTool();
var nodeTool = new NodeTool();
var cryptoTool = new CryptoTool();
var configtx = new configtxlator();
var va = new VariesApp();

var channel = {};
var client = null;
var orderer = null;
var tx_id = null;
var va_opt_type = va.getOptType();
var orderer_opt = va.getOptions(va_opt_type.ORDERER);
var user_options = va.getOptions(va_opt_type.ORG1_I);
var add_opt = va.getOptions(va_opt_type.ORG3_I);
// var tarChannel = 'testchainid';
var tarChannel = "mychannel";
var consortium = "SampleConsortium";


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
    let data = fs.readFileSync(user_options.peer_tls_cacerts);
    let peer = client.newPeer(user_options.peer_url,
        {
            pem: Buffer.from(data).toString(),
            'ssl-target-name-override': user_options.server_hostname
        }
    );
    //因为启用了TLS，所以上面的代码就是指定Peer的TLS的CA证书 
    channel.addPeer(peer);
    //连接Orderer的时候也启用了TLS，也是同样的处理方法 
    let odata = fs.readFileSync(orderer_opt.orderer_tls_cacerts);
    let caroots = Buffer.from(odata).toString();
    orderer = client.newOrderer(orderer_opt.orderer_url, {
        'pem': caroots,
        'ssl-target-name-override': "orderer.example.com"
    });
    channel.addOrderer(orderer);
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
    var orig_file = path.join(__dirname, configDir.path + "/" + tarChannel + "_" + configDir.origin_config);
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
    // msp.loadNul();
    var builder = new FabricConfigBuilder();
    builder.addOrganization(name, mspid, msp.getMSP());
    builder.addAnchorPeer(add_opt.server_hostname, add_opt.server_port);
    //builder.addAnchorPeerArray(anchors);

    var org_app = builder.buildApplicationGroup();
    // var org_app = builder.buildAnchor();
    
    // var creator_mod_policy = builder.buildApplicationPolicy("SIGNATURE","Org1MSP",true);
    //add the new group into the app groups(app channel)
    updated_config.channel_group.groups.Application.groups[name] = org_app;
    // updated_config.channel_group.groups.Application.groups[name] = {};
    // delete updated_config.channel_group.groups.Application.groups[name];
    // add the new policy 
    // updated_config.channel_group.groups.Application.policies["Creator"] = creator_mod_policy;
    // change the policy
    // updated_config.channel_group.groups.Application.mod_policy = "Admins";
    //change the policy 
    // updated_config.channel_group.groups.Application.policies.Admins.policy.value.rule = "ANY";
    // updated_config.channel_group.groups.Application.mod_policy = "Writers";
    // updated_config.channel_group.groups.Application.policies.Writers.policy.value.sub_policy = "/Channel/Application/Org1MSP/Admins";
    // updated_config.channel_group.groups.Application.mod_policy = "Admins";
    // updated_config.channel_group.groups.Application.policies.Writers.policy.value.sub_policy = "Admins";
    updated_config_json = JSON.stringify(updated_config);//obj -> json
    logger.info(' updated_config_json :: %s', updated_config_json);
    //log the config json of update
    var update_file = path.join(__dirname, configDir.path + "/" + tarChannel + "_" + configDir.update_config);
    fs.writeFileSync(update_file, updated_config_json);
    return configtx.encode(updated_config_json, 'common.Config');
}).then(updated_config_proto => {
    return configtx.compute_delta(original_config_proto, updated_config_proto, tarChannel);
}).then(config_pb => {
    config_proto = config_pb;

    //for sign test

    //sign
    //org1 signature
    var signature = client.signChannelConfig(config_proto);
    signatures.push(signature);

    //get orderer
//     var opt = orderer_opt;
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
// }).then((user) => {
//     //orderer signature
//     var signature = client.signChannelConfig(config_proto);
//     signatures.push(signature);


    //get org2 signature
    var opt = va.getOptions(va_opt_type.ORG2_I);
    var createUserOpt = {
        username: opt.user_id,
        mspid: opt.msp_id,
        cryptoContent: {
            privateKey: getKeyFilesInDir(opt.privateKeyFolder)[0],
            signedCert: opt.signedCert
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
    //org2 signature
    var signature = client.signChannelConfig(config_proto);
    signatures.push(signature);

    //     //get org3
    //     var opt = va.getOptions(va_opt_type.ORG3_I);
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
    // }).then((user) => {
    //     //org3 signature
    //     var signature = client.signChannelConfig(config_proto);
    //     signatures.push(signature);

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
