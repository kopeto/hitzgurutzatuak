require('dotenv/config');

module.exports = {
  database: process.env.DB_CONNECTION,
  secret: process.env.MY_SECRET
}
