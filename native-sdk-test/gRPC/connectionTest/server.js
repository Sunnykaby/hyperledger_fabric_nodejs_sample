var grpc = require('grpc')

var PROTO_PATH = './service.proto'
var conf = require('./config')
var place_list = require('./db')
var impl_proto = grpc.load(PROTO_PATH).impl

// Simple RPC
function locate(call, callback) {
    for (var index in place_list) {
        if (place_list[index].location.latitude === call.request.latitude && place_list[index].location.longitude === call.request.longitude) {
            callback(null, place_list[index])
            return
        }
    }
    callback("Error, No position",null)
}

// A server-side streaming RPC
function list(call) {
    var size = call.request.size
    for (var index = 0; index < size; index++) {
        call.write(place_list[index].location)
    }
    call.end();
}

// A bidirectional streaming RPC
function query(call) {
    call.on('data', function(point) {
        console.log(point)
        for (var index in place_list) {
            if (place_list[index].location.latitude === point.latitude && place_list[index].location.longitude === point.longitude) {
                call.write(place_list[index])
                return
            }
        }
    })
    call.on('end', function() {
        call.end()
    })
}

var server = new grpc.Server()
server.addProtoService(impl_proto.LBS.service, {
    locate: locate,
    query: query,
    list: list
})
server.bind(conf.ip.server + ':' + conf.port, grpc.ServerCredentials.createInsecure())
server.start()