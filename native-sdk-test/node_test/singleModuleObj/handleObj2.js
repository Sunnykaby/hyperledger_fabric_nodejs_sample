var test = require('./objs')

test.addObj("obj2",{key1:"kami"});

function printObjs(){
    console.log(test.getObjs());
}

module.exports.printObjs = printObjs;