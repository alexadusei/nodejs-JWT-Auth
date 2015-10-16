// PostgreSQL configuration file. All information for connecting to 
// the database are here (postgres username, password, ip, database, etc)
// The 'secret' for the web tokens are also stored here. Both pieces of information
// are exported in a Javascript object

var conString = process.env.DATABASE_URL || 'postgres://username:password@localhost/database';

module.exports = {
    secret: 'sssshhhh',
    database: conString
};
