## End to End Sample with Fabric Node SDK

A sample Node.js app to demonstrate **__fabric-client__** & **__fabric-ca-client__** Node.js SDK APIs

### Prerequisites and setup:

* Fabric Blockchain network environment
* **Node.js** v6

* Download the end2end sample zip package
* Unzip the zip package

```
cd native-fabric-node-api
```

Once you have completed the above setup, you will have a the following network configuration form config.json:

* A orderer
* A organization
* One peer (1 peers per Org)

## Running the sample program

There are two options available for running the end to end sample
For each of these options, you may choose to run with testAPI.sh or node command

##### Terminal Window

Open an terminal window

* Install the fabric-client and fabric-ca-client node modules

```
npm install
```

* Check the config file of fabric blockchain network, config.json file in the project root directory. 
* Set the config info of testAPI.sh
* Run the test script

```
./testAPIs.sh
```
And you can use the command to see the args comment

```
node End2End.js -h
```