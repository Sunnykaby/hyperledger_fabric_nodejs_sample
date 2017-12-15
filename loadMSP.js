"use strict";
var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var multer = require('multer');

var scriptName = path.basename(__filename);
var log4js = require('log4js');
var logger = log4js.getLogger(scriptName);
var tmp = require('tmp');
var exec = require('child_process').exec;
var events = require('events');

var Channel = require('obcs-sdk-node').Channel;
var MSP = require('MSP');
var FabricConfigBuilder = require('FabricConfigBuilder');
var NodeList = require('obcs-sdk-node').NodeList;
var FabricCA = require('obcs-sdk-node').FabricCA;

var obcsUtil = require('obcs-sdk-node/util/utils.js');

var Util = require('./utils.js');
var configtxlator = require('./configtxlator.js');
var config_json = require('../config.json');

var Joi = require('joi');

/**
 *  Get instance role
 *  URI:
 *  http://console_addr:port/api/v1/networks/instanceRole
 */
router.get('/instanceRole', function (req, res, next) {
    var nodes = NodeList.list();
    Util.getNodes(true).then(nodes=>{
        if (nodes.orderers.length == 0) {
            res.send("member");
        }
        else {
            res.send("founder");
        }
    }).catch(reason=>{
        res.status(500).send(reason);
    });
});

/**
 *  Get instance name 
 *  URI:
 *  http://console_addr:port/api/v1/networks/instanceName
 */
router.get('/instanceName', function (req, res, next) {
    if (typeof process.env.BCS_CLOUD_STACKNAME === 'undefined'){
        res.status(500).send('BCS stack name is not set');
    } else {
        res.send(process.env.BCS_CLOUD_STACKNAME);
    }
});

var get_org_certs = function(mspid, json_certs){
    if(typeof json_certs.certs === 'undefined' || typeof json_certs.certs.cacerts === 'undefined' || typeof json_certs.certs.admincerts === 'undefined'){
        logger.info("admincerts or cacerts undefined in ", json_certs);
        return Promise.reject("admincerts or cacerts undefined in this org");
    }
    if(typeof mspid === 'undefined' || mspid === ''){
        logger.info("org mspid undefined");
        return Promise.reject("mspid undefined in this org");
    }

/*    return new Promise((resolve, reject) => {
           resolve("/home/holuser/work/src/github.com/hyperledger/fabric/examples/e2e_cli/crypto-config/peerOrganizations/org2.example.com/msp");
});
*/
    return new Promise((resolve, reject) => {
        tmp.dir({unsafeCleanup: true}, (err, tpath, cleanupCallback) => {
            logger.trace("get_org_certs_tpath:", tpath);
            if (err) {
                reject(err);
            } else {
                Util.mkdirp(path.join(tpath, mspid, "/msp/cacerts"), function(){
                    if (err){
                        reject(err);
                    }
                    Util.mkdirp(path.join(tpath, mspid, "/msp/admincerts"), function(){
                        if (err){
                            reject(err);
                        }
                        Util.mkdirp(path.join(tpath, mspid, "/msp/tlscacerts"), function(){
                            if (err){
                                reject(err);
                            }
                            fs.writeFile(path.join(tpath, mspid, "/msp/cacerts/ca-cert.pem"), json_certs.certs.cacerts, (err) => {
                                if (err){
                                    reject(err);
                                }
                                fs.writeFile(path.join(tpath, mspid, "/msp/admincerts/cert.pem"), json_certs.certs.admincerts, (err) => {
                                    if (err){
                                        reject(err);
                                    }
                                    if (json_certs.certs.tlscacerts != undefined){
                                        fs.writeFile(path.join(tpath, mspid, "/msp/tlscacerts/tls-ca.pem"), json_certs.certs.tlscacerts, (err) => {
                                            if (err){
                                                reject(err);
                                            }
                                            logger.trace("certs_path:", path.join(tpath, mspid, "/msp"));
                                            resolve(path.join(tpath, mspid, "/msp"));
                                        });
                                    }else {
                                        logger.trace("certs_path:", path.join(tpath, mspid, "/msp"));
                                        resolve(path.join(tpath, mspid, "/msp"));
                                    }
                                });
                            });     
                        });
                    });
                });
            }
        });
    });
}
/*
 *add orgs
 *to use this api, you need to set env PATH to include loadcertconfig_network.sh script
request body example:
{
  "Consortium": "SampleConsortium",
  "SystemChainID": "testchainid",
  "org":{
      "org1":
        {
          "mspid": "peer0",
          "certs": {
            "admincerts": "123",
            "cacerts": "www",
            "tlscacerts": "eee"
          }
        },
      "org2":
        {
          "mspid": "peer1",
          "certs": {
            "admincerts": "123",
            "cacerts": "qqq"
          }
        }
    }
}
 */
router.post('/addOrgs',  function (req, res, next) {
    var SystemChainID = req.body.SystemChainID;
    var Consortium = req.body.Consortium;
    var org = req.body.org;
    if (typeof SystemChainID === 'undefined' || typeof Consortium === 'undefined' || typeof org === 'undefined' ){
        var err = new Error('argument undefined');
        err.status = 400;
        logger.info("argument undefined");
        return next(err);
    }
    const addOrgsSchema = Joi.object({
        Consortium: Util.obcsStringSchema.required(),
        SystemChainID: Util.obcsStringSchema.required(),
        org: Joi.object().required()
    });

    const orgSchema = Joi.object({
        mspid: Util.obcsStringSchema.required(),
        certs: Joi.object({
            cacerts: Util.obcsStringSchema.required(),
            admincerts: Util.obcsStringSchema.required(),
            tlscacerts: Util.obcsStringSchema
        })
    });
    var ret = Joi.validate(req.body, addOrgsSchema);
    if (ret.error) {
        logger.error(ret.error.toString());
        var err = new Error("invalid argument");
        err.status = 400;
        return next(err);
    }

    for (var key in org){
        ret = Joi.validate(org[key], orgSchema);
        if (ret.error) {
            logger.error(ret.error.toString());
            var err = new Error("invalid argument");
            err.status = 400;
            return next(err);
        }
 
    }

    var upload_Promises = [];
    var orderer;
    var mspid_arr = [];
    var mspdir_arr = [];
    return Util.getNodes(false).then(nodes => {
        orderer = nodes.orderers[0];
        logger.debug("orderer_addr:", orderer.listenAddr, "orderer_port:", orderer.listenPort);
        for (var key in org) {
            logger.debug("ready to get certs for org: ", key);
            upload_Promises.push(get_org_certs(key, org[key]));
        }
        if (upload_Promises.length === 0){
            var err = new Error("no specified certs to upload");
            return Promise.reject(err);
        }
        return Promise.all(upload_Promises);
    }).then(results => {
        logger.trace("upload all succeeded");
        var write_tlscacerts_promises = [];
        for (var i=0; i < results.length; i++){
            var tlscacerts_name = Object.keys(org)[i].concat('_tlscacerts.pem');
            var tlscacerts_file = "";
            if (obcsUtil.isNativeDockerEnv()) {
                let tpath = obcsUtil.getDataPathInNativeDockerEnv().trim();
                tlscacerts_file = path.join(tpath, tlscacerts_name);
            } else {
                if (process.env.APP_HOME === undefined){
                    return Promise.reject("APP_HOME is not set");
                }
                tlscacerts_file = path.join(process.env.APP_HOME, tlscacerts_name);
            }

            write_tlscacerts_promises.push(Util.writeFilePromise(tlscacerts_file, org[key].certs.tlscacerts));
            mspid_arr.push(Object.keys(org)[i]);
            mspdir_arr.push(results[i]);
        }
        return Promise.all(write_tlscacerts_promises);
    }).then(status => {
        return joinNetworkArray(mspid_arr, mspid_arr, mspdir_arr, SystemChainID, Consortium, orderer.listenAddr, orderer.listenPort);
    }).then(results => {
        logger.trace("final results:", results);
        return res.send("SUCCESS");
    }).catch(err => {
        return next(err);
    });

});

