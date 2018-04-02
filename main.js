require('dotenv').config();
var processArticle = require('./processArticle');
const fs = require('fs');
var chunk = require('chunk');
var csv = require('fast-csv');
var prompt = require('prompt-promise');
const commandLineArgs = require('command-line-args')
const optionDefinitions = [
	{name: 'total', alias: 't', type: Number, defaultValue: 1000},
	{name: 'maxSimultaneous', alias: 'm', type: Number, defaultValue: 1},
	{name: 'prompt', alias: 'p', type: Boolean, defaultValue: false},
	{name: 'openEditPage', alias: 'o', type: Boolean, defaultValue: false}
];
const options = commandLineArgs(optionDefinitions);

var csv = require("fast-csv");

var links = [];


csv
.fromPath("logs/404s.csv", {headers: true})
.on("data", function(data){
	if (links.find(l => l.url === data.url)) return;
	if (links.length < options.total) links.push(data);
})
.on("end", function(){
	processArticleUrls(links).catch(console.log);
});


function processArticleUrls(data){
	var linkArrays = chunk(data, options.maxSimultaneous);
	return linkArrays.reduce((promise, links) => {
		return promise.then(doNext => {
			if (!doNext) return Promise.resolve(false);
			return Promise.all(links.map(l => {
				console.log('\n');
				console.log('\n');
				console.log('\n');
				console.log('Processing ' + l.url);
				return processArticle(l.url, null, null, options.openEditPage);
			}))
			.catch(console.log)
			.then(results => {
				if (options.prompt){
					return prompt('Process next set of articles(y/n)?')
					.then(res => {
						if (res === 'y')
							return Promise.resolve(true);
						else return Promise.resolve(false);
					});
				}
				else return Promise.resolve(true);
			})
		})
	}, Promise.resolve(true))
}