require('dotenv').config();
var csv = require('fast-csv');
var spawn = require('child-process-promise').spawn;
var prompt = require('prompt-promise');
const commandLineArgs = require('command-line-args')
const optionDefinitions = [
	{name: 'maxSimultaneous', alias: 'm', type: Number, defaultValue: 3}
];


var exec = require('child-process-promise').exec;
 
exec('echo hello')
    .then(function (result) {
        var stdout = result.stdout;
        var stderr = result.stderr;
        console.log('stdout: ', stdout);
        console.log('stderr: ', stderr);
    })
    .catch(function (err) {
        console.error('ERROR: ', err);
    });