function download_certs(){
    var mspid;
    var json_obj = {};

    return Util.getNodes(false).then(nodes => {
        if (nodes.peers){
            //app_id = nodes.peers[0].peerId;
            mspid = nodes.peers[0].localMspId;
            var app_id = mspid;
        }
        else {
            var err = new Error("no peers in this org");
            return Promise.reject(err);
        }
        if (obcsUtil.isNativeDockerEnv()) {
            logger.info(`download certs in native docker env, id is ${app_id}`);

            // Example of directory structure:
            // ./crypto-config/peerOrganizations/org1.example.com/msp/admincerts/Admin@org1.example.com-cert.pem
            // ./crypto-config/peerOrganizations/org1.example.com/msp/cacerts/ca.org1.example.com-cert.pem
            // ./crypto-config/peerOrganizations/org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem
            let tpath = obcsUtil.getDataPathInNativeDockerEnv().trim();
            let orgName;
            try {
                // find orgName from file .config.json
                let configFile = path.join(tpath, '.config.json');
                let data = fs.readFileSync(configFile, 'utf8');
                let config = JSON.parse(data);
                orgName = config.peerOrgs[0].domainName;
            } catch (e) {
                logger.warn(e);
            }

            if (! orgName) {
                logger.info("can't find org domain name from file .config.json, try to find it in file system.");
                let dirPath = path.join(tpath, '/crypto-config/peerOrganizations/');
                let files = fs.readdirSync(dirPath);
                files.forEach((fileName) => {

                    let filePath = path.join(dirPath, fileName);

                    if (fs.lstatSync(filePath).isDirectory()) {
                        orgName = fileName;
                        return;
                    }
                });
            }

            if (! orgName) {
                logger.error(`can find org directory for org ${app_id}`);
                return Promise.reject(`can find org directory for org ${app_id}`);
            }

            let prefix = `/crypto-config/peerOrganizations/${orgName}/`;
            let admincerts_file = path.join(tpath, prefix, `/msp/admincerts/Admin@${orgName}-cert.pem`);
            let cacerts_file = path.join(tpath, prefix, `/msp/cacerts/ca.${orgName}-cert.pem`);

            //json_obj.id = app_id;
            json_obj.mspid = mspid;
            json_obj.certs = {};
            try {
                let stat = fs.statSync(admincerts_file);
                if (stat.isFile()) {
                    json_obj.certs.admincerts = fs.readFileSync(admincerts_file, 'utf8');
                } else {
                    return Promise.reject("admincert not found");
                }
            } catch (err) {
                return Promise.reject("admincert not found");
            }
            try {
                let stat = fs.statSync(cacerts_file);
                if (stat.isFile()) {
                    json_obj.certs.cacerts = fs.readFileSync(cacerts_file, 'utf8');
                } else {
                    return Promise.reject("cacert not found: ");
                }
            } catch (err) {
                return Promise.reject("cacert not found: ");
            }
            let json_str = JSON.stringify(json_obj, null, 2);
            let json_name = "certs.json";
            let json_file = path.join(tpath, json_name);
            fs.writeFileSync(json_file, json_str);

            logger.info("certs load successfully in :", path.join(tpath, "certs.json"));
            return res.send(path.join(tpath, "certs.json"));
        } else {
            var tpath;
            var admincerts_file;
            var cacerts_file;
            var tlscacerts_file;
            return new Promise((resolve, reject) => {
                tmp.dir({unsafeCleanup: true}, (err, tpath, cleanupCallback) => {
                    if (err) {
                        reject("Download certificates failed: " + err.message);
                    } else {
                        resolve(tpath);
                    }
                });
            }).then(path => {
                tpath = path;
                logger.trace("certs download path:", tpath);
                logger.info('loadcertconfig_network.sh ' + tpath + ' 1');
                return new Promise((resolve, reject) => {
                    exec('loadcertconfig_network.sh ' + tpath + ' 1', (error, stdout, stderr) => {
                        if (error) {
                            logger.error("download certs error.");
                            reject("Download certificates failed: " + error.message);
                        } else {
                            resolve('OK');
                        }
                    });
                });
            }).then(status => {
                admincerts_file = path.join(tpath, "/msp/admincerts/cert.pem");
                cacerts_file = path.join(tpath, "/msp/cacerts/ca-cert.pem");

                if (process.env.LOCAL_STORAGE != 'y'){
                    if (process.env.APP_HOME === undefined){
                        return Promise.reject("APP_HOME is not set");
                    }
                    tlscacerts_file = path.join(process.env.APP_HOME, "/thirdtls/tls-ca.pem");
                }else{
                    tlscacerts_file = path.join(process.env.LOCAL_STORAGE_PATH, "tls-ca.pem")
                }
                //tlscacerts_file = path.join(tpath, "/msp/tlscacerts/tls-ca.pem");

                json_obj.mspid = mspid;
                json_obj.certs = {};
                var stat_promises = [];

                stat_promises.push(Util.statPromise(admincerts_file));
                stat_promises.push(Util.statPromise(cacerts_file));
                stat_promises.push(Util.statPromise(tlscacerts_file));
                return Promise.all(stat_promises);
            }).then(stats => {
                var read_promises = [];
                if (stats[0] === 'no_exist'){
                    return Promise.reject('admincert not found');
                }
                if (stats[1] === 'no_exist'){
                    return Promise.reject('cacert not found');
                }
                if (stats[2] === 'no_exist'){
                    logger.trace('no tlscacerts');
                }
                
                if (!stats[0].isFile()){
                        return Promise.reject('admincert not found');
                }
                if (!stats[1].isFile()){
                        return Promise.reject('cacert not found');
                }
 
                var readPromise = function(file, mode){
                    return new Promise((resolve, reject) => {
                        fs.readFile(file, mode, (err, data) => {
                            if (err){
                                reject(err);
                            }
                            resolve(data);
                        });
                    });
                };

                read_promises.push(readPromise(admincerts_file, 'utf8'));
                read_promises.push(readPromise(cacerts_file, 'utf8'));
                if (stats[2] != 'no_exist'){
                    read_promises.push(readPromise(tlscacerts_file, 'utf8'));
                }
                return Promise.all(read_promises);
            }).then(datas => {
                json_obj.certs.admincerts = datas[0];
                json_obj.certs.cacerts = datas[1];
                if (datas.length > 2){
                    json_obj.certs.tlscacerts = datas[2];
                }
                var json_str = JSON.stringify(json_obj, null, 2);
                var json_name = "certs.json";
                var json_file = path.join(tpath, json_name);

                return new Promise((resolve, reject) => {
                    fs.writeFile(json_file, json_str, (err, stats) => {
                        if (err){
                            reject(err);
                        }
                        resolve('OK');
                    });
                });
            }).then(status => {
                return Promise.resolve(path.join(tpath, "certs.json"));
            }).catch(err => {
                return Promise.reject(err);
            });
        }
    }).catch(err => {
        return Promise.reject(err);
    });
}
/*
 *download certs by loadcertconfig.sh script
 *to use this api, you need to set env PATH to include loadcertconfig_network.sh script
request body example:
{
}
 */
