## NODE JS SDK Sample

Here is a sample application that utilizes the Hyperledger Fabric NODE JS SDK to 

* Connect to the fabric network using a set of config files
* Connect to a channel
* Install chaincode written in the "go" programming language
* Instantiate chaincode on a set of specific peers on a specific channel
* Invoke chaincode

It demonstrates how you could utilize the **__fabric-client__** Node.js SDK APIs.

The "network.yaml" file located in the parent directory mirrors your existing fabric environment. Namely it describes

* A client
* Channels
* An organization
* Orderers
* Peers 

It also describes where the security certificates with which to connect with your environment are located.

### Step 1: Install prerequisites

* **Node.js** v 6x

### Step 2: Modify configuration files

In the current directory "app-test.js", change the `CHANNEL_NAME` to the channel you wish to utilize to run the sample. The default channel is provided as 'default'.
Or, you can add a param for the command when you run the sample: `node app-test.js [channelName]`. 

Notice, if you want to run the sample on a new channel which is not included in the `network.yaml`, you should download a new `network.yaml` config file.  

### Step 3: Run the sample application

To run the application, execute the following node command: `node app-test.js [channelName]`.

"All Done"


### Some Notice

#### User context
If you don't want to use a user context with CA. And you can use a default admin user identity with client configuration in the Connection Profile. And to use the default admin identity, you should make the `useAdmin` to be true, for any function you want to call via `client` or `channel`.


