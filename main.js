
var articleId;
var articleYear;
var articleUrl;
require('dotenv').config();
const { URL } = require('url');
var request = require('request-promise');
var validUrl = require('valid-url');
const fs = require('fs');
const readdir = require('fs-readdir-promise');
const opn = require('opn');
const convert = require('xml-to-json-promise');
const titleCase = require('title-case');
var buildUrl = require('build-url');
const Entities = require('html-entities').AllHtmlEntities;
var colors = require('colors');
colors.setTheme({
    update: 'white',
    prompt: ['magenta'],
    success: ['green'],
    error: ['red'],
    warning: ['yellow']
});
var prompt = require('prompt-promise');
const entities = new Entities();
const wpapi = require( 'wpapi' );
const wp = new wpapi({
	endpoint: process.env.url + '/wp-json/',
	username: process.env.WP_USERNAME,
	password: process.env.WP_PASSWORD
});
const commandLineArgs = require('command-line-args')
//First validate command line arguments
const optionDefinitions = [
	{name: 'id', alias: 'i', type: Number},
	{name: 'year', alias: 'y', type: Number},
	{name: 'url', alias: 'u', type: String}
];
const options = commandLineArgs(optionDefinitions);

if (!('url' in options || 'id' in options)){
	console.error('You must supply either an id or a url as a command line argument');
	process.exit();
}

//First, parse the url if it was passed as a cla
if (options.url){
	if (validUrl.isWebUri(options.url))
		articleUrl = new URL(options.url);
	else articleUrl = new URL(buildUrl(process.env.URL, {path: options.url}));
}

var requestPromise;
//First, if the url is provided, check to make sure it's actually a 404
if (options.url){
	requestPromise = checkFor404(articleUrl);
}

//First get the id if not supplied
if (!options.id){
	articleId = parseIdFromUrl(articleUrl);
	if (articleId === false) process.exit();
}
else articleId = options.id;

var searchPromise;
if (options.year){
	//If the year was supplied, we can just look through one file to find the article
	const xmlFileName = 'Content-' + options.year + '.xml';
	searchPromise = searchFileForArticle(xmlFileName, articleId);
}
else {
	searchPromise = readdir(process.env.XML_FILE_DIR)
	.then(files => {
		//For all files in xmlFiles, Search for article using id
		return files.reduce((promise, file) => {
			return promise.then(found => {
				if (found) return Promise.resolve(found);
				return searchFileForArticle(file, articleId);
			})
		}, Promise.resolve())

	});
	
}


//Load relevant xml file


searchPromise
.then(article => {
	return searchForArticle(article.description[0]).then(() => return Promise.resolve(article));
})
.then(article => {
	console.log('Creating post...'.update);
	//Time to post it to wordpress
	
	//Format the images and iframes
	article = addImageHTML(article);
	article = addVideoHTML(article);
	//Create the json for the post
	var postJSON = {
		title: article.title[0],
		content: article.body[0],
		date: article.creation_date[0],
		slug: slugify(article.title[0]) + '-' + article.oid[0],
		status: 'draft',
		ocw_author: 'author' in article ? titleCase(article.author[0]) : null
	};
	//return wp.posts().create(postJSON)
})
.then(result => {
	var editUrl = process.env.URL + '/wp-admin/post.php?post=' + result.id + '&action=edit';
	opn(editUrl);
})
.catch(err => {
	if (typeof err === 'string') console.log(err.error);
	else console.log(err);
});















/************************
*
* FUNCTIONS
*
*************************/

function checkFor404(urlObj){
	var url = urlObj.toString();
	return new Promise((resolve, reject) => {
		request({
			uri: url,
			resolveWithFullResponse: true
		})
		.then(() => {
			reject(options.url + ' responded with 200');
		})
		.catch(err => {
			if (err.statusCode === 404) resolve();
			else reject(options.url + ' responded with ' + err.statusCode);
		});
	});
}


function parseIdFromUrl(urlObj){
	console.log('Extracting id from url...'.update);
	var pathname = urlObj.pathname;
	//look for id
	potentialIds = pathname.match(/\d{7}/g);
	if (potentialIds.length === 0){
		console.log('Could not parse id from url. Please supply the id directly'.error);
		return false;
	}
	if (potentialIds.length > 1){
		console.log('There is more than one potential id in the url. Please supply the id directly'.error);
		return false;
	}
	console.log(('Id found: ' + articleId).success);
	return potentialIds[0];
}


