require('dotenv').config();
var processArticle = require('./processArticle');
const fs = require('fs');
var chunk = require('chunk');
var csv = require('fast-csv');
var prompt = require('prompt-promise');
const commandLineArgs = require('command-line-args')
const optionDefinitions = [
	{name: 'total', alias: 't', type: Number, defaultValue: 5},
	{name: 'maxSimultaneous', alias: 'm', type: Number, defaultValue: 1}
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
			if (!doNext) return Promise.resolve(true);
			return Promise.all(links.map(l => {
				return processArticle(l.url);
			}))
			.then(results => {
				return prompt('Process next set of articles(y/n)?')
				.then(res => {
					if (res === 'y')
						return Promise.resolve(true);
					else return Promise.resolve(false);
				});
			})
		})
	}, Promise.resolve())
}