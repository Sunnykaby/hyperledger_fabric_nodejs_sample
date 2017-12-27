'use strict'

var path = require('path');
var fs = require('fs');
var sdkUtils = require('fabric-client/lib/utils');

var client = null;

var CryptoTool = class {
    constructor(client){
        this.client = client;
    }
    /**
     * Get the private key file name from keystore
     * Just for test env, because the key is generated dymanicly.
     * for product env, the user's key will just be generated one time.
     */
    static getKeyFilesInDir = (dir) => {
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

    /**
     * Get the user from exist security files.
     */
    getUserWithKeys = (user_opt) => {
        return Promise.resolve((resolve, reject) => {
            if (client == null) reject("No Client");
            var createUserOpt = {
                username: user_opt.user_id,
                mspid: user_opt.msp_id,
                cryptoContent: {
                    privateKey: getKeyFilesInDir(user_opt.privateKeyFolder)[0],
                    signedCert: user_opt.signedCert
                }
            }
            //以上代码指定了当前用户的私钥，证书等基本信息 
            return sdkUtils.newKeyValueStore({
                path: "/tmp/fabric-client-stateStore/"
            }).then((store) => {
                //Set the state db for app
                client.setStateStore(store);
                //create the user
                return client.createUser(createUserOpt);
            }).then(user => {
                resolve(user);
            }, (err) => {
                reject(err);
            }).catch(err => {
                reject(err);
            });
        });
    }
}

module.exports = CryptoTool;