const fs = require('fs');
var blc = require('broken-link-checker');
var csv = require('fast-csv');
var Spinner = require('cli-spinner').Spinner;
var spinner = new Spinner('Scanning home page... %s');

var options = {
	excludeExternalLinks: true,
	filterLevel: 0,
	cacheResponses: true
	//excludedKeywords: ['https://www.ocweekly.com/events/']
}

var writeStream404 = fs.createWriteStream('./logs/404s.csv');
var csvStream404 = csv.createWriteStream({headers: true});
csvStream404.pipe(writeStream404);
var writeStreamOther = fs.createWriteStream('./logs/otherErrors.csv');
var csvStreamOther = csv.createWriteStream({headers: true});
csvStreamOther.pipe(writeStream404);


var c = new blc.SiteChecker(options, {
	link: result => {
		fs.appendFile('./logs/linksCrawled.log', JSON.stringify(result) + ',', () => {});
		if (result.broken){
			var foundOn = result.base.resolved;
			var url = result.url.resolved;
			if (url === 'https://www.ocweekly.com/events/') return;
			var statusCode = result.http.response.statusCode;
			if (statusCode === 404){
				csvStream404.write({
					url: url,
					parentUrl: foundOn
				});
			}
			else{
				csvStream404.write({
					url: url,
					statusCode: statusCode,
					parentUrl: foundOn
				});	
			}
		}
	},
	html: (tree, robots, response, pageUrl) => {
		spinner.stop(false);
		spinner = new Spinner('Scanning ' + pageUrl + '... %s');
		spinner.start();
	},
	end: () => {
		spinner.stop(true);
		fs.appendFile('./logs/linksCrawled.log', ']}', () => console.log('Complete'));
		
	}
});

fs.appendFile('./logs/linksCrawled.log', '{"sites":[', () => {
	spinner.start();
	c.enqueue('http://www.ocweekly.com/');
});

