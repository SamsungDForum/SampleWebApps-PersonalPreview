/**
 * Communication mechanism for sending AJAX requests
 *
 * Usage example:
 * var ajax = require('./ajax.js');
 *
 * ajax.get('www.samsung.com', '/pl/index.html')
 * .then(function (data) {
 *     console.log(data);
 * })
 * .catch(function (err) {
 *     console.error('Ups... an error occured!', err.statusText, err.status);
 * });
*/

// Global variables definition
var http = require('http');

/**
 * Interface for backend communication.
 * Supports GET method.
 *
 * @param {string} hostname - hostname of your backend server, eg. 'www.samsung.com'
 * @param {string} endpoint - endpoint path on your backend server, eg. '/pl/index.html'
 */
function get(hostname, endpoint) {
    return new Promise(function (resolve, reject) {
        var options = {
            host: hostname,
            port: '80',
            path: endpoint,
            method: 'GET'
        };

        var request = http.request(options, function (response) {
            var responseString = '';

            response.on('data', function (data) {
                responseString += data;
            });

            response.on('end', function () {
                resolve(responseString);
            });
        });

        request.on('error', function (error) {
            reject({
                code: error.code,
                message: error.message
            });
        });

        request.end();
    });
}

module.exports = {
    get: get
};
