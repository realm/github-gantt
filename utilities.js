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
        return parseFloat(number);
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

module.exports.isString = isString;
module.exports.isNumber = isNumber;
module.exports.isBoolean = isBoolean;
module.exports.isObject = isObject;
module.exports.isArray = isArray;
module.exports.isRealmObject = isRealmObject;
module.exports.isRealmList = isRealmList;
module.exports.sanitizeFloat = sanitizeFloat;
module.exports.sanitizeInt = sanitizeInt;
module.exports.sanitizeString = sanitizeString;
module.exports.sanitizeStringNonNull = sanitizeStringNonNull;
module.exports.sanitizeBool = sanitizeBool;