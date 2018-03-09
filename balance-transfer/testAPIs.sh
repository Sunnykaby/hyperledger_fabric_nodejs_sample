#!/bin/bash
#
# Get end2end network config from user

#default config
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="end2end42"
CHAINCDDE_VER="v1"
CHAINCODE_PATH="github.com/end2end"
ORG_NAME="Org1MSP"
TARGET_PEER="peer0.org1.example.com"

# echo "We need the following details to initialize the ledger config."
# echo  "Enter name of channel [ENTER]: "
# read -e CHANNEL_NAME
# echo -n "Enter name of chaincode [ENTER]: "
# read -e CHAINCODE_NAME



echo "POST Install chaincode on Org1"
echo
curl -s -X POST \
  http://localhost:4000/chaincodes \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"$TARGET_PEER\"],
	\"chaincodeName\":\"$CHAINCODE_NAME\",
	\"chaincodePath\":\"$CHAINCODE_PATH\",
	\"channelName\": \"$CHANNEL_NAME\",
	\"chaincodeVersion\":\"$CHAINCDDE_VER\",
  \"orgName\":\"$ORG_NAME\"
}"
echo
echo

echo "POST instantiate chaincode on peer1 of Org1MSP"
echo
curl -s -X POST \
  http://localhost:4000/channels/$CHANNEL_NAME/chaincodes \
  -H "content-type: application/json" \
  -d "{
  \"peers\": [\"$TARGET_PEER\"],
	\"chaincodeName\":\"$CHAINCODE_NAME\",
  \"chaincodePath\":\"$CHAINCODE_PATH\",
	\"chaincodeVersion\":\"$CHAINCDDE_VER\",
  \"fcn\": \"init\",
	\"args\":[\"a\",\"100\",\"b\",\"200\"],
  \"orgName\":\"$ORG_NAME\"
}"
echo
echo

echo "POST invoke chaincode on peers of Org1"
echo
curl -s -X POST \
  http://localhost:4000/channels/$CHANNEL_NAME/chaincodes/$CHAINCODE_NAME \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"$TARGET_PEER\"],
	\"fcn\":\"invoke\",
	\"args\":[\"a\",\"b\",\"10\"],
  \"orgName\":\"$ORG_NAME\"
}"
echo
echo


echo "GET query chaincode on peer1 of Org1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/$CHANNEL_NAME/chaincodes/$CHAINCODE_NAME?peer=$TARGET_PEER&fcn=query&args=%5B%22a%22%5D&orgName=$ORG_NAME" \
  -H "content-type: application/json"
echo
echo

echo "POST invoke chaincode on peers of Org1"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel/chaincodes/$CHAINCODE_NAME \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"$TARGET_PEER\"],
	\"fcn\":\"invoke\",
	\"args\":[\"a\",\"b\",\"40\"],
  \"orgName\":\"$ORG_NAME\"
}"
echo
echo

echo "GET query chaincode on peer1 of Org1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/$CHANNEL_NAME/chaincodes/$CHAINCODE_NAME?peer=$TARGET_PEER&fcn=query&args=%5B%22a%22%5D&orgName=$ORG_NAME" \
  -H "content-type: application/json"
echo
echo

echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
