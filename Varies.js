'use strict'

var VariesApp = class {
    constructor(dir) {

        this.option_type = {
            ORG1: 1,
            ORG2: 2,
            ORG3: 3,
            ORDERER: 4
        };

        this.baseCryptoDir = '/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/';

        if (dir != null) baseCryptoDir = dir;

        /**
         * the configtxlator message type
         */
        this.options_configtxlator = {
            message_type_block: 'common.Block',
            message_type_config: 'common.Config',
            message_type_update: 'update-from-configs',
            meesage_type_configUpdate: 'common.ConfigUpdate',
            message_type_envelope: 'common.Envelope',
        };

        //for create user of org1
        this.options_org1 = {
            user_id: 'Admin@org1.example.com',
            msp_id: 'Org1MSP',
            channel_id: 'mychannel',
            chaincode_id: 'mycc',
            peer_url: 'grpcs://localhost:7051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            event_url: 'grpcs://localhost:7053',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            orderer_url: 'grpcs://localhost:7050',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            privateKeyFolder: this.baseCryptoDir + 'peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore',
            signedCert: this.baseCryptoDir + 'peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem',
            peer_tls_cacerts: this.baseCryptoDir + 'peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt',
            orderer_tls_cacerts: this.baseCryptoDir + 'ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt',
            server_hostname: "peer0.org1.example.com"
        };
        //for create user of org2
        this.options_org2 = {
            user_id: 'Admin@org2.example.com',
            msp_id: 'Org2MSP',
            channel_id: 'mychannel',
            chaincode_id: 'mycc',
            peer_url: 'grpcs://localhost:9051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            event_url: 'grpcs://localhost:9053',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            orderer_url: 'grpcs://localhost:7050',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            privateKeyFolder: this.baseCryptoDir + 'peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/keystore',
            signedCert: this.baseCryptoDir + 'peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/signcerts/Admin@org2.example.com-cert.pem',
            peer_tls_cacerts: this.baseCryptoDir + 'peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt',
            orderer_tls_cacerts: this.baseCryptoDir + 'ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt',
            server_hostname: "peer0.org2.example.com"
        };
        //for create user of org3
        this.options_org3 = {
            user_id: 'Admin@org3.example.com',
            msp_id: 'Org3MSP',
            channel_id: 'mychannel',
            chaincode_id: 'mycc',
            peer_url: 'grpcs://localhost:11051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            event_url: 'grpcs://localhost:11053',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            orderer_url: 'grpcs://localhost:7050',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            privateKeyFolder: this.baseCryptoDir + 'peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/keystore',
            signedCert: this.baseCryptoDir + 'peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/signcerts/Admin@org3.example.com-cert.pem',
            peer_tls_cacerts: this.baseCryptoDir + 'peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt',
            orderer_tls_cacerts: this.baseCryptoDir + 'ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt',
            server_hostname: "peer0.org3.example.com"
        };
        //for create user of orderer
        this.options_orderer = {
            user_id: 'Admin@example.com',
            msp_id: 'OrdererMSP',
            channel_id: 'mychannel',
            chaincode_id: 'mycc',
            orderer_url: 'grpcs://localhost:7050',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
            privateKeyFolder: this.baseCryptoDir + 'ordererOrganizations/example.com/users/Admin@example.com/msp/keystore',
            signedCert: this.baseCryptoDir + 'ordererOrganizations/example.com/users/Admin@example.com/msp/signcerts/Admin@example.com-cert.pem',
            orderer_tls_cacerts: this.baseCryptoDir + 'ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt',
            server_hostname: "orderer.example.com"
        };
    };

    getOptType() {
        return this.option_type;
    }

    getConfigTxMsgType() {
        return this.options_configtxlator;
    }

    getOptions(type) {
        switch (type) {
            case this.option_type.ORDERER:
                return this.options_orderer;
                break;
            case this.option_type.ORG1:
                return this.options_org1;
                break;
            case this.option_type.ORG2:
                return this.options_org2;
                break;
            case this.option_type.ORG3:
                return this.options_org3;
                break;
        };
    };
}

module.exports = VariesApp;


