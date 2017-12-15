'use strict'

var varies_app = function() {

    
    var options_org1_q = { 
        user_id: 'Admin@org1.example.com', 
        msp_id:'Org1MSP', 
        channel_id: 'mychannel', 
        chaincode_id: 'mycc', 
        network_url: 'grpcs://localhost:7051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        privateKeyFolder:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore', 
        signedCert:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem', 
        tls_cacerts:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt', 
        server_hostname: "peer0.org1.example.com" 
    };
    
    var options_org2_q = { 
        user_id: 'Admin@org2.example.com', 
        msp_id:'Org2MSP', 
        channel_id: 'mychannel', 
        chaincode_id: 'mycc', 
        network_url: 'grpcs://localhost:9051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        privateKeyFolder:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/keystore', 
        signedCert:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/signcerts/Admin@org2.example.com-cert.pem', 
        tls_cacerts:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt', 
        server_hostname: "peer0.org2.example.com" 
    };
    
    var options_org3_q = { 
        user_id: 'Admin@org3.example.com', 
        msp_id:'Org3MSP', 
        channel_id: 'mychannel', 
        chaincode_id: 'mycc', 
        network_url: 'grpcs://localhost:11051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        privateKeyFolder:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/keystore', 
        signedCert:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/signcerts/Admin@org3.example.com-cert.pem', 
        tls_cacerts:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt', 
        server_hostname: "peer0.org3.example.com" 
    };

    var options_org1_i = { 
        user_id: 'Admin@org1.example.com', 
         msp_id:'Org1MSP', 
        channel_id: 'mychannel', 
        chaincode_id: 'mycc', 
        peer_url: 'grpcs://localhost:7051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        event_url: 'grpcs://localhost:7053',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        orderer_url: 'grpcs://localhost:7050',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        privateKeyFolder:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore', 
        signedCert:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem', 
        peer_tls_cacerts:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt', 
        orderer_tls_cacerts:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt', 
        server_hostname: "peer0.org1.example.com" 
    };

    var options_org2_i = { 
        user_id: 'Admin@org2.example.com', 
         msp_id:'org2MSP', 
        channel_id: 'mychannel', 
        chaincode_id: 'mycc', 
        peer_url: 'grpcs://localhost:9051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        event_url: 'grpcs://localhost:9053',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        orderer_url: 'grpcs://localhost:7050',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        privateKeyFolder:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/keystore', 
        signedCert:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/signcerts/Admin@org2.example.com-cert.pem', 
        peer_tls_cacerts:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt', 
        orderer_tls_cacerts:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt', 
        server_hostname: "peer0.org2.example.com" 
    };

    var options_org3_i = { 
        user_id: 'Admin@org3.example.com', 
         msp_id:'org3MSP', 
        channel_id: 'mychannel', 
        chaincode_id: 'mycc', 
        peer_url: 'grpcs://localhost:11051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        event_url: 'grpcs://localhost:11053',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        orderer_url: 'grpcs://localhost:7050',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc 
        privateKeyFolder:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/keystore', 
        signedCert:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/signcerts/Admin@org3.example.com-cert.pem', 
        peer_tls_cacerts:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt', 
        orderer_tls_cacerts:'/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt', 
        server_hostname: "peer0.org3.example.com" 
    };
}

module.exports = varies_app;


