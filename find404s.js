const fs = require('fs');
var Crawler = require('simplecrawler');
var csv = require('fast-csv');
const cheerio = require('cheerio');
const commandLineArgs = require('command-line-args');

const optionDefinitions = [
	{name: 'overide_time', alias: 'o', type: Boolean, defaultValue: false}
];
const options = commandLineArgs(optionDefinitions);

var url = "https://www.ocweekly.com/";
var saveFile = 'crawlQueue.json';

var writeStream404 = fs.createWriteStream('./logs/404s.csv');
var csvStream404 = csv.createWriteStream({headers: true});
csvStream404.pipe(writeStream404);
var writeStreamOther = fs.createWriteStream('./logs/otherErrors.csv');
var csvStreamOther = csv.createWriteStream({headers: true});
csvStreamOther.pipe(writeStream404);

var totalUrlsCrawled = 0;
var totalErrorsFound = 0;
var sessionUrlsCrawled = 0;
var sessionErrorsFound = 0;

var crawler = new Crawler(url);
crawler.parseHTMLComments = false;

crawler.discoverResources = function(buffer, queueItem) {
    var $ = cheerio.load(buffer.toString("utf8"));

    return $("a[href]").map(function () {
        return $(this).attr("href");
    }).get();
};

crawler.on('fetchcomplete', (queueItem) => {
	sessionUrlsCrawled++;
	updateGUI();
	if (!validTime()){
		console.log('Script is now exiting because of time');
		saveAndQuit();
	}
});

crawler.on('fetch404', (queueItem, responseObject) => {
	var url = queueItem.url;
	var referrer = queueItem.referrer;
	csvStream404.write({
		url: url,
		referrer: referrer
	});
	sessionErrorsFound++;
});

if (!validTime()){
	console.log('Not a valid time to run the script');
	process.exit();
}


loadQueueIfExistsAndStart();














function updateGUI(){
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write('URLs Scanned This Session: ' + sessionUrlsCrawled + ' | 404s Found This Session: ' + sessionErrorsFound);
}


function drawGUI(){
	process.stdout.write('Scanning ' + url + '\n');
	process.stdout.write('Total URLs Scanned: ' + totalUrlsCrawled + ' | Total 404s Found: ' + totalErrorsFound);
	process.stdout.write('\n');
	process.stdout.write('URLs Scanned This Session: ' + sessionUrlsCrawled + ' | 404s Found This Session: ' + sessionErrorsFound);
}


function saveAndQuit(){
	crawler.queue.freeze(saveFile, function () {
	    process.exit();
	});
}


function loadQueueIfExistsAndStart(){
	fs.stat(saveFile, err => {
		if (!err) {
			console.log('Found save file at ' + saveFile);
			crawler.queue.defrost(saveFile, () => { 
				updateTotalsFromSaveFile(() => {
					drawGUI();
					crawler.start();
				});
			});
		}
		else if (err.code == 'ENOENT'){
			console.log('Could not find save file at ' + saveFile);
			drawGUI();
			crawler.start();
		}
		else{
			console.log(err.code);
			process.exit();
		}
	});
}

function updateTotalsFromSaveFile(callback){
	crawler.queue.countItems({ fetched: true }, (err, count) => {
		totalUrlsCrawled = count;
		crawler.queue.countItems({ status: 'notfound' }, (err, count) => {
			totalErrorsFound = count;
			callback();
		});
	});

}

function validTime(){
	if (options.overide_time) return true;
	var d = new Date();
	if (d.getHours() < 23 && d.getHours() > 4){
		return false;
	}
	return true;
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