router.post('/loadCerts', function(req, res, next){
    return download_certs().then(file => {
        return res.send(file);
    }).catch(err => {
        return next(err);
    });
});

router.post('/downloadCerts', function(req, res, next){
    logger.trace("req.body.request:%j", req.body);
    var request = JSON.parse(req.body.request);
    var filePath = request.fpath;

    const ret = Joi.validate(filePath, Util.obcsStringSchema.required());    
    if (ret.error) {
        logger.error(ret.error.toString());
        var err = new Error("invalid argument");
        err.status = 400;
        return next(err);
    }

    //TODO check file exist
    res.download(filePath);
});

router.post('/upload_certs',  function (req, res, next) {
    var org = req.body.org;

    if ( typeof org === 'undefined' ){
        var err = new Error('argument undefined');
        err.status = 400;
        logger.info("argument undefined");
        return next(err);
    }

  const uploadOrgSchema = Joi.object({
      certs: Joi.object({
          cacerts: Util.obcsStringSchema.required(),
          admincerts: Util.obcsStringSchema.required(),
          tlscacerts: Util.obcsStringSchema
      })
  });

  for (var key in org){
      var ret = Joi.validate(org.key, uploadOrgSchema);
      if (ret.error) {
          logger.error(ret.error.toString());
          var err = new Error("invalid argument");
          err.status = 400;
          return next(err);
      }
  }
 
    var upload_Promises = [];
    return Util.getNodes(false).then(nodes => {
        for (var key in org) {
            logger.debug("ready to upload certs for org: ", key);
            upload_Promises.push(get_org_certs(key, org[key]));
        }
        if (upload_Promises.length === 0){
            return Promise.reject('no specified certs to upload');
        }
        return Promise.all(upload_Promises);
    }).then(results => {
        var loadcert_promises = [];
        for(var eachpath of results){
            var tlsca_path = path.join(eachpath, "/tlscacerts/tls-ca.pem");
            if (process.env.LOCAL_STORAGE_PATH != undefined){
                var local_storage_path = path.join(process.env.LOCAL_STORAGE_PATH, "tls-ca.pem");
                function copyFilePromise(source, target){
                    return new Promise((resolve, reject) => {
                        Util.copyFile(source, target, err => {
                            if (err){
                                reject(err);
                            }
                            resolve("OK");
                        });
                    });
                }
                loadcert_promises.push(copyFilePromise(tlsca_path, local_storage_path));
            }else{
                logger.info("LOCAL_STORAGE_PATH is not set , skip tlscacert upload");
            }
            var upload_path = eachpath.replace(/msp/,"");
            logger.info('loadcertconfig_network.sh ' + upload_path + ' 0 ');
            function loadcertPromise(path){
                return new Promise((resolve, reject) => {
                    exec('loadcertconfig_network.sh ' + path + ' 0 ', (error, stdout, stderr) => {
                        if (error) {
                            logger.error("upload certs error.");
                            return Promise.reject(error);
                        }
                    });
                });
            }
            loadcert_promises.push(loadcertPromise(upload_path));
/*            exec('loadcertconfig_network.sh ' + upload_path + ' 0 ', (error, stdout, stderr) => {
                if (error) {
                    logger.error("upload certs error.");
                    return next(error);
                }
            });
*/

        }
        Promise.all(loadcert_promises);
    }).then(function(){
        logger.trace("upload certs succeeded");
        return res.send("SUCCESS");
    }, err => {
        logger.error("upload certs error.");
        return next(err);
    }).catch(err => {
        return next(err);
    });
});

/*
  {
      "Name" : "Org2MSP",
      "MSPID" : "Org2MSP",
      "MSPDir" : "/home/oracle/test/fixtures/channel/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp",
      "SystemChainID" : "testchainid",
      "Consortium" : "SampleConsortium",
      "Orderer" : {
          "host" : "orderer.org1.example.com",
          "port" : 7050
      }
  }
 */
