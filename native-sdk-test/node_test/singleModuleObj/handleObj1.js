var test = require('./objs')

test.addObj("obj1",{key1:"hallo"});

function printObjs(){
    console.log(test.getObjs());
}

module.exports.printObjs = printObjs;