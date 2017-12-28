'use strict';

var path = require('path');
var fs = require('fs');

var baseDir = "/home/sdy/startObcs/net/channel/crypto-config/peerOrganizations";
var orgMSP = "Org1MSP";
var orgServer = "org1.example.com";
var mspDir = "msp";



var args = process.argv;
console.log(args);
if(typeof args[2] !== 'undefined' && args[2] != null){
    orgMSP = args[2];
}
if(typeof args[3] !== 'undefined' && args[3] != null){
    orgServer = args[3];
}

var targetOrgMspDir = path.join(path.join(baseDir,orgServer),mspDir);

var targetFile = "/home/sdy/kami_workspace/mspjson/" + orgMSP + ".json";

var writeFile = false;

function getPemFileInDir(dir) {
    const files = fs.readdirSync(dir)
    const keyFiles = []
    files.forEach((file_name) => {
        let filePath = path.join(dir, file_name)
        if (file_name.endsWith('pem')) {
            keyFiles.push(filePath)
        }
    })
    return keyFiles[0];
}

function buildMSPJson(orgName, orgMspDir){
    var mspobj = {
        mspid : orgMSP,
        certs:{
            admincerts:"",
            cacerts:"",
            tlscacerts:""
        }
    }
    //Read admincert
    var adminCertData = fs.readFileSync(getPemFileInDir(path.join(orgMspDir,"admincerts")));
    //Read cacert
    var caCertData = fs.readFileSync(getPemFileInDir(path.join(orgMspDir,"cacerts")));
    //Read tlscacert
    var tlscaCertData = fs.readFileSync(getPemFileInDir(path.join(orgMspDir,"tlscacerts")));

    mspobj.certs.admincerts = adminCertData.toString();
    mspobj.certs.cacerts = caCertData.toString();
    mspobj.certs.tlscacerts = tlscaCertData.toString();
    if(writeFile){
        fs.writeFileSync(targetFile, JSON.stringify(mspobj));
    }
    else console.log(JSON.stringify(mspobj));
}

buildMSPJson(orgMSP,targetOrgMspDir,writeFile);