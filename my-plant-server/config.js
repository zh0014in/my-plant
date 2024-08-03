// config.js
module.exports = {
  db: {
    port: process.env.DB_PORT || 3306,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    name: process.env.DB_NAME || 'my_plant',
    password: process.env.DB_PASS || 'secret'
  }
};
