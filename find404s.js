const fs = require('fs');
var Crawler = require('simplecrawler');
var csv = require('fast-csv');
const cheerio = require('cheerio')

var url = "https://www.ocweekly.com/";

var writeStream404 = fs.createWriteStream('./logs/404s.csv');
var csvStream404 = csv.createWriteStream({headers: true});
csvStream404.pipe(writeStream404);
var writeStreamOther = fs.createWriteStream('./logs/otherErrors.csv');
var csvStreamOther = csv.createWriteStream({headers: true});
csvStreamOther.pipe(writeStream404);

var urlsCrawled = 0;
var errorsFound = 0;

var crawler = new Crawler(url);
crawler.parseHTMLComments = false;

crawler.discoverResources = function(buffer, queueItem) {
    var $ = cheerio.load(buffer.toString("utf8"));

    return $("a[href]").map(function () {
        return $(this).attr("href");
    }).get();
};

crawler.on('fetchcomplete', (queueItem) => {
	urlsCrawled++;
	updateGUI();
});

crawler.on('fetch404', (queueItem, responseObject) => {
	var url = queueItem.url;
	var referrer = queueItem.referrer;
	csvStream404.write({
		url: url,
		referrer: referrer
	});
	errorsFound++;
});

drawGUI();
crawler.start();


function updateGUI(){
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write('URLs Scanned: ' + urlsCrawled + ' | 404s Found: ' + errorsFound);
}


function drawGUI(){
	process.stdout.write('Scanning ' + url + '\n');
	process.stdout.write('URLs Scanned: ' + urlsCrawled + ' | 404s Found: ' + errorsFound);
}

/*


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

*/