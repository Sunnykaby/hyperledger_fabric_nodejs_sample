'use strict';

var hfc = require('fabric-client');
var path = require('path');
const fs = require('fs');
var VariesApp = require('./Varies.js');
var MSP = require('./Tools/MSP.js');
var CryptoTool = require('./Tools/CryptoTool.js');
var ConfigTool = require('./Tools/ConfigTool.js');
var NodeTool = require('./NodesTool.js');
var FabricConfigBuilder = require('./Tools/FabricConfigBuilder.js');
var log4js = require('log4js');
var logger = log4js.getLogger('');

var configDir = {
    path: "config",
    origin_config: "originConfig.json",
    update_config: "updateConfig.json"
};

var mspdir = "/home/sdy/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/msp";

var va = new VariesApp();
var configTool = new ConfigTool();
var nodeTool = new NodeTool();
var cryptoTool = new CryptoTool();
var va_opt_type = va.getOptType();
var channel = {};
var client = null;
var orderer = null;
var targets = [];
var tx_id = null;
var orderer_opt = va.getOptions(va_opt_type.ORDERER);
var user_options = va.getOptions(va_opt_type.ORDERER);
var add_opt = va.getOptions(va_opt_type.ORDERER);
var tarChannel = 'testchainid';
var consortium = "SampleConsortium";
var signatures = [];
var request = null;
var config_proto = null;