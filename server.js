// Main node file

// ================
// get the packages we need
// ================
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var pg = require('pg');
var bcrypt = require('bcrypt-nodejs');

var jwt = require('jsonwebtoken'); // used to create, sign and verify tokens
var config = require('./config'); // get our config file
var User = require('./app/models/user'); // get our postgres model

// =================
// = configuration =
// =================
var port = process.env.PORT || 8080;
var client = new pg.Client(config.database); // connect to database
app.set('superSecret', config.secret) // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// ===============
// ===  routes ===
// ===============
// basic route
app.get('/', function(req, res) {
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});

// Creates a fake user in the database
app.get('/setup', function(req, res) {

    // create a sample user
    var newUser = new User();

    newUser.name = 'Foo Bar';
    newUser.password = 'password';
    newUser.admin = true;
    
    // Check is username is already taken
    User.findOne({ name: newUser.name }, function(err, user) {
	
	if (err) throw err;

	if (user) {
	    res.json({ success: false, message: 'Username is already taken.' });
	} else { // !user, username is free
	    newUser.save(function(err) {
		if (err) throw err;

		res.json({ success: true, message: ' User saved successfully!' });
	    });
	}
    });
});

// ---------------- API ROUTES --------------

// get an instance of the router for api routes
var apiRoutes = express.Router();

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res) {

    // find the user
    User.findOne({ name: req.body.name }, function(err, user){
	
	if (err) throw err;
	
	// if no user under inputted name is found
	if (!user) {
	    res.json({ success: false, message: 'Authentication failed. User not found.' });
	} else if (user) { // if user under inputted name is found
	    
	    // check entered password matches the hashed password recorded
	    // for this user in the database
	    if (!bcrypt.compareSync(req.body.password, user.password)) {
		res.json({ success: false, message: 'Authentication failed. Wrong password.' });
	    } else { // user.password == req.body.password
		
		// if user is found and password is right
		// create a token
		var token = jwt.sign(user, app.get('superSecret'), {
		    // expiresInMinutes and expiresInSeconds has been deprecated.
		    // new method expiresIn is within seconds.
		    // the second-value here represents 24 hours
		    expiresIn: 86400
		});

		// return the information including token as JSON
		res.json({
		    success: true,
		    message: 'Authentication successful!',
		    token: token
		});
	    }
	}
    });
});

// route middleware to verify a token. The following routes will be verified,
// but the /authenticate route is still unprotected, to allow people to actually
// login (order of routes is important here)
apiRoutes.use(function(req, res, next) {

    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {
	
	// verifies secret and checks exp
	jwt.verify(token, app.get('superSecret'), function(err, decoded) {
	    if (err) {
		return res.json({ success: false, message: 'Failed to authenticate token.' });
	    } else {
		// if everything is good, save to request for use in other routes
		req.decoded = decoded;
		next();
	    }
	});
    } else {
	
	// if there is no token, return an error
	return res.status(403).send({
	    success: false,
	    message: 'No token provided.'
	});
    }
});

// route to show a random message (GET http://localhost:8080/api/);
apiRoutes.get('/', function(req, res) {
    res.json({ message: 'Welcome to this API!' });
});

// route to return all users (GET http://localhost:8080/api/users)
apiRoutes.get('/users', function(req, res) {
    User.find({}, function(err, users) {
	res.json(users);
    });
});

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

// ================
// start the server
// ================
app.listen(port);
console.log('Server running at http://localhost:' + port);
