/*
Utility Functions

Various functions to check the integrity of data.
*/
var isString = function(x) {
    return x !== null && x !== undefined && x.constructor === String
}

var isNumber = function(x) {
    return x !== null && x !== undefined && x.constructor === Number
}

var isBoolean = function(x) {
    return x !== null && x !== undefined && x.constructor === Boolean
}

var isObject = function(x) {
    return x !== null && x !== undefined && x.constructor === Object
}

var isArray = function(x) {
    return x !== null && x !== undefined && x.constructor === Array
}

var isDate = function(d) {
  if ( Object.prototype.toString.call(d) === "[object Date]" ) {
    if ( isNaN( d.getTime() ) ) {
      return false;
    }
    else {
      return true;
    }
  }
  else {
    return false;
  }
}

var isRealmObject = function(x) {
    return x !== null && x !== undefined && x.constructor === Realm.Object
}

var isRealmList = function(x) {
    return x !== null && x !== undefined && x.constructor === Realm.List
}

var sanitizeFloat = function(number) {
    if (isNumber(number)) {
        return number;
    }
    else if (isString(number)) {
        let n = parseFloat(number);
        if (isNaN(n)) {
          return null;
        }
        else {
          return n;
        }
    }
    else {
        return null;
    }
}

var sanitizeInt = function(number) {
    if (isNumber(number)) {
        return number;
    }
    else if (isString(number)) {
        return parseInt(number);
    }
    else {
        return null;
    }
}

var sanitizeString = function(string) {
    if (isString(string)) {
        return string;
    }
    else if (isNumber(string)) {
        return string.toString();
    }
    else {
        return null;
    }
}

var sanitizeStringNonNull = function(string) {
    if (isString(string)) {
        return string;
    }
    else if (isNumber(string)) {
        return string.toString();
    }
    else {
        return "";
    }
}

var sanitizeBool = function(bool) {
    if (isBoolean(bool)) {
        return bool;
    }
    else if (isNumber(bool)) {
        return Boolean(bool);
    }
    else {
        return null;
    }
}

exports.isString = isString;
exports.isNumber = isNumber;
exports.isBoolean = isBoolean;
exports.isObject = isObject;
exports.isArray = isArray;
exports.isDate = isDate;
exports.isRealmObject = isRealmObject;
exports.isRealmList = isRealmList;
exports.sanitizeFloat = sanitizeFloat;
exports.sanitizeInt = sanitizeInt;
exports.sanitizeString = sanitizeString;
exports.sanitizeStringNonNull = sanitizeStringNonNull;
exports.sanitizeBool = sanitizeBool;