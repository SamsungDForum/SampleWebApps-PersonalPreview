// Global variables definition
var backendIp = require('./backgroundServiceConfig.json').backendIp;
var ajax = require('./ajax.js');

function prepareLogText(msg) {
    var args = Array.prototype.slice.call(msg);
    var logTime = new Date().toLocaleTimeString();
    var text = '[' + logTime + ']: ' + args.map(function (arg) {
        return (typeof arg === 'object' ? JSON.stringify(arg) : arg);
    }).join(' | ');

    return text;
}

function log() {
    var text = prepareLogText(arguments);
    ajax.get(backendIp, '/log?type=log&message=' + encodeURIComponent(text));
}

function error() {
    var text = prepareLogText(arguments);
    ajax.get(backendIp, '/log?type=error&message=' + encodeURIComponent(text));
}

module.exports = {
    log: log,
    error: error
};
