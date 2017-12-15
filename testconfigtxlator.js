

var path = require('path');
var fs = require('fs');
var configtxlator = require('./configtxlator.js');

var basedir = '/home/sdy/fabric_link/examples/e2e_cli/crypto-config/peerOrganizations/org3.example.com/msp';
var admindir = 'admincerts';
var cadir = 'cacerts';
var tlsdir = 'tlscacerts';

var adminfile = 'Admin@org3.example.com-cert.pem';
var cafile = 'ca.org3.example.com-cert.pem';
var tlsfile = 'tlsca.org3.example.com-cert.pem';

var baseConfigdir = '/home/sdy/fabric_link/examples/e2e_cli/channel-artifacts';
var testconfigraw = 'config_block.pb';

var options = {
    message_type_block:'common.Block',
    message_type_config:'common.Config',
    message_type_update:'update-from-configs',
    meesage_type_configUpdate:'common.ConfigUpdate',
    message_type_envelope:'common.Envelope',
};


var adminpath = path.join(path.join(basedir,admindir),adminfile);
var testconfigpath = path.join(path.join(baseConfigdir,'config'),testconfigraw);


function decodeText(dir){
    if (fs.existsSync(dir)) {
        let data = fs.readFileSync(dir);
        var configtx = new configtxlator();
        let newdata = configtx.decode(data, options.message_type_block);
        return newdata;
    } else {
        return null;
    }
}

function encodeText(dir){
    if (fs.existsSync(dir)) {
        let data = fs.readFileSync(dir);  
        return data.toString('base64');
    } else {
        return null;
    }
}

function computeText(dir){
    if (fs.existsSync(dir)) {
        let data = fs.readFileSync(dir);  
        return data.toString('base64');
    } else {
        return null;
    }
}

console.log(decodeText(testconfigpath));