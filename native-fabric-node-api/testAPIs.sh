#!/bin/bash
#
# Get end2end network config from user

#default config
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="end2end52"
CHAINCDDE_VER="v1"
CHAINCODE_PATH="github.com/end2end"
ORG_NAME="Org1MSP"
TARGET_PEER='["peer0.org1.example.com"]'

# echo "We need the following details to initialize the ledger config."
# echo  "Enter name of channel [ENTER]: "
# read -e CHANNEL_NAME
# echo -n "Enter name of chaincode [ENTER]: "
# read -e CHAINCODE_NAME



echo "POST Install chaincode on Org1"
echo
node End2End.js -c $CHAINCODE_NAME -C $CHANNEL_NAME -p $CHAINCODE_PATH -v $CHAINCDDE_VER -P $TARGET_PEER -t "install" -o "Org1MSP"
echo
echo

echo "POST instantiate chaincode on peer1 of Org1MSP"
echo
node End2End.js -c $CHAINCODE_NAME -C $CHANNEL_NAME -p $CHAINCODE_PATH -v $CHAINCDDE_VER  -P '["peer0.org1.example.com"]' -t "instantiate" -f "init" -a "a,1000,b,1000" -o "Org1MSP"
echo
echo

echo "POST invoke chaincode on peers of Org1"
echo
node End2End.js -c $CHAINCODE_NAME -C $CHANNEL_NAME  -P '["peer0.org1.example.com"]' -t "invoke" -f "invoke" -a "b,a,1" -o "Org1MSP"
echo
echo


echo "GET query chaincode on peer1 of Org1"
echo
node End2End.js -c $CHAINCODE_NAME -C $CHANNEL_NAME  -P '["peer0.org1.example.com"]' -t "query" -f "query" -a "a" -o "Org1MSP"
echo
echo



echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
