var helper = require("./app/tools/helper.js");
var install = require('./app/install-chaincode.js');
var instantiate = require('./app/instantiate-chaincode.js');
var invoke = require('./app/invoke-transaction.js');
var query = require('./app/query.js');

var logger = helper.getLogger();

//Convert string to a array for chaincode function call
function array(val) {
    return val.split(',');
}

//Get the error message
function getErrorMessage(field) {
    var response = {
        success: false,
        message: field + ' field is missing or Invalid in the request'
    };
    return response;
}

function inArray(dest, src_array){
    src_array.forEach(element => {
        if(element == dest) return true;
    });
    return false;
}

//Abstract commandline arguments  
var args = process.argv.splice(2);

//Get the call method 
method_choose = args[0];
//Declear the var
var params_input_json = JSON.parse(args[1]);

function param_check(param_json, method) {
    peers = param_json.peers;
    chaincodeName = param_json.chaincodeId;
    chaincodeVersion = param_json.chaincodeVersion;
    channelName = param_json.channelName;
    chaincodePath = param_json.chaincodePath;
    cfcn = param_json.cfcn;
    cargs = param_json.cargs;
    orgName = param_json.org;

    logger.debug('peers  : ' + peers);
    logger.debug('channelName  : ' + channelName);
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('chaincodeVersion  : ' + chaincodeVersion);
    logger.debug('chaincodePath  : ' + chaincodePath);
    logger.debug('fcn  : ' + cfcn);
    logger.debug('args  : ' + cargs);
    logger.info('orgName  : ' + orgName);

    if (!chaincodeName) {
        console.error(getErrorMessage('\'chaincodeName\''));
        return false;
    }
    if (!chaincodeVersion && inArray(method, ["instantiate, install"])) {
        console.error(getErrorMessage('\'chaincodeVersion\''));
        return false;
    }
    if (!channelName && method != "install") {
        console.error(getErrorMessage('\'channelName\''));
        return false;
    }
    if (!chaincodePath && method == "install") {
        console.error(getErrorMessage('\'chaincodePath\''));
        return false;
    }
    if (!cargs && inArray(method, ["instantiate","invoke","query"])) {
        console.error(getErrorMessage('\'args\''));
        return false;
    }
    if (!cfcn && inArray(method, ["instantiate","invoke","query"])) {
        console.error(getErrorMessage('\'fcn\''));
        return false;
    }
    if (!orgName) {
        console.error(getErrorMessage('\'orgName\''));
        return false;
    }
    return true;
}

switch (method_choose) {
    case "install":
        //Read the param
        logger.info('==================== INSTALL CHAINCODE ==================');
        if (!param_check(params_input_json, "install")) {
            console.log("Params are invalid, Please check and run the test again")
            return;
        }

        //Call the function
        return install.installChaincode(params_input_json.chaincodeId, params_input_json.chaincodePath,
            params_input_json.chaincodeVersion, params_input_json.org).then(result => {
                console.log(result);
            }, err => {
                console.error(err);
            }).catch(err => { console.error(err); });
        break;

    case "instantiate":
        logger.debug('==================== INSTANTIATE CHAINCODE ==================');
        if (!param_check(params_input_json, "instantiate")) {
            console.log("Params are invalid, Please check and run the test again")
            return;
        }

        //Call the function
        return instantiate.instantiateChaincode(params_input_json.channelName, params_input_json.chaincodeId,
            params_input_json.chaincodeVersion, params_input_json.cfcn, array(params_input_json.cargs), params_input_json.org)
            .then((result) => {
                console.log(result);
                process.exit();
            }, err => {
                console.error(err);
                process.exit();
            }).catch(err => { console.error(err); });
        break;

    case "invoke":
        logger.debug('==================== INVOKE ON CHAINCODE ==================');
        if (!param_check(params_input_json, "invoke")) {
            console.log("Params are invalid, Please check and run the test again")
            return;
        }

        //Call the function
        return invoke.invokeChaincode(params_input_json.channelName, params_input_json.chaincodeId,
            params_input_json.cfcn, array(params_input_json.cargs), params_input_json.org)
            .then((result) => {
                console.log(result);
                process.exit();
            }, err => {
                console.error(err);
                process.exit();
            }).catch(err => { console.error(err); });
        break;

    case "query":
        logger.debug('==================== QUERY BY CHAINCODE ==================');
        if (!param_check(params_input_json, "query")) {
            console.log("Params are invalid, Please check and run the test again")
            return;
        }

        //Call the function
        return query.queryChaincode(params_input_json.channelName, params_input_json.chaincodeId,
            array(params_input_json.cargs), params_input_json.cfcn, params_input_json.org)
            .then((result) => {
                console.log(result);
            }, err => {
                console.error(err);
            }).catch(err => { console.error(err); });
        break;
    default:
        console.log("No target method support");
}

return true;