router.post('/joinNetwork', function(req, res, next) {
    var name = req.body.Name;
    var mspid = req.body.MSPID;
    var mspdir = req.body.MSPDir;
    var systemchainid = req.body.SystemChainID;
    var consortium = req.body.Consortium;
    var orderer = req.body.Orderer;
logger.info("joinNetwork req.body:", req.body);
    const joinNetworkSchema = Joi.object({
        Name: Util.obcsStringSchema.required(),
        MSPID: Util.obcsStringSchema.required(),
        MSPDir: Util.obcsStringSchema.required(),
        SystemChainID: Util.obcsStringSchema.required(),
        Consortium: Util.obcsStringSchema.required(),
        Orderer: Joi.object({host: Util.obcsStringSchema.required(),
                         port: Joi.number().required()
                        })
    });

    const ret = Joi.validate(req.body, joinNetworkSchema);
    if (ret.error) {
        logger.error(ret.error.toString());
        var err = new Error("invalid argument");
        err.status = 400;
        return next(err);
    }

    return joinNetwork(name, mspid, mspdir, systemchainid, consortium, orderer.host, orderer.port).then(nothing => {
res.send(nothing);
//            res.send("SUCCESS");
        }, err => {
            logger.error('Join network failed due to error: ', err);
            res.status(500).send(err);
        }).catch(err=> {
            logger.error('Join network exception: ', err);
            res.status(500).send(err);
        });
});

// anchors is array of object, which has host and port property exactly
var joinNetwork = function (name, mspid, mspdir, systemchainid, consortium,
                            orderer_addr, orderer_port) {

    if (typeof name === 'undefined' || typeof mspid === 'undefined'
        || typeof mspdir === 'undefined' || typeof systemchainid === 'undefined'
        || typeof consortium === 'undefined' || typeof orderer_addr === 'undefined'
        || typeof orderer_port === 'undefined') {

        var err = new Error('argument undefined in joinNetwork function');
        return Promise.reject(err);
    }

    logger.info('Join network, organization %s, MSPID %s, system chain ID %s, consortium %s',  mspid, mspdir, systemchainid, consortium);
    logger.info('Orderer service address: %s:%d', orderer_addr, orderer_port);

/*    if (!fs.existsSync(mspdir)) {
        return Promise.reject(new Error('MSP directory not exist: ' + mspdir));
    }
*/
    var chain = new Channel(systemchainid);
    var txlator = new configtxlator();

    var orderer = null;
    var config = null;
    var original_block = null;

    return new Promise((resolve, reject) => {
        fs.stat(mspdir, (err, stats) => {
            if (err){
                reject(err);
            }
            resolve(stats);
        });

    }).then(stats => {
        if(!stats || !stats.isDirectory()){
            logger.error('MSP directory not exist: ', mspdir);
            return Promise.reject(new Error('MSP directory not exist: ' + mspdir));
        }
        return Util.get_orderer_info(orderer_addr, orderer_port);
    }).then(orderer_info=> {
            if (typeof orderer_info === 'string') {
                return Promise.reject(orderer_info);
            }
            orderer = orderer_info;
            return chain.getChannelConfigRaw(orderer.url, orderer.opts); 
        }).then(config_envelop_block => {
            logger.info('Got config envelop');
            return txlator.decode(config_envelop_block, 'common.Envelope');
        }).then(envelop_json => {
            var envelop = JSON.parse(envelop_json);
            var chncfg = envelop.payload.data.config
            if (!chncfg.channel_group.groups.hasOwnProperty('Consortiums') ||
                !chncfg.channel_group.groups.Consortiums.groups.hasOwnProperty(consortium)) {
                logger.error('Consortium not found %s', consortium);
                return Promise.reject('Consortium not found');
            }

            if (chncfg.channel_group.groups.Consortiums.groups[consortium].groups.hasOwnProperty(name)) {
                logger.error('Organization already exist');
                return Promise.reject('Organization already exist');
            }

            config = chncfg;
            // DEBUG purpose only
            //fs.writeFileSync('debug_config.json', JSON.stringify(config, null, 4));

            return txlator.encode(JSON.stringify(chncfg, null, 4), 'common.Config');
        }).then(block => {
            original_block = block;

            // Build new organization group
            var msp = new MSP(mspid);
            msp.load(mspdir);

            var builder = new FabricConfigBuilder();
            builder.addOrganization(name, mspid, msp.getMSP()); 
            //builder.addAnchorPeerArray(anchors);

            var org_consortium = builder.buildConsortiumGroup();

            var updated_config = config;
            updated_config.channel_group.groups.Consortiums.groups[consortium].groups[name] = org_consortium;

            //if (updated_config.channel_group.groups.hasOwnProperty('Application')) {
            //     var org_app = builder.buildApplicationGroup();
            //     updated_config.channel_group.groups.Application.groups[name] = org_app;
            //}

            // DEBUG purpose only
            //fs.writeFileSync('debug_updated_config.json', JSON.stringify(updated_config, null, 4));

            return txlator.encode(JSON.stringify(updated_config, null, 4), 'common.Config');
        }).then(updated_block => {
            return txlator.compute_delta(original_block, updated_block, systemchainid);
        }).then(delta_cfg=> {
            // DEBUG purpose only
            //fs.writeFileSync('debug_delta.pb', delta_cfg);

            return chain.updateChannel(delta_cfg, orderer.url, orderer.opts);
        }).then( result => {
            logger.info("join_network success, mspid:", mspid);
            return Promise.resolve('SUCCESS');
        }, err => {
            logger.error('Update channel %s failed, error=%s', systemchainid, err); 
            return Promise.reject(err);
        }).catch (err=>{
            logger.error('Exception join network: %s', err);
            return Promise.reject(err);
        });
}

