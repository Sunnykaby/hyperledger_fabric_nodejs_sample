function sleep(sleepTime) {
    for(var start = +new Date; +new Date - start <= sleepTime; ) { } 
}

module.exports.sleeptimeout = (time) =>{
    return new Promise(resolve => setTimeout(resolve, time));
}

module.exports.sleep = sleep;