var grpc = require('grpc')

var PROTO_PATH = './service.proto'
var conf = require('./config')
var place_list = require('./db.json')
var impl_proto = grpc.load(PROTO_PATH).impl
var tools = require('../../Tools/Helper');


var client = new impl_proto.LBS(conf.ip.client + ':' + conf.port, grpc.credentials.createInsecure())

function callback() {
    console.log('end')
}

function locate() {
    client.locate({
        latitude: 401809022,
        longitude: -744157964
    }, function(err, response) {
        if(response!= null && response.hasOwnProperty("name"))
            console.log(response.name);
        else console.log("No position");
    })
}

function list() {
    var call = client.list({
        size: 10
    })
    call.on('data', function(feature) {
        console.log(feature)
    });
    call.on('end', callback)
}

function query() {
    var call = client.query()
    call.on('data', function(place) {
        console.log(place.name)
    });
    call.on('end', callback)

    for (var index in place_list) {
        call.write(place_list[index].location)
    }
    call.end()
}

console.info("Start waiting")
return tools.sleeptimeout(10000).then(()=>{
    console.info("End waiting, start list")
    list()
    return tools.sleeptimeout(30000);
}).then(() =>{
    console.log(grpc.getClientChannel(client));
    console.log('start close connection')
    grpc.closeClient(client);
    return tools.sleeptimeout(10000);
}).then(() =>{
    console.log("End close connection, and restart the connection")
    list()
    return tools.sleeptimeout(30000);
}).then(() =>{
    console.log('End')
});