var joinNetworkArray = function (names, mspids, dirs, systemchainid, consortium,
                            orderer_addr, orderer_port) {

    if (typeof names === 'undefined' || typeof mspids === 'undefined'
        || typeof dirs === 'undefined' || typeof systemchainid === 'undefined'
        || typeof consortium === 'undefined' || typeof orderer_addr === 'undefined'
        || typeof orderer_port === 'undefined') {

        var err = new Error('argument undefined in joinNetwork function');
        return Promise.reject(err);
    }

    if (!Array.isArray(names) || !Array.isArray(mspids) || !Array.isArray(dirs)) {
        var err = new Error('Unexpect type of parameter names/mspids/dirs, expect Array');
        return Promise.reject(err);
    }

    for (var i = 0; i < names.length; i++){
        logger.info('Join network, names:', names[i], ' mspids:', mspids[i], ' mspdirs: ', dirs[i]);
    }
    logger.info('Join network, system chain ID %s, consortium %s',  systemchainid, consortium);
    logger.info('Orderer service address: %s:%d', orderer_addr, orderer_port);

/*    for (let mspdir of dirs) {
        if (!fs.existsSync(mspdir)) {
            return Promise.reject(new Error('MSP directory not exist: ' + mspdir));
        }
    }
*/
    var chain = new Channel(systemchainid);
    var txlator = new configtxlator();

    var orderer = null;
    var config = null;
    var original_block = null;

    var promises_mspdirs = [];
    for (var mspdir of dirs){
        promises_mspdirs.push(Util.lstatPromise(mspdir));
    }
    return Promise.all(promises_mspdirs).then(stats => {
        for (var i = 0; i < stats.length; i ++){
            if (!stats[i] || !stats[i].isDirectory()){
                logger.error('MSP directory not exist: ', dirs[i]);
                return Promise.reject(new Error('MSP directory not exist: ' + dirs[i]));
            }
        }
        return Util.get_orderer_info(orderer_addr, orderer_port);
    }).then(orderer_info=> {
            if (typeof orderer_info === 'string') {
                return Promise.reject(orderer_info);
            }
            orderer = orderer_info;
            return chain.getChannelConfigRaw(orderer.url, orderer.opts); 
        }).then(config_envelop_block => {
            logger.info('Got config envelop');
            
            return txlator.decode(config_envelop_block, 'common.Envelope');
        }).then(envelop_json => {
            var envelop = JSON.parse(envelop_json);
            var chncfg = envelop.payload.data.config
            if (!chncfg.channel_group.groups.hasOwnProperty('Consortiums') ||
                !chncfg.channel_group.groups.Consortiums.groups.hasOwnProperty(consortium)) {
                logger.error('Consortium not found %s', consortium);
                return Promise.reject('Consortium not found');
            }

            for (let name of names) {
                if (chncfg.channel_group.groups.Consortiums.groups[consortium].groups.hasOwnProperty(name)) {
                    var err = 'Organization already exist:'.concat(name);
                    logger.error(err);
                    return Promise.reject(err);
                }
            }

            config = chncfg;
            // DEBUG purpose only
            //fs.writeFileSync('debug_config.json', JSON.stringify(config, null, 4));

            return txlator.encode(JSON.stringify(chncfg, null, 4), 'common.Config');
        }).then(block => {
            original_block = block;

            // Build new organization group
            for (var i=0; i<names.length; i++) {
                var name = names[i];
                var msp = new MSP(mspids[i]);
                msp.load(dirs[i]);

                var builder = new FabricConfigBuilder();
                builder.addOrganization(name, mspids[i], msp.getMSP()); 
                //builder.addAnchorPeerArray(anchors);

                var org_consortium = builder.buildConsortiumGroup();

                var updated_config = config;
                updated_config.channel_group.groups.Consortiums.groups[consortium].groups[name] = org_consortium;
            }

            //if (updated_config.channel_group.groups.hasOwnProperty('Application')) {
            //     var org_app = builder.buildApplicationGroup();
            //     updated_config.channel_group.groups.Application.groups[name] = org_app;
            //}

            // DEBUG purpose only
            //fs.writeFileSync('debug_updated_config.json', JSON.stringify(updated_config, null, 4));

            return txlator.encode(JSON.stringify(updated_config, null, 4), 'common.Config');
        }).then(updated_block => {
            return txlator.compute_delta(original_block, updated_block, systemchainid);
        }).then(delta_cfg=> {
            // DEBUG purpose only
            //fs.writeFileSync('debug_delta.pb', delta_cfg);

            return chain.updateChannel(delta_cfg, orderer.url, orderer.opts);
        }).then( result => {
            return Promise.resolve('SUCCESS');
        }, err => {
            logger.error('Update channel %s failed, error=%s', systemchainid, err); 
            return Promise.reject(err);
        }).catch (err=>{
            logger.error('Exception join network: %s', err);
            return Promise.reject(err);
        });
}

/** 
 * update orderer advanced attribute
 * request:
 *     SystemChainID: testchainid,
 *     ordererAttr: {
 *         AMB: 
 *         MMC: 
 *         PMB: 
 *         timeout:
 *         type:
 *     }
 * Example:
 * http://localhost:3000/api/v1/networks/updateOrdererAttr
 */
router.post('/updateOrdererAttr', function(req, res, next) {
    var systemchainid = req.body.SystemChainID;
    var ordererAttr = req.body.ordererAttr;
logger.info("updateOrdererAttr req.body: ", req.body);
    const updateOrdererSchema = Joi.object({
        SystemChainID: Util.obcsStringSchema.required(),
        ordererAttr: Joi.object({
            address: Joi.array().items(Util.obcsStringSchema),
            AMB: Joi.number(),
            MMC: Joi.number(),
            PMB: Joi.number(),
            timeout: Util.obcsStringSchema,
            type: Util.obcsStringSchema,
            eventBroker: Joi.array().items(Util.obcsStringSchema)
        })
    });

    var ret = Joi.validate(req.body, updateOrdererSchema);
    if (ret.error) {
        logger.error(ret.error.toString());
        var err = new Error("invalid argument");
        err.status = 400;
        return next(err);
    }

     return Util.getNodes(false).then(nodes => {
        var orderer = nodes.orderers[0];
        logger.debug("orderer_addr:", orderer.listenAddr, "orderer_port:", orderer.listenPort);
        return setOrdererAttr(systemchainid, orderer.listenAddr, orderer.listenPort, ordererAttr);
    }).then(nothing => {
        res.send("SUCCESS");
    }).catch(err=> {
        logger.error('Update orderer attribute failed due to error: ', err);
        res.status(500).send(err instanceof Error ? err.message : err);
    });
});

/** 
 * get orderer advanced attribute
 * querys: systemchainid
 * Example:
 * http://localhost:3000/api/v1/networks/getordererAttr?systemchainid=testchainid
 */
router.get('/getordererAttr', function(req, res, next) {
    var systemchainid = req.query.systemchainid;
    const ret = Joi.validate(systemchainid, Util.obcsStringSchema);
    if (ret.error) {
        logger.error(ret.error.toString());
        var err = new Error("invalid argument");
        err.status = 400;
        return next(err);
    }
    return Util.getNodes(false).then(nodes => {
        var orderer = nodes.orderers[0];
        logger.info("orderer_addr:", orderer.listenAddr, "orderer_port:", orderer.listenPort);
        return getOrdererAttr(systemchainid, orderer.listenAddr, orderer.listenPort);
    }).then(attribute => {
        res.send(attribute);
    }).catch(err=> {
        logger.error('get orderer attribute failed due to error: ', err);
        res.status(500).send(err instanceof Error ? err.message : err);
    });
});

