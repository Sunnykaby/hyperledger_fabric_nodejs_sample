'use strict';

var path = require('path');
var fs = require('fs');

const READER_POLICY_KEY = "Readers";
const WRITER_POLICY_KEY = "Writers";
const ADMIN_POLICY_KEY = "Admins";
const MSP_KEY = "MSP";

var FabricConfigBuilder = class {
    constructor() {
        // Fabric config consits by group, value and policy
        this.name = null;
        this.mspid = null;
        this.msp = null;
        this.anchor_peers = [];
    }

    addOrganization(name, mspid, msp) {
        this.name = name;
        this.mspid = mspid;
        this.msp = msp;
    }

    addAnchorPeer(host, port) {
        var anchor_peer = {}
        anchor_peer.host = host;
        anchor_peer.port = port;

        this.anchor_peers.push(anchor_peer);
    }

    // anchors is array of object, which has host and port property exactly
    addAnchorPeerArray(anchors) {
        if (Array.isArray(anchors)) {
            this.anchor_peers.concat(anchors);
        }
    }

    buildGroupMSP() {
        var memberPolicy = {
            mod_policy: "Admins",
            policy: {
                type: 1,
                value: {
                    identities: [
                        {
                            principal: {
                                msp_identifier: this.mspid
                            }
                        }
                    ],
                    rule: {
                        n_out_of: {
                            n: 1,
                            rules: [
                                {
                                    signed_by: 0
                                }
                            ]
                        }
                    }
                }
            }
        };
        var adminPolicy = {
            mod_policy: "Admins",
            policy: {
                type: 1,
                value: {
                    identities: [
                        {
                            principal: {
                                msp_identifier: this.mspid,
                                role: "ADMIN"
                            }
                        }
                    ],
                    rule: {
                        n_out_of: {
                            n: 1,
                            rules: [
                                {
                                    signed_by: 0
                                }
                            ]
                        }
                    }
                }
            }
        };

        var policies = {};
        policies[ADMIN_POLICY_KEY] = adminPolicy;
        policies[READER_POLICY_KEY] = memberPolicy;
        policies[WRITER_POLICY_KEY] = memberPolicy;

        var values = {};
        values[MSP_KEY] = this.msp;

        var groupMsp = {};

        groupMsp.mod_policy = "Admins";
        groupMsp.policies = policies;
        groupMsp.values = values;

        return groupMsp;
    }

    buildAnchor() {
        var values = {};
        var groupMsp = {};
        groupMsp.values = values;
        var anchors = {
            mod_policy: "Admins",
            value: {
                anchor_peers: this.anchor_peers
            }
        };

        groupMsp.values.AnchorPeers = anchors;
        return groupMsp;
    }

    buildApplicationGroup() {
        var groupMsp = this.buildGroupMSP();

        var anchors = {
            mod_policy: "Admins",
            value: {
                anchor_peers: this.anchor_peers
            }
        };

        groupMsp.values.AnchorPeers = anchors;

        //groupMsp.version = "1";


        return groupMsp;
    }

    buildConsortiumGroup() {
        return this.buildGroupMSP();
    }

    buildApplicationPolicy(type, channelCreatorMSPID, isAdmin) {
        switch (type) {
            case "IMPLICIT":
                var targetPolicy = "/Channel/Application/" + channelCreatorMSPID + "/Admins";
                var creatorModPolicy = {
                    mod_policy: "Admins",
                    policy: {
                        type: 3,
                        value: {
                            sub_policy: "/Channel/Application/" + channelCreatorMSPID + "/Admins"
                        }
                    }
                };
                return creatorModPolicy;
                break;
            case "SIGNATURE":
                var creatorPolicy = {
                    mod_policy: "Admins",
                    policy: {
                        type: 1,
                        value: {
                            identities: [
                                {
                                    principal: {
                                        msp_identifier: channelCreatorMSPID
                                    }
                                }
                            ],
                            rule: {
                                n_out_of: {
                                    n: 1,
                                    rules: [
                                        {
                                            signed_by: 0
                                        }
                                    ]
                                }
                            }
                        }
                    }
                };
                if (isAdmin) {
                    creatorPolicy.policy.value.identities[0].principal["role"] = "ADMIN";
                }
                return creatorPolicy;
                break;
            default: break;
        }

    }
};

module.exports = FabricConfigBuilder;
