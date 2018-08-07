'use strict';
var helper = require('./tools/helper.js');
var logger = helper.getLogger('ca-enroll');

var CATools = require('./tools/ca-tools.js');
var ca = new CATools();

var caEnroll = function (enrollmentID, enrollmentSecret) {
	logger.info('\n\n============ Enroll a user to  chaincode on organizations ============\n');


	var client = null;

	return helper.getClient().then(_client => {
		client = _client;
		return ca.getAdminUser(client, enrollmentID, enrollmentSecret);
	}).then(admin => {
		logger.info(admin);
		return ca.getMemberUserForOrg(client, "org1", admin, "member10");
	}).then(member => {
		logger.info(member);
		return ca.getMember(client, "member6", enrollmentID, enrollmentSecret, "Org1MSP")
	}).then(member => {
		logger.info(member);
		// get the CA associated with this client's organization
		let caService = client.getCertificateAuthority();


		let request = {
			enrollmentID: enrollmentID,
			enrollmentSecret: enrollmentSecret,
			profile: 'tls'
		};
		return caService.enroll(request);
	}).then((enrollment) => {
		let key = enrollment.key.toBytes();
		let cert = enrollment.certificate;
		logger.info("CA enroll admin:adminpw with key : ", key);
		logger.info("CA enroll admin:adminpw with cert : ", cert);
		// set the material on the client to be used when building endpoints for the user
		client.setTlsClientCertAndKey(cert, key);
		return { status: "Enroll a new user successfully" }
	}, (err) => {
		logger.error('Failed to send install proposal due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to send install proposal due to error: ' + err.stack ? err.stack : err);
	}).catch(err => {
		logger.error('Failed to send install proposal due to error: ' + err.stack ? err.stack : err);
		throw new Error('Failed to send install proposal due to error: ' + err.stack ? err.stack : err);
	});
};

exports.caEnroll = caEnroll;