var compareEvtBroker = function(brokers1, brokers2) {
    if (brokers1 === null || typeof brokers1 === 'undefined' || brokers1.length == 0)
    {
        if (brokers2 === null || typeof brokers2 === 'undefined' || brokers2.length == 0)
        {
            return 1;
        }
        else {
            return 0;
        }
    }
    if (brokers2 === null || typeof brokers2 === 'undefined' || brokers2.length == 0)
    {
        if (brokers1 === null || typeof brokers1 === 'undefined' || brokers1.length == 0)
        {
            return 1;
        }
        else {
            return 0;
        }
    }
    if (brokers1.length !== brokers2.length) {
        return 0;
    }
    for (var i=0; i<brokers1.length; i++) {
        if (brokers2.indexOf(brokers1[i])>-1){
            continue;
        }
        else {
            return 0;
       }
    }

    return 1; 
}

var setOrdererAttr = function (systemchainid, orderer_addr, orderer_port, ordererAttr) {

    if (typeof systemchainid === 'undefined' || typeof orderer_addr === 'undefined'
        || typeof orderer_port === 'undefined' || typeof ordererAttr === 'undefined') {

        var err = new Error('argument undefined in setOrdererAttr function');
        return Promise.reject(err);
    }

    logger.info('Orderer service address: %s:%d', orderer_addr, orderer_port);

    var chain = new Channel(systemchainid);
    var txlator = new configtxlator();

    var orderer = null;
    var config = null;
    var original_block = null;

    var isDifferent = false;

    return Util.get_orderer_info(orderer_addr, orderer_port).then(orderer_info=> {
            if (typeof orderer_info === 'string') {
                return Promise.reject(orderer_info);
            }
            orderer = orderer_info;
            return chain.getChannelConfigRaw(orderer.url, orderer.opts); 
        }).then(config_envelop_block => {
            logger.info('Got config envelop');
            
            return txlator.decode(config_envelop_block, 'common.Envelope');
        }).then(envelop_json => {
            var envelop = JSON.parse(envelop_json);
            var chncfg = envelop.payload.data.config

            config = chncfg;
            // DEBUG purpose only
            //fs.writeFileSync('debug_config.json', JSON.stringify(config, null, 4));

            return txlator.encode(JSON.stringify(chncfg, null, 4), 'common.Config');
        }).then(block => {
            original_block = block;

            var updated_config = config;
            var ordererAddrValue =  updated_config.channel_group.values.OrdererAddresses.value.addresses;
            var configValue = updated_config.channel_group.groups.Orderer.values;

            updated_config.channel_group.values.OrdererAddresses.value.addresses = ordererAttr.address;

            if (ordererAttr.AMB !== configValue.BatchSize.value.absolute_max_bytes) {
                configValue.BatchSize.value.absolute_max_bytes = ordererAttr.AMB;
                isDifferent = true;         
            }
            if (ordererAttr.MMC !== configValue.BatchSize.value.max_message_count ) {
                configValue.BatchSize.value.max_message_count = ordererAttr.MMC;
                isDifferent = true;
            }
            if (ordererAttr.PMB !== configValue.BatchSize.value.preferred_max_bytes) {
                configValue.BatchSize.value.preferred_max_bytes = ordererAttr.PMB;
                isDifferent = true;
            }
            if (ordererAttr.timeout !== configValue.BatchTimeout.value.timeout) {
                configValue.BatchTimeout.value.timeout = ordererAttr.timeout;
                isDifferent = true;
            }
            if (ordererAttr.type !== configValue.ConsensusType.value.type) {
                configValue.ConsensusType.value.type = ordererAttr.type;
                isDifferent = true;
            }
            if (ordererAttr.type === 'kafka') {
                if (configValue.hasOwnProperty('KafkaBrokers')) {

                    if (compareEvtBroker(configValue.KafkaBrokers.value.brokers, ordererAttr.eventBroker) == 0) {
                        configValue.KafkaBrokers.value.brokers = ordererAttr.eventBroker;
                        isDifferent = true;
                    }
                } else {
                    var kafkaBrokers = {
                        "mod_policy": "Admins",
                        "value": {
                           "brokers": ordererAttr.eventBroker
                        }
                    };
                    configValue.KafkaBrokers = kafkaBrokers;
                    isDifferent = true;
                }
            }
            logger.debug("update orderer attr:", ordererAddrValue, configValue);

            // DEBUG purpose only
            //fs.writeFileSync('debug_updated_config.json', JSON.stringify(updated_config, null, 4));

            return txlator.encode(JSON.stringify(updated_config, null, 4), 'common.Config');
        }).then(updated_block => {
            if (isDifferent) {
                return txlator.compute_delta(original_block, updated_block, systemchainid);
            }
            else {
                return Promise.resolve('orderer settings unchanged');
            }
        }).then(delta_cfg=> {
            // DEBUG purpose only
            //fs.writeFileSync('debug_delta.pb', delta_cfg);
            if (isDifferent) {
                return chain.updateChannel(delta_cfg, orderer.url, orderer.opts);
            }
            else {
                return Promise.resolve(delta_cfg);
            }
        }).then( result => {
            logger.info("Update orderer attribute successfully");
            return Promise.resolve('SUCCESS');
        }).catch (err => {
            logger.error('Exception update orderer attribute: ', err);
            return Promise.reject(err);
        });
}

