'use strict'

var path = require('path');
var fs = require('fs');
var configtxlator = require('../configtxlator.js');


//const var
const TYPE = {
    COMMON_ENVELOPE: 0,
    COMMON_CONFIG : 1
};

var ConfigTools = class {
    //attrs
    constructor(){
        this.config_type = null;
        this.origin_config_proto = null;
        this.update_config_proto = null;
        this.update_config = null;
        this.origin_config = null;
        this.origin_envelope = null;
        this.update_envelope = null;
        this.channelName = null;
    }

    /**
     * Get lasted channel config data from Config Envelope
     * @param {*channel object of fabric} channel 
     * @param {*} type 
     */
    loadConfigByChannel(channel, type){
        return channel.getChannelConfig().then(config_envelope =>{
            this.origin_config_proto = config_envelope.config.toBuffer();
            return configtxlator.decode(original_config_proto, 'common.Config');
        }).then((origin_config_json) =>{
            // logger.info(' original_config_json :: %s', original_config_json);
            this.origin_config = JSON.parse(origin_config_json);// json -> obj
            this.update_config = this.origin_config;
            return Promise.resolve(update_config);
        }, (err) =>{
            return Promise.reject(err);
        }).catch((err) =>{
            return Promise.reject(err);
        });
    }

    /**
     * Get the updated config proto data which needs be signed for orderer
     * @param {* The channel name to update} channelName 
     */
    getPreSignUpdatedConfig(channelName) {
        if(channelName == null) channelName = this.channelName;
        var update_config_json = JSON.stringify(update_config);
        return configtxlator.encode(updated_config_json, 'common.Config').then(update_config_proto => {
            this.update_config_proto = update_config_proto;
            return configtxlator.compute_delta(this.original_config_proto, this.updated_config_proto, channelName);
        }).then((config_pb) =>{
            return Promise.resolve(config_pb);
        },err =>{
            return Promise.reject(err);
        }).catch((err) => {
            return Promise.reject(err);
        });
    }

    /**
     * Get the updated config proto data which needs to be signed for orderer, create channel config
     * @param {*} client 
     * @param {*} channelName 
     */
    getPresignChannelCreateConfig(client, channelName){
        if(channelName ==null) channelName = this.channelName;
        var update_config_json = JSON.stringify(update_config);
        return configtxlator.encode(updated_config_json, 'common.Envelope').then(update_config_proto => {
            this.update_config_proto  = update_config_proto;
            var config_proto  = client.extractChannelConfig(update_config_proto);
            return Promise.resolve(config_proto);
        },err => {
            return Promise.reject(err);
        }).catch(err => {
            return Promise.reject(err);
        });
    }

    /**
     * Load the channel creation config
     * @param {* the raw binary data of channel creation file} channelTxEnvelope 
     */
    loadConfigByTx(channelTxEnvelope){
        return configtxlator.decode(channelTxEnvelope, 'common.Envelope').then((config_envelope_json) => {
            this.origin_envelope = JSON.parse(config_envelope_json);
            this.update_envelope = this.origin_envelope;
            return Promise.resolve(this.origin_envelope);
        }).catch(err =>{
            return Promise.reject(err);
        });
    }

    decodeConfigByProto(config){
        if(config==null)
        config = origin_config
    }

    loadConfigAttrs(config_type, channelName){
        this.config_type = config_type;
        this.channelName = channelName;
    }

    /**
     * Add a new org config into the app groups
     * @param {* the name of org added} orgName 
     * @param {* the org config obj added} org 
     */
    addOrgToAppliacitionGroups(orgName, org){
        this.update_config.channel_group.groups.Application.groups[orgName] = org;
    }

    /**
     * Add a org config into the system channel(consortium) groups
     * @param {* the consortium which org add} consortiumName 
     * @param {* the added org name} orgName 
     * @param {* the org config object} org 
     */
    addOrgToConsortiumGroups(consortiumName, orgName, org){
        this.update_config.channel_group.groups.Consortiums.groups[consortiumName].groups[orgName] = org;
    }

    /**
     * Add a new policy tp app policy groups
     * @param {*the policy object} policy 
     * @param {*the policy name} policyName 
     */
    addPolicyToApplicationGroups(policy, policyName){
        this.update_config.channel_group.groups.Application.policies[policyName] = policy;
    }
    
    /**
     * Add a new policy tp app policy for channel creation
     * @param {*the policy object} policy 
     * @param {*the policy name} policyName 
     */
    addPolicyToCreateChannelConfigGroups(policy, policyName){
        this.update_config.payload.data.config_update.write_set.groups.Application.policies[policyName] = policy;
    }

    /**
     * Reset the mod_policy of app groups for channel creation, default is 'Admins'
     * @param {*} policyName 
     */
    setModifyPolicyOfCreateChannelConfigGroups(policyName){
        this.updated_config.payload.data.config_update.write_set.groups.Application.mod_policy = policyName;
    }


    /**
     * Reset the mod_policy of app groups, default is 'Admins'
     * @param {*} policyName 
     */
    setModifyPolicyOfAppGroups(policyName){
        this.updated_config.channel_group.groups.Application.mod_policy = policyName;
    }
    
    /**
     * Reset the subpolicy or rule of the target policy
     * @param {*Admins, Readers, Writers} policy_key 
     * @param {*} subPolicy 
     * @param {*ANY, MAJORITY, ALL} rule_key 
     */
    setSubPolicyOfAppPolicy(policy_key, subPolicy, rule_key){
        var policies = this.update_config.channel_group.groups.Application.policies;
        if(policy_key != null && policies.hasOwnProperty(policy_key)){
            if(subPolicy!=null) policies[policy_key].policy.value.sub_policy = subPolicy;
            if(rule_key!=null) policies[policy_key].policy.value.rule = rule_key;
        }
    }

    /**
     * Change the app policy from implicit policy to signature policy
     * @param {* the reader and writer policy for orgs} targetPolicies 
     * @param {* the origin policy config object} policyGroups 
     * 
     * targetPolicy should be 
     *  {
            Readers: {
                mspids: [
                    "Org1MSP",
                    "Org2MSP"
                ]
            },
            Writers: {
                 mspids: [
                "Org1MSP"
                ]
            }
        }
     */
    setPolicyImplicitToSignature(targetPolicies, policyGroups){
        for (var key in targetPolicies) {
            if (targetPolicies.hasOwnProperty(key)) {
                //
                var newpolicy = {
                    mod_policy: "Admins",
                    policy : { 
                        type : 1,
                        value : {
                             identities: [
                                 //{
                                 //    principal: {
                                 //        msp_identifier: this.mspid
                                 //    }
                                 //}
                             ],
                             rule: {
                                 n_out_of: {
                                     n: 1,
                                     rules: [
                                         //{
                                         //    signed_by: 0
                                         //}
                                     ]
                                 }
                             }
                        }
                    }
                }
                //
                if (!targetPolicies[key].hasOwnProperty('mspids')) {
                    console.log("Missing MSPID in policy configuration")
                    
                }
                var i = 0;
                targetPolicies[key].mspids.forEach(function( mspid) {
                    var id = {
                        principal: {
                            msp_identifier: mspid
                        }
                    }
                    var rule = {
                        signed_by : i
                    }
                    newpolicy.policy.value.identities.push(id)
                    newpolicy.policy.value.rule.n_out_of.rules.push(rule)
                    i++
                })
                policyGroups[key] = newpolicy
            }
        }
        return policyGroups;
    }


};



module.exports = ConfigTools;