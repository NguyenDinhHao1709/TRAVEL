// Generate a JWT token for testing
process.env.JWT_SECRET = '6e245fdede443d299b6c8ef30b0e9d056d274b675259c5b79f1f4950bbfba6970969695127b6f30805210a464a088b53';
process.env.JWT_EXPIRES_IN = '7d';
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: 1, email: 'admin@travel.com', role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
console.log('TOKEN:', token);
