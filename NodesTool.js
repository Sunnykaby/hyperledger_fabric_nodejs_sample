'use strict'

var fs = require("fs");
var path = require('path');

var NodetsTool = class {

    constructor() {
    }

    getPeer(opt) {

    }

    getOrderer(client, opt) {
        //连接Orderer的时候也启用了TLS，也是同样的处理方法 
        let odata = fs.readFileSync(opt.orderer_tls_cacerts);
        let caroots = Buffer.from(odata).toString();
        return client.newOrderer(opt.orderer_url, {
            'pem': caroots,
            'ssl-target-name-override': opt.server_hostname
        });
    }

}

module.exports = NodetsTool;