var getOrdererAttr = function (systemchainid, orderer_addr, orderer_port) {

    if (typeof systemchainid === 'undefined' || typeof orderer_addr === 'undefined'
        || typeof orderer_port === 'undefined') {

        var err = new Error('argument undefined in getOrdererAttr function');
        return Promise.reject(err);
    }

    logger.info('Orderer service address: %s:%d', orderer_addr, orderer_port);

    var chain = new Channel(systemchainid);
    var txlator = new configtxlator();

    var orderer = null;
    var config = null;
    var original_block = null;

    return Util.get_orderer_info(orderer_addr, orderer_port).then(orderer_info=> {
            if (typeof orderer_info === 'string') {
                return Promise.reject(orderer_info);
            }
            orderer = orderer_info;
            return chain.getChannelConfigRaw(orderer.url, orderer.opts); 
        }).then(config_envelop_block => {
            logger.info('Got config envelop');
            
            return txlator.decode(config_envelop_block, 'common.Envelope');
        }).then(envelop_json => {
            var envelop = JSON.parse(envelop_json);
            var chncfg = envelop.payload.data.config

            config = chncfg;
            // DEBUG purpose only
            //fs.writeFileSync('debug_config.json', JSON.stringify(config, null, 4));

            var ordererAddrValue = config.channel_group.values.OrdererAddresses.value.addresses;
            var configValue = config.channel_group.groups.Orderer.values;
            var ordererAttr = {
                address: ordererAddrValue,
                AMB: configValue.BatchSize.value.absolute_max_bytes,
                MMC: configValue.BatchSize.value.max_message_count,
                PMB: configValue.BatchSize.value.preferred_max_bytes,
                timeout: configValue.BatchTimeout.value.timeout,
                type: configValue.ConsensusType.value.type
            }
            if (configValue.hasOwnProperty('KafkaBrokers')) {
                var eventBroker = configValue.KafkaBrokers.value.brokers;
                ordererAttr.eventBroker = eventBroker;
            }
            logger.info("orderer attr:", ordererAttr);
            return Promise.resolve(ordererAttr); 
        }).catch (err=>{
            logger.error('Exception get orderer attribute: %s', err);
            return Promise.reject(err);
        });
}

function getAdminKey(mspid){
    if (mspid === undefined){
        return Promise.reject('Please specify an org\'s mspid');
    }
    if (process.env.ORG_ADM_USR_PATH === undefined){
        return next('ORG_ADM_USR_PATH is not set');
    }
    var admin_user_path = process.env.ORG_ADM_USR_PATH;
    var key_dir = admin_user_path.concat('/keystore');
    var cert_dir = admin_user_path.concat('/signcerts');
    var key_data;
    var cert_data;
    var admin_path;

    var readFilePromise = function(filename, options){
        return new Promise((resolve, reject) => {
            fs.readFile(filename, options, (err, data) => {
                if(err){
                    reject(err);
                }
                resolve(data);
            });
        });
    };
    return Util.getNodes(false).then(nodes => {
        if (nodes.peers){
            var self_mspid = nodes.peers[0].localMspId;
            if (mspid != self_mspid){
                return Promise.reject('not self org, can not get admin credential!');
            }
        }else {
            return Promise.reject('no peers in this org');
        }
        return Promise.resolve("OK");
    }).then(status => {
        return new Promise((resolve, reject) => {
            fs.readdir(key_dir, (err, files) => {
                if(err){
                    reject(err);
                }
                resolve(files);
            });
        });
    }).then(files => {
        var promise_files = [];
        for (var file of files){
            var key_file = path.join(key_dir, file);
            logger.trace("ready to read admin key file: ", key_file);
            promise_files.push(readFilePromise(key_file, 'utf8'));
        }
        return Promise.all(promise_files);
    }).then(datas => {
        logger.trace("admin keys: ", datas);
        key_data = datas;
        return new Promise((resolve, reject) => {
            fs.readdir(cert_dir, (err, files) => {
               if(err){
                    reject(err);
                }
                resolve(files);
            });
        });
    }).then(files => {
        var promise_files = [];
        for (var file of files){
            var cert_file = path.join(cert_dir, file);
            logger.trace("ready to read admin cert file: ", cert_file);
            promise_files.push(readFilePromise(cert_file, 'utf8'));
        }
        return Promise.all(promise_files);
    }).then(datas => {
        logger.trace("admin certs: ", datas);
        cert_data = datas;
//        var final_data = JSON.stringify({"mspID": mspid, "admin_keys": key_data, "admin_certs": cert_data}, null, 2);
        var final_data = key_data + cert_data;
        return new Promise((resolve, reject) => {
            tmp.dir({unsafeCleanup: true}, (err, tpath, cleanupCallback) => {
                if (err) {
                    reject(err);
                } else {
                    var admin_file = mspid.concat("_admin_credential.pem");
                    admin_path = path.join(tpath, admin_file);
                    fs.writeFile(admin_path, final_data, (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(admin_path);
                    });
                }
            });
        });
    }).then(admin_path => {
        return Promise.resolve(admin_path);
    }).catch(err => {
        logger.error("error occurs when get admin key:",err);
        return Promise.reject(err);
    });
}

router.get('/getAdminKey/:mspID', function (req, res, next) {
    var mspid = req.params.mspID;
    const ret = Joi.validate(mspid, Util.obcsStringSchema);
    if (ret.error) {
        logger.error(ret.error.toString());
        var err = new Error("invalid argument");
        err.status = 400;
        return next(err);
    }
    return getAdminKey(mspid).then(file => {
        res.send(file);
    }).catch(err => {
        return next(err);
    });
});

