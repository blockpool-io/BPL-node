var moment = require('moment');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var bip39 = require('bip39');
var ByteBuffer = require('bytebuffer');
var bignum = require('../helpers/bignum.js');
var networks = require('../networks.json');
var constants = require('../constants.json');
var bpljs = require('bpljs');

//configuration
var configuration = {
    "numberOfDelegate": 201,
    "database": "name",
    "databaseUser": "username",
    "databasePassword": "password",
    "network": "BPL-testnet",
    "time": parseInt(new Date().getTime() / 1000)
}

//BPL-js configuration

bpljs = new bpljs.BplClass({
    "delegates": constants.activeDelegates,
    "epochTime": constants.epochTime,
    "interval": constants.blocktime,
    "network": networks[configuration.network]
});

//added to get different config files
var seed_peers = [
    {
        "ip": "10.0.2.148",
        "port": 9032,
        "aws": "10.0.2.148"
    }
];

//temporarily pre-configured: database, user, password
var config = {
    "port": 9032,
    "address": "10.0.2.148",
    "version": "0.3.0",
    "fileLogLevel": "info",
    "logFileName": "logs/wbx.log",
    "consoleLogLevel": "debug",
    "trustProxy": false,
    "db": {
        "host": "localhost",
        "port": 5432,
        "database": configuration.database,
        "user": configuration.databaseUser,
        "password": configuration.databasePassword,
        "poolSize": 20,
        "poolIdleTimeout": 30000,
        "reapIntervalMillis": 1000,
        "logEvents": [
            "error"
        ]
    },
    "api": {
        "mount": true,
        "access": {
            "whiteList": []
        },
        "options": {
            "limits": {
                "max": 0,
                "delayMs": 0,
                "delayAfter": 0,
                "windowMs": 60000
            }
        }
    },
    "peers": {
        "minimumNetworkReach": 1,
        "list": [], //Since each IP was getting copied in the generated files, however we want only a single IP and that too of the current instance.
        "blackList": [],
        "options": {
            "limits": {
                "max": 0,
                "delayMs": 0,
                "delayAfter": 0,
                "windowMs": 60000
            },
            "maxUpdatePeers": 20,
            "timeout": 5000
        }
    },
    "forging": {
        "coldstart": 6,
        "force": true,
        "secret": [],
        "access": {
            "whiteList": [
                "127.0.0.1"
            ]
        }
    },
    "loading": {
        "verifyOnLoading": false,
        "loadPerIteration": 5000
    },
    "ssl": {
        "enabled": false,
        "options": {
            "port": 443,
            "address": "0.0.0.0",
            "key": "./ssl/bpl.key",
            "cert": "./ssl/bpl.crt"
        }
    },
    "network": configuration.network
};

//sets the networkVersion
//setting the network version inside node_modules/bpljs/lib/transactions/crypto.js
bpljs.crypto.setNetworkVersion(networks[config.network].pubKeyHash);
//console.log(networks[config.network]);
sign = function (block, keypair) {
    var hash = getHash(block);
    return keypair.sign(hash).toDER().toString("hex");
};


getId = function (block) {
    var hash = crypto.createHash('sha256').update(getBytes(block)).digest();
    var temp = new Buffer(8);
    for (var i = 0; i < 8; i++) {
        temp[i] = hash[7 - i];
    }

    var id = bignum.fromBuffer(temp).toString();
    return id;
};

getHash = function (block) {
    return crypto.createHash('sha256').update(getBytes(block)).digest();
};


getBytes = function (block) {
    var size = 4 + 4 + 4 + 8 + 4 + 4 + 8 + 8 + 4 + 4 + 4 + 32 + 32 + 66;
    var b, i;

    try {
        var bb = new ByteBuffer(size, true);
        bb.writeInt(block.version);
        bb.writeInt(block.timestamp);
        bb.writeInt(block.height);

        if (block.previousBlock) {
            var pb = bignum(block.previousBlock).toBuffer({ size: '8' });

            for (i = 0; i < 8; i++) {
                bb.writeByte(pb[i]);
            }
        } else {
            for (i = 0; i < 8; i++) {
                bb.writeByte(0);
            }
        }

        bb.writeInt(block.numberOfTransactions);
        bb.writeLong(block.totalAmount);
        bb.writeLong(block.totalFee);
        bb.writeLong(block.reward);

        bb.writeInt(block.payloadLength);

        var payloadHashBuffer = new Buffer(block.payloadHash, 'hex');
        for (i = 0; i < payloadHashBuffer.length; i++) {
            bb.writeByte(payloadHashBuffer[i]);
        }

        var generatorPublicKeyBuffer = new Buffer(block.generatorPublicKey, 'hex');
        for (i = 0; i < generatorPublicKeyBuffer.length; i++) {
            bb.writeByte(generatorPublicKeyBuffer[i]);
        }

        if (block.blockSignature) {
            var blockSignatureBuffer = new Buffer(block.blockSignature, 'hex');
            for (i = 0; i < blockSignatureBuffer.length; i++) {
                bb.writeByte(blockSignatureBuffer[i]);
            }
        }

        bb.flip();
        b = bb.toBuffer();
    } catch (e) {
        throw e;
    }

    return b;
};

