/**
*Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved.
*/
'use strict';
var path = require('path');
var fs = require('fs');
var util = require('util');
require('../config.js');//Load the config info
var helper = require('./helper.js');
var logger = helper.getLogger('ca-enroll');
logger.setLevel('DEBUG');


var tx_id = null;
var ORGS = helper.getORGS();


var Fabric_CA_Client = require('fabric-ca-client');
var Fabric_Client = require('fabric-client');
var CryptoTool = require('./tools/crypto-tool.js');
var cryptoTool = new CryptoTool();


var enrollUserCa = function (org_name) {
    logger.info('\n\n============ Install chaincode on organizations ============\n');
    helper.setupChaincodeDeploy();

    var client = null;
    var channel = null;

    org_name = helper.checkOrg(org_name);

    var tlsOptions = {
        trustedRoots: [],
        verify: false
    };

    var fabric_ca_client = null;

    return helper.getClientForOrg(org_name).then(_client => {
        client = _client;
        var suite = cryptoTool.getCryptoSuite(client,Fabric_Client);
        fabric_ca_client = new Fabric_CA_Client('https://bcs05191500manager-psmsvc3.bcsmgr.oci.cloudonline.ml:443', tlsOptions, '', suite);


        // at this point we should have the admin user
        // first need to register the user with the CA server
        return fabric_ca_client.register({ enrollmentID: 'user1', affiliation: 'org1.department1' }, helper.getClientUser());
    }).then((secret) => {
        // next we need to enroll the user with CA server
        console.log('Successfully registered user1 - secret:' + secret);

        return fabric_ca_client.enroll({ enrollmentID: 'user1', enrollmentSecret: secret });
    }).then((enrollment) => {
        console.log('Successfully enrolled member user "user1" ');
        return fabric_client.createUser(
            {
                username: 'user1',
                mspid: 'Org1MSP',
                cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
            });
    }).then((user) => {
        member_user = user;

        return fabric_client.setUserContext(member_user);
    }).then(() => {
        console.log('User1 was successfully registered and enrolled and is ready to intreact with the fabric network');

    }).catch((err) => {
        console.error('Failed to register: ' + err);
        if (err.toString().indexOf('Authorization') > -1) {
            console.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
                'Try again after deleting the contents of the store directory ' + store_path);
        }
    });
};

exports.enrollUserCa = enrollUserCa;

enrollUserCa("bcs05191500");