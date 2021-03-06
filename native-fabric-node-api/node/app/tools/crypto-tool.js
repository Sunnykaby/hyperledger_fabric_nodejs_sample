'use strict'

var path = require('path');
var fs = require('fs');
var log4js = require('log4js');
var logger = log4js.getLogger('crypto-tool.js');
var sdkUtils = require('fabric-client/lib/utils');
logger.setLevel('INFO');\
var store_path = "/tmp/fabric-client-stateStore/";

var CryptoTool = class {

    constructor() {

    }
    /**
     * Get the private key file name from keystore
     * Just for test env, because the key is generated dymanicly.
     * for product env, the user's key will just be generated one time.
     */
    getKeyFilesInDir(dir) {
        const files = fs.readdirSync(dir);
        const keyFiles = [];
        files.forEach((file_name) => {
            let filePath = path.join(dir, file_name);
            if (file_name.endsWith('_sk')) {
                keyFiles.push(filePath);
            }
        })
        return keyFiles;
    }

    /**
     * Get the user from exist security files.
     */
    getUserWithKeys(client, user_opt) {
        if (client == null) reject("No Client");
        //Assign the current user's private key and cert data
        var createUserOpt = {
            username: user_opt.username,
            mspid: user_opt.mspid,
            cryptoContent: {
                privateKey: user_opt.privateKey_path,
                signedCert: user_opt.signedCert
            }
        };
        return sdkUtils.newKeyValueStore({
            path: store_path
        }).then((store) => {
            //Set the state db for app
            client.setStateStore(store);
            //Create the user
            return client.createUser(createUserOpt);
        }, (err) => {
            logger.error(err);
            reject(err);
        }).catch(err => {
            logger.error(err);
            reject(err);
        });
    }

    getCryptoSuite(client, fabric){
        var crypto_suite = fabric.newCryptoSuite();
        // use the same location for the state store (where the users' certificate are kept)
        // and the crypto store (where the users' keys are kept)
        var crypto_store = fabric.newCryptoKeyStore({path: store_path});
        crypto_suite.setCryptoKeyStore(crypto_store);
        client.setCryptoSuite(crypto_suite);
        return crypto_suite;
    }
}

module.exports = CryptoTool;