function searchForArticle(snippet){
	console.log('Searching wordpress to see if article already exists'.update);
	return wp.posts().search(snippet)
	.then(matchingPosts => {
		if (matchingPosts.length > 0){ 
			return Promise.reject('The following links came up in the search:' + matchingPosts.map(p => '\n' + p.link));
		}
		else return Promise.resolve();
	});
}

//Returns promise that resolves with either xml2js object, or false
function searchFileForArticle(xmlFileName, id){
	return new Promise((resolve, reject) => {
		if (isNaN(id)) return reject('Expecting id to be a number, received ' + id);
		convert.xmlFileToJSON(
			'xmlFiles/' + xmlFileName, 
			{
				strict: false,
				normalizeTags: true,
				tagNameProcessors: [
					function (name){
						if (name.substr(0, 3) === 'fn:') return name.substr(3);
						return name;
					}
				]
			}
		)
		.then(json => {
			console.log(('Searching for ' + id + ' in ' + xmlFileName + '...').update);
			//Search for id in resulting json
			items = json.rss.channel[0].item;
			var article = items.find(item => {
				return Number(item.oid[0]) === Number(id);
			});
			if (typeof article === 'undefined'){
				return resolve(false);
			} 
			//Found the article
			console.log(('Found article in ' + xmlFileName).success);
			return resolve(article);
		})
		.catch(reject);
	})
}


function createPostFromArticleObject(articleObj){
	console.log('Creating post...'.update);
	//Time to post it to wordpress
	
	//Format the images and iframes
	article = addImageHTML(articleObj);
	article = addVideoHTML(articleObj);
	//Create the json for the post
	var postJSON = {
		title: articleObj.title[0],
		content: articleObj.body[0],
		date: articleObj.creation_date[0],
		slug: slugify(articleObj.title[0]) + '-' + articleObj.oid[0],
		status: 'draft',
		ocw_author: 'author' in articleObj ? titleCase(articleObj.author[0]) : null
	};
	return wp.posts().create(postJSON);
}


function slugify(text){
  // replace non letter or digits by -
  text = text.replace('~[^\pL\d]+~u', '-');

  // transliterate
  //$text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);

  // remove unwanted characters
  text = text.replace('~[^-\w]+~', '');

  // trim
  text = text.trim();

  // remove duplicate -
  text = text.replace('~-+~', '-');

  // lowercase
  text = text.toLowerCase();

  if (!text) {
    return 'n-a';
  }

  return text;
}



function addImageHTML(article){
	if (!('image' in article)) return article;
	var imageCount = article.image.length;
	//Get image urls
	var images = article.image.map(image => {
		var url = new URL(image.url[0]);
		//Process image url
		var path = url.pathname.split('/');
		var imageName = path.pop();
		var imageId = path.pop();
		var imageUrl = 'https://www.ocweedly.com/wp-content/uploads/' + imageId + '_' + imageName;
		var caption = image.caption != null ? image.caption[0] : null;
		var credit = image.credit != null ? image.credit[0] : null;
		return {
			url: imageUrl,
			caption: caption,
			credit: credit
		}
	});
	//Replace each instance of [image-?] with an html image tag
	var replaced = 0; //Number of images replaced, to make sure the number of image urls matched the number of [image] tags in the body
	var regex = RegExp(/\[image\-\d+\]/);
	body = article.body[0];
	for (replaced = 0 ; regex.test(body) ; replaced++){
		var image = images.shift();
		var imageTag = '';
		if (image.caption){
			imageTag += '[caption align="aligncenter" width="1000" caption="' + image.caption + '"]';
		}
		imageTag += '<image src="' + image.url + '" class="size-full" />';
		if (image.caption){
			imageTag += '[/caption]';
		}
		body = body.replace(regex, imageTag);
	}
	if (replaced !== imageCount){
		console.log(('There was an error. Found ' + imageCount + ' image(s), but replaced ' + replaced).warning);
	}
	body = entities.decode(body);
	article.body[0] = body;
	return article;
}

function addVideoHTML(article){
	if (!('video' in article)) return article;
	var count = article.video.length;
	var replaced = 0; //Number of items replaced, to make sure the number of image urls matched the number of [image] tags in the body
	var regex = RegExp(/\[embed\-\d+\]/);
	body = article.body[0];
	for (replaced = 0 ; regex.test(body) ; replaced++){
		var videoTag = article.video[replaced].embed[0];
		body = body.replace(regex, videoTag);
	}
	if (replaced !== count){
		console.log(('There was an error. Found ' + count + ' video(s), but replaced ' + replaced).warning);
	}
	body = entities.decode(body);
	article.body[0] = body;
	return article;
}

