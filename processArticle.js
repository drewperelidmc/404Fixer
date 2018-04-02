


var articleId;
var articleYear;
var articleUrl;
require('dotenv').config();
const { URL } = require('url');
var request = require('request-promise');
var validUrl = require('valid-url');
const fs = require('fs');
var dateFormat = require('dateformat');
const readdir = require('fs-readdir-promise');
const opn = require('opn');
const convert = require('xml-to-json-promise');
const titleCase = require('title-case');
var buildUrl = require('build-url');
const Entities = require('html-entities').AllHtmlEntities;
var colors = require('colors');

const entities = new Entities();
const wpapi = require( 'wpapi' );
const wp = new wpapi({
	endpoint: process.env.url + '/wp-json/',
	username: process.env.WP_USERNAME,
	password: process.env.WP_PASSWORD
});

function processArticle(_url=null, _id=null, _year=null, openEditPage=true){
	//var access = fs.createWriteStream('./logs/' + dateFormat(Date.now(), 'yyyy-mm-dd_h-MM-ss') + '.log');
	//process.stdout.write = process.stderr.write = access.write.bind(access)
	return new Promise((_res, _rej) => {
		var options = {
			url: _url,
			id: _id,
			year: _year
		};

		if (!options.url && !options.id){
			return _rej('You must supply either an id or a url as an argument');
		}

		//First, parse the url if it was passed as a cla
		if (options.url){
			if (validUrl.isWebUri(options.url))
				articleUrl = new URL(options.url);
			else articleUrl = new URL(buildUrl(process.env.URL, {path: options.url}));
		}

		//Then get the id if not supplied
		if (!options.id){
			articleId = parseIdFromUrl(articleUrl);
			if (articleId === false) return _rej('Could not parse article id from url');
		}
		else articleId = options.id;

		var requestPromise;
		//Then, if the url is provided, set up promise to check that it's actually a 404
		if (options.url) requestPromise = checkFor404(articleUrl);
		else requestPromise = Promise.resolve();



		//Load relevant xml file
		requestPromise
		.then(() => {
			//Set up the search promise
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
					return files.reverse().reduce((promise, file) => {
						return promise.then(found => {
							if (found) return Promise.resolve(found);
							return searchFileForArticle(file, articleId);
						})
					}, Promise.resolve())

				});	
			}
			return searchPromise;
		})
		.then (article => {
			var newUrl = createArticleUrl(article);
			if (newUrl !== articleUrl){
				console.log('New url: ' + newUrl);
				fs.appendFile('rewrites.csv', articleUrl + ',' + newUrl + '\n', () => {})
				//Test new url for 404
				return checkFor404(new URL(newUrl)).then(() => Promise.resolve(article));
			}
			else return Promise.resolve(article);
		})
		.then(article => {
			return searchForArticle(article.description[0]).then(() => Promise.resolve(article));
		})
		.then(article => {
			return findCategoryForArticle(article).then(categoryId => {
				article.new_category_id = categoryId;
				return Promise.resolve(article);
			})
		})
		.then(article => {
			return createPostFromArticleObject(article);
		})
		.then(result => {
			if (openEditPage) {
				var editUrl = process.env.URL + '/wp-admin/post.php?post=' + result.id + '&action=edit';
				opn(editUrl);
			} 
			_res(true);
		})
		.catch(_rej);
	})
}













/************************
*
* FUNCTIONS
*
*************************/

function checkFor404(urlObj){
	var url = urlObj.toString();
	console.log(('Checking ' + url + ' for 404 response...'));
	return new Promise((resolve, reject) => {
		request({
			uri: url,
			resolveWithFullResponse: true,
			auth: {
				username: process.env.WP_USERNAME,
				password: process.env.WP_PASSWORD
			}
		})
		.then(() => {
			reject(url + ' responded with 200');
		})
		.catch(err => {
			if (err.statusCode === 404) {
				console.log(url + ' received 404 response');
				resolve();
			}
			else if (err.statusCode === 503) reject(url + ' responded with 503, indicating improper login credentials in .env');
			else reject(url + ' responded with ' + err.statusCode);
		});
	});
}