function getOrdererSettings(){
    logger.info("into getOrdererSettings function");
    var mspid;
    var orderer_address;
    var tlscacerts;
    var json_obj = {};

    var tlscacerts_file;
    var json_str;
    var json_name;
    var json_file;

    return Util.getNodes(false).then(nodes => {
        if (nodes.peers){
            mspid = nodes.peers[0].localMspId;
        }else {
            return Promise.reject("no peers in this org");
        }
        if (nodes.orderers){
            if (nodes.orderers[0] === undefined){
                return Promise.reject("there is no orderers in this org");
            }
            var orderer = nodes.orderers[0];
            if (obcsUtil.isNativeDockerEnv()) {
                orderer_address = orderer.externalAddr + ':' + orderer.externalPort;
            }else {
                orderer_address = orderer.listenAddr + ':' + orderer.listenPort;
            }
        }else {
            return Promise.reject('no orderers in this org');
        }
        if (obcsUtil.isNativeDockerEnv()) {
            // Example of directory structure:
            // ./crypto-config/peerOrganizations/org1.example.com/msp/admincerts/Admin@org1.example.com-cert.pem
            // ./crypto-config/peerOrganizations/org1.example.com/msp/cacerts/ca.org1.example.com-cert.pem
            // ./crypto-config/peerOrganizations/org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem
            let tpath = obcsUtil.getDataPathInNativeDockerEnv().trim();
            let orgName;
            try {
                // find orgName from file .config.json
                let configFile = path.join(tpath, '.config.json');
                let data = fs.readFileSync(configFile, 'utf8');
                let config = JSON.parse(data);
                orgName = config.peerOrgs[0].domainName;
            } catch (e) {
                logger.warn(e);
            }

            tlscacerts_file = path.join(tpath, `/crypto-config/peerOrganizations/${orgName}/msp/tlscacerts/tlsca.${orgName}-cert.pem`);
        } else if (process.env.LOCAL_STORAGE != 'y'){
            if (typeof process.env.APP_HOME === 'undefined'){
                return Promise.reject("APP_HOME is not set");
            }
            tlscacerts_file = path.join(process.env.APP_HOME, "/thirdtls/tls-ca.pem");
        }else{
            tlscacerts_file = path.join(process.env.LOCAL_STORAGE_PATH, "tls-ca.pem")
        }
        return Util.statPromise(tlscacerts_file);
    }).then(stats => {
        if (stats === 'no_exist' || !stats.isFile()){
            logger.trace("no tlscacerts");
            return Promise.resolve('');
        }
        return Util.readPromise(tlscacerts_file, 'utf8');
    }).then(data => {
        json_obj.mspid = mspid;
        json_obj.orderer_address = orderer_address;
        if (data != ''){
            json_obj.tlscacerts = data;
        }
        json_str = JSON.stringify(json_obj, null, 2);
        json_name = mspid.concat('_orderer_settings.json');
        return new Promise((resolve, reject) => {
            tmp.dir({unsafeCleanup: true}, (err, tpath, cleanupCallback) => {
                if (err) {
                    reject("Download certificates failed: " + err.message);
                } else {
                    resolve(tpath);
                }
            });
        });
    }).then(tpath => {
        logger.trace("orderer settings tpath:", tpath);
        json_file = path.join(tpath, json_name);
        return new Promise((resolve, reject) => {
            fs.writeFile(json_file, json_str, (err, stats) => {
                if (err){
                    reject(err);
                }
                resolve('OK');
            });
        });
    }).then(status => {
        return Promise.resolve(json_file);
    }).catch(err => {
        return Promise.reject(err);
    });
}

router.get('/getOrdererSettings', function (req, res, next) {
    return getOrdererSettings().then(file => {
        res.send(file);
    }).catch(err => {
        next(err);
    });
});

/*
request body example:
{
  "mspid": "Org1MSP",
  "orderer_address": "localhost:7059",
  "tlscacerts": "certs_content"
}
 */
router.post('/addOrdererSettings', function (req, res, next){ 
    logger.info("addOrdererSettings req.body:", JSON.stringify(req.body, null, 2));
    const addOrdererSettingsSchema = Joi.object({
        mspid: Util.obcsStringSchema.required(),
        orderer_address: Util.obcsStringSchema.required(),
        tlscacerts: Util.obcsStringSchema.optional()
    });

    var ret = Joi.validate(req.body, addOrdererSettingsSchema);
    if (ret.error) {
        logger.error(ret.error.toString());
        var err = new Error("invalid argument");
        err.status = 400;
        return next(err);
    }

    var mspid = req.body.mspid;
    var ordereraddress = req.body.orderer_address;
    if (req.body.tlscacerts != undefined){
        var tlscacerts = req.body.tlscacerts;
    }

    var config_change = false;
    //set orderer address
    var ordereraddress_old_val = obcsUtil.getConfigSetting('orderer-address', '127.0.0.1:3000');
    if (ordereraddress != ordereraddress_old_val) {
        config_json['orderer-address'] = ordereraddress;
        logger.debug('changing orderer-address from %s to %s', ordereraddress_old_val, ordereraddress);
        config_change = true;
    }
    else {
        logger.debug('orderer-address new value same as old');
    }

    //set orderer org mspid
    var mspid_old_val = obcsUtil.getConfigSetting('orderer-org-mspid', '');
    if (mspid != mspid_old_val) {
        config_json['orderer-org-mspid'] = mspid;
        logger.debug('changing orderer-org-mspid from %s to %s', mspid_old_val, mspid);
        config_change = true;
    }
    else {
        logger.debug('orderer-org-mspid new value same as old');
    }
    
    return (config_change 
        ? Util.writeFilePromise(path.join(__dirname, '../config.json'), JSON.stringify(config_json, null, 4))
        : Promise.resolve('OK')).then(status => {

        obcsUtil.setConfigSetting('orderer-address', ordereraddress);
        obcsUtil.setConfigSetting('orderer-org-mspid', mspid);

        //set tlscacerts
        if (typeof tlscacerts != 'undefined'){
            var tlscacerts_name = mspid.concat('_tlscacerts.pem');
            var tlscacerts_file = "";
            if (obcsUtil.isNativeDockerEnv()) {
                let tpath = obcsUtil.getDataPathInNativeDockerEnv().trim();
                tlscacerts_file = path.join(tpath, tlscacerts_name);
            } else {
                if (process.env.APP_HOME === undefined){
                    return Promise.reject("APP_HOME is not set");
                }
                tlscacerts_file = path.join(process.env.APP_HOME, tlscacerts_name);
            }
            return Util.writeFilePromise(tlscacerts_file, tlscacerts);
        }else {
            logger.trace('no tlscacerts set');
            return Promise.resolve("OK");
        }
    }).then(status => {
        return res.send("SUCCESS");
    }).catch(err => {
        return next(err);
    });
});

router.get('/download/:option', function (req, res, next) {
    var option = req.params.option;
    const ret = Joi.validate(option, Util.obcsStringSchema);
    if (ret.error) {
        logger.error(ret.error.toString());
        var err = new Error("invalid argument");
        err.status = 400;
        return next(err);
    }
    switch (option){
        case 'ordererSettings':
            return getOrdererSettings().then(file => {
                return res.download(file);
            }).catch(err => {
                return next(err);
            });
            break;
        case 'certs':
            return download_certs().then(file => {
                return res.download(file);
            }).catch(err => {
                return next(err);
            });
            break;
        case 'adminCredentials':
            var mspid = req.query.mspID;
            const ret = Joi.validate(mspid, Util.obcsStringSchema);
            if (ret.error) {
                logger.error(ret.error.toString());
                var err = new Error("invalid argument");
                err.status = 400;
                return next(err);
            }
            return getAdminKey(mspid).then(file => {
                res.download(file);
            }).catch(err => {
                return next(err);
            });
        default:
            return next('invalid request to download: ' + option);
    }
});

module.exports = router;
