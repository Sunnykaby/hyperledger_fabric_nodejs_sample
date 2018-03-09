var objs = {};//as a single obj for app

function addObj(name, obj){
    objs[name] = obj;
}

function getObjs() {
    return objs;
}

function getObj(name){
    return objs[name];
}

module.exports.addObj = addObj;
module.exports.getObj = getObj;
module.exports.getObjs = getObjs;