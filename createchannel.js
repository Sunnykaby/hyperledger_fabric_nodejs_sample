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
    origin_config: "oriCreateConfig.json",
    update_config: "updCreateConfig.json"
};

var channelConfig = "/home/sdy/channelConfig";
var new_channelName = "mychannel3";

var mspdir = "/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/msp";

var va = new VariesApp();
var va_opt_type = va.getOptType();
var channel = {};
var client = null;
var orderer = null;
var targets = [];
var tx_id = null;
var orderer_opt = va.getOptions(va_opt_type.ORDERER);
var user_options = va.getOptions(va_opt_type.ORG1_I);
var tarChannel = new_channelName;
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

function changePolicy(policy_group){
    for (var key in policies) {
        if (policies.hasOwnProperty(key)) {
            //
            var newpolicy = {
                mod_policy: "Admins",
                policy : { 
                    type : 1,
                    value : {
                         identities: [
                             //{
                             //    principal: {
                             //        msp_identifier: this.mspid
                             //    }
                             //}
                         ],
                         rule: {
                             n_out_of: {
                                 n: 1,
                                 rules: [
                                     //{
                                     //    signed_by: 0
                                     //}
                                 ]
                             }
                         }
                    }
                }
            }
            //
            if (!policies[key].hasOwnProperty('mspids')) {
                console.log("Missing MSPID in policy configuration")
                
            }
            var i = 0;
            policies[key].mspids.forEach(function( mspid) {
                var id = {
                    principal: {
                        msp_identifier: mspid
                    }
                }
                var rule = {
                    signed_by : i
                }
                newpolicy.policy.value.identities.push(id)
                newpolicy.policy.value.rule.n_out_of.rules.push(rule)
                i++
            })
            policy_group[key] = newpolicy
        }
    }
    return policy_group;
}



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
    //连接Orderer的时候也启用了TLS，也是同样的处理方法 
    let odata = fs.readFileSync(orderer_opt.orderer_tls_cacerts);
    let caroots = Buffer.from(odata).toString();
    orderer = client.newOrderer(orderer_opt.orderer_url, {
        'pem': caroots,
        'ssl-target-name-override': "orderer.example.com"
    });
    //persist
    let envelope_bytes = fs.readFileSync(path.join(channelConfig, tarChannel+".tx"));
    return configtx.decode(envelope_bytes, 'common.Envelope');
}).then((envelop_json) =>{
    var orig_file = path.join(__dirname, configDir.path + "/" + tarChannel + "_" +configDir.origin_config);
    fs.writeFileSync(orig_file, envelop_json);
    var envelope = JSON.parse(envelop_json);
    //modify the config
    var policy_group = envelope.payload.data.config_update.write_set.groups.Application.policies;
    changePolicy(policy_group);
    var fab = new FabricConfigBuilder();
    var creator_pol = fab.buildApplicationPolicy("SIGNATURE",user_options.msp_id,true);
    policy_group["Creator"] = creator_pol;
    envelope.payload.data.config_update.write_set.groups.Application.mod_policy = "Creator";
    // envelope.payload.data.config_update.write_set.groups.Application["policies"] = 
    //
    updated_config_json = JSON.stringify(envelope, null, 4);
    var update_file = path.join(__dirname, configDir.path + "/" + tarChannel + "_" + configDir.update_config);
    fs.writeFileSync(update_file,updated_config_json);
    return configtx.encode(updated_config_json, 'common.Envelope');
}).then((updated_config_proto) => {
    config_proto = client.extractChannelConfig(updated_config_proto);

    //for sign
    //get org1 signature
    var signature = client.signChannelConfig(config_proto);
    signatures.push(signature);

    //for sign test

    //get org2
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
