var program = require('commander');
var log4js = require('log4js');
var logger = log4js.getLogger('End2End');
require('./config.js');//load the config info

var install = require('./app/install-chaincode.js');
var instantiate = require('./app/instantiate-chaincode.js');
var invoke = require('./app/invoke-transaction.js');
var query = require('./app/query.js');

function array(val){
    return val.split(',');
}


//定义参数,以及参数内容的描述  
program
    .version('0.0.1')
    .usage('[param] [value ...]')
    .option('-c, --chaincodeId <string>', 'the name of chaincode')
    .option('-p, --chaincodePath <string>', 'the path of chaincode')
    .option('-v, --chaincodeVersion <string>', 'the version of chaincode')
    .option('-P, --peers <string>', 'the target')
    .option('-C, --channelName <string>', 'the name of channel')
    .option('-o, --org <string>', "org name")
    .option('-a, --cfargs <string>', "chaincode function args",array)
    .option('-f, --cfcn <string>', "org name")
    .option('-t, --target <string>', "The target call method name")

//添加额外的文档描述  
program.on('help', function () {
    console.log('   Examples:')
    console.log('')
    console.log('       # input target method, chaincodeId, fcn and args')
    console.log('       $ ./End2End.js -t \"install\" -c \"end2end\" -f \"invoke\" -a "a,b,100"')
    console.log('')
});

//Get the error message
function getErrorMessage(field) {
    var response = {
        success: false,
        message: field + ' field is missing or Invalid in the request'
    };
    return response;
}

//解析commandline arguments  
program.parse(process.argv)

//Get the call method 

var method_choose = program.target;
//declear the var
var peers = null;
var chaincodeName = null;
var chaincodeVersion = null;
var channelName = null;
var chaincodePath = null;
var cfcn = null;
var cargs = null;
var orgName = null;

var call_method = null;
switch (method_choose) {
    case "install":
        //Read the param
        logger.debug('==================== INSTALL CHAINCODE ==================');
        peers = program.peers;
        chaincodeName = program.chaincodeId;
        chaincodePath = program.chaincodePath;
        chaincodeVersion = program.chaincodeVersion;
        channelName = program.channelName;
        orgName = program.org;
        logger.debug('peers : ' + peers); // target peers list
        logger.debug('chaincodeName : ' + chaincodeName);
        logger.debug('chaincodePath  : ' + chaincodePath);
        logger.debug('chaincodeVersion  : ' + chaincodeVersion);
        logger.debug('channelName  : ' + channelName);
        if (!peers || peers.length == 0) {
            console.error(getErrorMessage('\'peers\''));
            return;
        }
        if (!chaincodeName) {
            console.error(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!chaincodePath) {
            console.error(getErrorMessage('\'chaincodePath\''));
            return;
        }
        if (!chaincodeVersion) {
            console.error(getErrorMessage('\'chaincodeVersion\''));
            return;
        }
        if (!channelName) {
            console.error(getErrorMessage('\'channelName\''));
            return;
        }
        return install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, channelName, orgName).then(result => {
            console.log(result);
        }, err => {
            console.error(err)
        }).catch(err => { console.error(err) });
        break;
    case "instantiate":
        logger.debug('==================== INSTANTIATE CHAINCODE ==================');
        peers = program.peers;
        chaincodeName = program.chaincodeId;
        chaincodeVersion = program.chaincodeVersion;
        channelName = program.channelName;
        chaincodePath = program.chaincodePath;
        cfcn = program.cfcn;
        cargs = program.cfargs;
        orgName = program.org;
        logger.debug('peers  : ' + peers);
        logger.debug('channelName  : ' + channelName);
        logger.debug('chaincodeName : ' + chaincodeName);
        logger.debug('chaincodeVersion  : ' + chaincodeVersion);
        logger.debug('chaincodePath  : ' + chaincodePath);
        logger.debug('fcn  : ' + cfcn);
        logger.debug('args  : ' + cargs);
        if (!chaincodeName) {
            console.error(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!chaincodeVersion) {
            console.error(getErrorMessage('\'chaincodeVersion\''));
            return;
        }
        if (!channelName) {
            console.error(getErrorMessage('\'channelName\''));
            return;
        }
        if (!chaincodePath) {
            console.error(getErrorMessage('\'chaincodePath\''));
            return;
        }
        if (!cargs) {
            console.error(getErrorMessage('\'args\''));
            return;
        }

        instantiate.instantiateChaincode(peers, channelName, chaincodeName,
            chaincodeVersion, cfcn, chaincodePath, cargs, orgName)
            .then((message) => {
                console.log(message);
                process.exit()
            }, err => {
                console.error(err)
            }).catch(err => { console.error(err) });
        break;
    case "invoke":
        logger.debug('==================== INVOKE ON CHAINCODE ==================');
        peers = program.peers;
        chaincodeName = program.chaincodeId;
        channelName = program.channelName;
        cfcn = program.cfcn;
        cargs = program.cfargs;
        logger.error(cargs)
        orgName = program.org;
        logger.debug('channelName  : ' + channelName);
        logger.debug('chaincodeName : ' + chaincodeName);
        logger.debug('fcn  : ' + cfcn);
        logger.debug('args  : ' + cargs);
        if (!chaincodeName) {
            console.error(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!channelName) {
            console.error(getErrorMessage('\'channelName\''));
            return;
        }
        if (!cfcn) {
            console.error(getErrorMessage('\'fcn\''));
            return;
        }
        if (!cargs) {
            console.error(getErrorMessage('\'args\''));
            return;
        }

        invoke.invokeChaincode(peers, channelName, chaincodeName, cfcn, cargs, orgName)
            .then((message) => {
                console.log(message);
                process.exit()
            }, err => {
                console.error(err)
            }).catch(err => { console.error(err) });
        break;
    case "query":
        logger.debug('==================== QUERY BY CHAINCODE ==================');
        channelName = program.channelName;
        chaincodeName = program.chaincodeId;
        cargs = program.cfargs;
        cfcn = program.cfcn;
        peer = program.peers;
        orgName = program.org;
        logger.debug('channelName : ' + channelName);
        logger.debug('chaincodeName : ' + chaincodeName);
        logger.debug('fcn : ' + cfcn);
        logger.debug('args : ' + cargs);

        if (!chaincodeName) {
            console.error(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!channelName) {
            console.error(getErrorMessage('\'channelName\''));
            return;
        }
        if (!cfcn) {
            console.error(getErrorMessage('\'fcn\''));
            return;
        }
        if (!cargs) {
            console.error(getErrorMessage('\'args\''));
            return;
        }

       query.queryChaincode(peer, channelName, chaincodeName, cargs, cfcn, orgName)
            .then((message) => {
                console.log(message);
            }, err => {
                console.error(err)
            }).catch(err => { console.error(err) });
        break;
    default:
        console.log("No target method support")

}

return true; 




