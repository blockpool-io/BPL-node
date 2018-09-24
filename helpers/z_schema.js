'use strict';

var ip = require('ip');
var constants = require('../constants.json');
var isDomainName = require('is-domain-name');
var bpljs = require('bpljs');

function schema(network) {
  this.z_schema = require('z-schema');

  this.z_schema.registerFormat('hex', function (str) {
    try {
      new Buffer(str, 'hex');
    } catch (e) {
      return false;
    }

    return true;
  });

  this.z_schema.registerFormat('publicKey', function (str) {
    if (str.length === 0) {
      return true;
    }

    try {
      var publicKey = new Buffer(str, 'hex');
      return publicKey.length === 33;
    } catch (e) {
      return false;
    }
  });

  this.z_schema.registerFormat('address', function (str) {
    if (str.length === 0) {
      return true;
    }

    var version = network.pubKeyHash;
    try {
        var decode = bpljs.customAddress.bs58checkDecode(str);
        return decode[0] == version;
    } catch (e) {
      return false;
    }
  });


  this.z_schema.registerFormat('vendorField', function (str) {
    if (str.length === 0) {
      return true;
    }

    try {
      var vendorField = new Buffer(str);

      return vendorField.length < 65;
    } catch (e) {
      return false;
    }
  });

  this.z_schema.registerFormat('csv', function (str) {
    try {
      var a = str.split(',');
      if (a.length > 0 && a.length <= 1000) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  });

  this.z_schema.registerFormat('signature', function (str) {
    if (str.length === 0) {
      return true;
    }

    try {
      var signature = new Buffer(str, 'hex');
      return signature.length < 73;
    } catch (e) {
      return false;
    }
  });

  this.z_schema.registerFormat('voteString', function (str) {
    //Excluding capital hex characters
    //(mainnet database could contain mixed case vote strings?)
    return /^[-+]0[23][0-9a-fA-F]{64}$/.test(str);
  });

  this.z_schema.registerFormat('queryList', function (obj) {
    obj.limit = 100;
    return true;
  });

  this.z_schema.registerFormat('delegatesList', function (obj) {
    obj.limit = constants.activeDelegates;
    return true;
  });

  this.z_schema.registerFormat('parsedInt', function (value) {
    /*jslint eqeq: true*/
    if (isNaN(value) || parseInt(value) != value || isNaN(parseInt(value, 10))) {
      return false;
    }

    value = parseInt(value);
    return true;
  });

  this.z_schema.registerFormat('ip', function (str) {
    if (ip.isV4Format(str) == true || ip.isV6Format(str) == true || isDomainName(str) == true) {
      return true
    }
    else {
      return false
    }
  });
}



// var registeredFormats = z_schema.getRegisteredFormats();
// console.log(registeredFormats);

// Exports
module.exports = schema;
