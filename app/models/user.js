// PostgreSQL user model. Consists of a User class that defines all
// user information (username, password, admin status, etc)

var pg = require('pg');
var path = require('path');
var conString = require(path.join(__dirname, '../', '../', 'config'));
var bcrypt = require('bcrypt-nodejs');

// User class. Defines attributes of a User. 'save' function creates
// a new user to the database;
function User() {
    this.name = "";
    this.password = "";
    this.admin = false;

    this.save = function(callback) {
	var client = new pg.Client(conString.database);
	client.connect();

	client.query('INSERT INTO users (name, password, admin) VALUES($1, $2, $3)',
		     [this.name, User.generateHash(this.password), this.admin], 
		     function(err) {

	    if (err) {
		client.end();
		return callback(err);
	    }

	    client.end();
	    return callback(false);
	});
    };
}

User.generateHash = function(text) {
    return bcrypt.hashSync(text, bcrypt.genSaltSync(8), null);
}

// Postgres tip: You must redefine the client each time you want to
// run a query, despite having declared it before closing
User.find = function(result, callback) {
    var client = new pg.Client(conString.database);
    client.connect();

    var query = client.query('SELECT * FROM users', null, function(err, result){
	if (err) {
	    client.end();
	    return callback(err, null);
	}

	client.end();
	return callback(false, result.rows);
    });
};

// first parameter is an object with a 'name' field. the 'name' field
// contains the information
User.findOne = function(user, callback) {
    var client = new pg.Client(conString.database);
    client.connect();

    client.query("SELECT * FROM users WHERE name=$1", [user.name], function(err, result){
	if (err) {
	    client.end();
	    return callback(err, this); // callback = error, user
	}

	// if no rows were returned from query, user does not exist
	if (result.rows.length < 1) {
	    client.end();
	    return callback(false, null); // callback = no error, no user
	}

	// fill in data for the user that was found.
	this.name = result.rows[0]['name'];
	this.password = result.rows[0]['password'];
	this.admin = result.rows[0]['admin'];

	// if all is well, return the specified user
	client.end();
	return callback(false, this); // callback = no error, user
    });
};

module.exports = User;
