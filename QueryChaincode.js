'use strict';

var hfc = require('fabric-client'); 
var path = require('path'); 
var sdkUtils = require('fabric-client/lib/utils') 
var fs = require('fs');
var VariesApp = require('./varies.js'); 

var va = new VariesApp();
var va_opt_type = va.getOptType();


var channel = {}; 
var client = null; 
var options = va.getOptions(va_opt_type.ORG1_Q);//choose the target peer
const getKeyFilesInDir = (dir) => { 
//该函数用于找到keystore目录下的私钥文件的路径 
    var files = fs.readdirSync(dir) 
    var keyFiles = [] 
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
    
    var    createUserOpt = { 
                username: options.user_id, 
                 mspid: options.msp_id, 
                cryptoContent: { privateKey: getKeyFilesInDir(options.privateKeyFolder)[0], 
  signedCert: options.signedCert } 
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
    
    let data = fs.readFileSync(options.tls_cacerts); 
    let peer = client.newPeer(options.network_url, 
         { 
            pem: Buffer.from(data).toString(), 
             'ssl-target-name-override': options.server_hostname 
        } 
    ); 
    peer.setName("peer0"); 
    //因为启用了TLS，所以上面的代码就是指定TLS的CA证书 
    channel.addPeer(peer); 
    return; 
}).then(() => { 
    console.log("Make query"); 
    var transaction_id = client.newTransactionID(); 
    console.log("Assigning transaction_id: ", transaction_id._transaction_id); 
//构造查询request参数 
    const request = { 
        chaincodeId: options.chaincode_id, 
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