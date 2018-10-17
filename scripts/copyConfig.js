'use strict'
var fs=require('fs');

var oldConfig = require ('./../'+process.argv[3]);
var newConfig = require (process.argv[2]+'/'+process.argv[3]);

newConfig.port=oldConfig.port;
newConfig.address=oldConfig.address;
newConfig.db.database=oldConfig.db.database;
newConfig.db.user=oldConfig.db.user;
newConfig.db.password=oldConfig.db.password;
newConfig.forging.secret=oldConfig.forging.secret;

fs.writeFileSync(process.argv[2]+'/'+process.argv[3],JSON.stringify(newConfig,null,2));
