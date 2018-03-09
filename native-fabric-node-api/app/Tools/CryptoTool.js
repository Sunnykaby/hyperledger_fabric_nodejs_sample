'use strict'

var path = require('path');
var fs = require('fs');
var log4js = require('log4js');
var logger = log4js.getLogger('CryptoTool.js');
var sdkUtils = require('fabric-client/lib/utils');

var CryptoTool = class {
    constructor() {

    }
    /**
     * Get the private key file name from keystore
     * Just for test env, because the key is generated dymanicly.
     * for product env, the user's key will just be generated one time.
     */
    getKeyFilesInDir(dir) {
        const files = fs.readdirSync(dir)
        const keyFiles = []
        files.forEach((file_name) => {
            let filePath = path.join(dir, file_name)
            if (file_name.endsWith('_sk')) {
                keyFiles.push(filePath)
            }
        })
        logger.error(keyFiles)
        return keyFiles
    }

    /**
     * Get the user from exist security files.
     */
    getUserWithKeys(client, user_opt) {
        if (client == null) reject("No Client");
        var createUserOpt = {
            username: user_opt.username,
            mspid: user_opt.mspid,
            cryptoContent: {
                privateKey: this.getKeyFilesInDir(user_opt.privateKey_path)[0],
                signedCert: user_opt.signedCert
            }
        }
        logger.error(createUserOpt)
        //以上代码指定了当前用户的私钥，证书等基本信息 
        return sdkUtils.newKeyValueStore({
            path: "/tmp/fabric-client-stateStore/"
        }).then((store) => {
            //Set the state db for app
            client.setStateStore(store);
            //create the user
            return client.createUser(createUserOpt);
        }, (err) => {
            logger.error(err);
            reject(err);
        }).catch(err => {
            logger.error(err);
            reject(err);
        });
    }
}

module.exports = CryptoTool;