create = function (data) {
    var transactions = data.transactions.sort(function compare(a, b) {
        if (a.type < b.type) { return -1; }
        if (a.type > b.type) { return 1; }
        if (a.amount < b.amount) { return -1; }
        if (a.amount > b.amount) { return 1; }
        return 0;
    });

    var nextHeight = 1;

    var reward = 0,
        totalFee = 0, totalAmount = 0, size = 0;

    var blockTransactions = [];
    var payloadHash = crypto.createHash('sha256');

    for (var i = 0; i < transactions.length; i++) {
        var transaction = transactions[i];
        var bytes = bpljs.crypto.getBytes(transaction);

        size += bytes.length;

        totalFee += transaction.fee;
        totalAmount += transaction.amount;

        blockTransactions.push(transaction);
        payloadHash.update(bytes);
    }

    var block = {
        version: 0,
        totalAmount: totalAmount,
        totalFee: totalFee,
        reward: reward,
        payloadHash: payloadHash.digest().toString('hex'),
        timestamp: data.timestamp,
        numberOfTransactions: blockTransactions.length,
        payloadLength: size,
        previousBlock: null,
        generatorPublicKey: data.keypair.publicKey.toString('hex'),
        transactions: blockTransactions,
        height: 1
    };

    block.id = getId(block);


    try {
        block.blockSignature = sign(block, data.keypair);
    } catch (e) {
        throw e;
    }

    return block;
}

var delegates = [];
var transactions = [];

var genesis = {
    passphrase: bip39.generateMnemonic(),
    balance: 10000000000000000 //WBX 100 million tokens
}

var premine = {
    passphrase: bip39.generateMnemonic()
}

premine.publicKey = bpljs.crypto.getKeys(premine.passphrase).publicKey;
premine.address = bpljs.crypto.getAddress(premine.publicKey, networks[config.network].pubKeyHash);

genesis.publicKey = bpljs.crypto.getKeys(genesis.passphrase).publicKey;
genesis.address = bpljs.crypto.getAddress(genesis.publicKey, networks[config.network].pubKeyHash);
genesis.wif = bpljs.crypto.getKeys(genesis.passphrase).toWIF();

var premineTx = bpljs.transaction.createTransaction(genesis.address, genesis.balance, null, premine.passphrase)

premineTx.fee = 0;
premineTx.timestamp = configuration.time;
premineTx.senderId = premine.address;
premineTx.signature = bpljs.crypto.sign(premineTx, bpljs.crypto.getKeys(genesis.passphrase));
premineTx.id = bpljs.crypto.getId(premineTx);

transactions.push(premineTx);

for (var i = 1; i < configuration.numberOfDelegate + 1; i++) { //WBX 51 delegates
    var delegate = {
        'passphrase': bip39.generateMnemonic(),
        'username': "genesis_" + i
    };

    var createDelegateTx = bpljs.delegate.createDelegate(delegate.passphrase, delegate.username);
    createDelegateTx.fee = 0;
    createDelegateTx.timestamp = configuration.time;
    createDelegateTx.senderId = genesis.address;
    createDelegateTx.signature = bpljs.crypto.sign(createDelegateTx, bpljs.crypto.getKeys(delegate.passphrase));
    createDelegateTx.id = bpljs.crypto.getId(createDelegateTx);


    delegate.publicKey = createDelegateTx.senderPublicKey;
    delegate.address = bpljs.crypto.getAddress(createDelegateTx.senderPublicKey, networks[config.network].pubKeyHash);

    transactions.push(createDelegateTx);

    delegates.push(delegate);
}

var genesisBlock = create({
    keypair: bpljs.crypto.getKeys(genesis.passphrase),
    transactions: transactions,
    timestamp: configuration.time
});

for (var i = 0; i < configuration.numberOfDelegate; i++) { //WBX 51 delegates
    config.forging.secret.push(delegates[i].passphrase);
}

/*Splits all delegates accross all seed_peers*/
for (var i = 0; i < configuration.numberOfDelegate; i++) { //WBX 51 delegates
    var seed_index = i % seed_peers.length;
    if (!seed_peers[seed_index].secret) {
        seed_peers[seed_index].secret = [];
    }
    seed_peers[seed_index].secret.push(delegates[i].passphrase);
}

seed_peers.forEach(function (peer) {
    config.peers.list.push({ "ip": peer.ip, "port": config.port });
});
/*
Generates the different config file for all peers that we have added in seed_peers.
*/
seed_peers.forEach(function (peer) {
    config.forging.secret = peer.secret;
    config.nethash = genesisBlock.payloadHash;//set the nethash in config file
    //to customize the address and peers list field in config.json file , we have included the below piece of code
    config.address = peer.aws; // setting up Public DNS(IPv4) of AWS in the generated config file, to avoid manually entering the same.
    fs.writeFile("private/config_files/config." + config.network + "." + peer.ip + ".json", JSON.stringify(config, null, 2));
});


fs.writeFile("private/genesisBlock.wbx.json", JSON.stringify(genesisBlock, null, 2));
fs.writeFile("private/config.wbx.json", JSON.stringify(config, null, 2));
fs.writeFile("private/delegatesPassphrases.wbx.json", JSON.stringify(delegates, null, 2));
fs.writeFile("private/genesisPassphrase.wbx.json", JSON.stringify(genesis, null, 2));
