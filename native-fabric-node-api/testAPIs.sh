#!/bin/bash
#
# Get end2end network config from user

#default config
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="end2end14"
CHAINCDDE_VER="v1"
CHAINCODE_PATH="github.com"
ORG_NAME="Org1MSP"
TARGET_PEER="peer0.org1.example.com"

# echo "We need the following details to initialize the ledger config."
# echo  "Enter name of channel [ENTER]: "
# read -e CHANNEL_NAME
# echo -n "Enter name of chaincode [ENTER]: "
# read -e CHAINCODE_NAME



# echo "POST Install chaincode on Org1"
# echo
# node End2End.js -c $CHAINCODE_NAME -C $CHANNEL_NAME -p $CHAINCODE_PATH -v $CHAINCDDE_VER -P $TARGET_PEER -t "install" -o $ORG_NAME
# echo
# echo

# echo "POST instantiate chaincode on peer1 of Org1MSP"
# echo
# node End2End.js -c $CHAINCODE_NAME -C $CHANNEL_NAME -p $CHAINCODE_PATH -v $CHAINCDDE_VER  -P $TARGET_PEER -t "instantiate" -f "init" -a "a,1000,b,1000" -o $ORG_NAME
# echo
# echo

echo "POST invoke chaincode on peers of Org1"
echo
node End2End.js -c $CHAINCODE_NAME -C $CHANNEL_NAME  -P $TARGET_PEER -t "invoke" -f "invoke" -a "move,b,a,1" -o $ORG_NAME
echo
echo


echo "GET query chaincode on peer1 of Org1"
echo
node End2End.js -c $CHAINCODE_NAME -C $CHANNEL_NAME  -P $TARGET_PEER -t "invoke" -f "invoke" -a "query,a" -o "Org1MSP"
echo
echo



echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
