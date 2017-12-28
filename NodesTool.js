'use strict'

var fs = require("fs");
var path = require('path');

var NodetsTool = class {

    constructor() {
    }

    getPeer(client, opt) {
        //因为启用了TLS，所以上面的代码就是指定Peer的TLS的CA证书 
        let data = fs.readFileSync(opt.peer_tls_cacerts);
        return client.newPeer(opt.peer_url,
            {
                pem: Buffer.from(data).toString(),
                'ssl-target-name-override': opt.server_hostname
            }
        );

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