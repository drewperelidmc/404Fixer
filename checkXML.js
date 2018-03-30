var fs = require("fs");

var xmlChecker = require('xmlChecker');

fs.readFile("./xmlFiles/test.xml", "utf8", function(err, data) {
	if (err){
		console.log(err);
		process.exit();
	}	
	try{
		xmlChecker.check(data);
		console.log('XML is valid');
	}
	catch (error){
		console.log("XML Parser: " + error.name + " at " + error.line + "," + error.column + ": " + error.message);
		console.log(error);
	}
});