function parseIdFromUrl(urlObj){
	console.log('Extracting id from url...');
	var pathname = urlObj.pathname;
	//look for id
	potentialIds = pathname.match(/\d{7}/g);
	if (potentialIds === null){
		console.log('Could not parse id from url. Please supply the id directly');
		return false;
	}
	if (potentialIds.length > 1){
		console.log('There is more than one potential id in the url. Please supply the id directly');
		return false;
	}
	var found = potentialIds[0];
	console.log(('Id found: ' + found));
	return found;
}

function createArticleUrl(articleObj){
	return buildUrl(process.env.URL, {path: createArticleSlug(articleObj)});
}

function createArticleSlug(articleObj){
	return slugify(articleObj.title[0]) + '-' + articleObj.oid[0];
}

function searchForArticle(snippet){
	console.log('Searching wordpress to see if article already exists');
	return wp.posts().search(snippet)
	.then(matchingPosts => {
		if (matchingPosts.length > 0){ 
			return Promise.reject('The following links came up in the search:' + matchingPosts.map(p => '\n' + p.link));
		}
		else {
			console.log('Article does not appear to be on the site yet.');
			return Promise.resolve();
		}
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
			console.log(('Searching for ' + id + ' in ' + xmlFileName + '...'));
			//Search for id in resulting json
			items = json.rss.channel[0].item;
			var article = items.find(item => {
				return Number(item.oid[0]) === Number(id);
			});
			if (typeof article === 'undefined'){
				return resolve(false);
			} 
			//Found the article
			console.log(('Found article in ' + xmlFileName));
			console.log('Title: ' + article.title[0]);
			return resolve(article);
		})
		.catch(reject);
	})
}


function createPostFromArticleObject(articleObj){
	console.log('Creating post...');
	//Time to post it to wordpress
	
	//Format the images and iframes
	article = addImageHTML(articleObj);
	article = addVideoHTML(articleObj);
	//Create the json for the post
	var postJSON = {
		title: articleObj.title[0],
		content: articleObj.body[0].replace('&amp;', '&'),
		date: articleObj.creation_date[0],
		slug: createArticleSlug(articleObj),
		status: 'draft',
		ocw_author: 'author' in articleObj ? titleCase(articleObj.author[0]) : null
	};

	if (articleObj.new_category_id) postJSON.categories = [articleObj.new_category_id]; 
	
	return wp.posts().create(postJSON);
}


function findCategoryForArticle(articleObj){
	return new Promise((resolve, reject) => {
		if (articleObj.category[0]){
			//Category name first, because it's more specific
			var categories = [articleObj.category[0].category_name[0].toLowerCase(), articleObj.category[0].section_name[0].toLowerCase()];
			if (categories[0] === categories[1]) categories = [categories[0]];
			console.log('Seeing if categories ' + categories + ' already exist...');
			var promises = categories.map(c => {
				return wp.categories().search(c);
			});
			Promise.all(promises)
			.then(results => {
				var categoryId = false;
				//First check for exact matches of the category name, then of the section name
				results.forEach((resultSet, resultSetIndex) => {
					var category = categories[resultSetIndex];
					resultSet.forEach(result => {
						if (result.name.toLowerCase() === category){
							console.log(('Found matching category ' + result.name));
							categoryId = result.id;
							return false; //break
						}
					});
					if (categoryId !== false) return false; //break
				});
				if (categoryId === false) console.log('Could not find matching pre-existing category');
				resolve(categoryId);	
			})
			.catch(reject);
		}
		else{
			console.log('Article does not have any categories specified');
			resolve(false);
		}
	});
}

function slugify(text){
  // replace non letter or digits by -
  text = text.replace(/[^A-Za-z\d]+/g, '-');

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
		console.log(('There was an error. Found ' + imageCount + ' image(s), but replaced ' + replaced));
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
		console.log(('There was an error. Found ' + count + ' video(s), but replaced ' + replaced));
	}
	body = entities.decode(body);
	article.body[0] = body;
	return article;
}




module.exports = processArticle;