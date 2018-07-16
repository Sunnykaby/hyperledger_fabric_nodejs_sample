'use strict'

var fsx = require('fs-extra');
var Client = require('fabric-client');
var base_config_path = "../"

var ConfigTool = class {

    constructor() {

    }

    cleanUpConfigCache(orgName) {
        let client = Client.loadFromConfig(base_config_path + orgName + '.yaml');
        let client_config = client.getClientConfig();

        let store_path = client_config.credentialStore.path;
        fsx.removeSync(store_path);

        let crypto_path = client_config.credentialStore.cryptoStore.path;
        fsx.removeSync(crypto_path);
    }

    initClientWithOrg() {
        // build a 'Client' instance that knows the connection profile
        //  this connection profile does not have the client information, we will
        //  load that later so that we can switch this client to be in a different
        //  organization.
        var client = Client.loadFromConfig(base_config_path + 'network.yaml');

        // Load the client information for an organization.
        // The file only has the client section.
        // A real application might do this when a new user logs in.
        // client_org1.loadFromConfig(base_config_path + orgName + '.yaml');
        // tell this client instance where the state and key stores are located
        return client.initCredentialStores().then((nothing) => {
            //     return client._setAdminFromConfig();
            // }).then( admin =>{
            // return client.setUserContext("admin");
            // }).then(admin =>{
            // logger.error(admin)
            return Promise.resolve(client);
        });
    }
}

module.exports = ConfigTool;
