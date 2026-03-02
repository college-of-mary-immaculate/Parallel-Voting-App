// Mock database for testing login
const mockUsers = [
  {
    userId: 1,
    vin: 'VTR123456',
    fullname: 'Test User',
    email: 'test@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO.', // password: Test123
    role: 'voter',
    isActive: 1,
    emailVerified: 1
  }
];

// Mock query function
const query = async (sql, params) => {
  console.log('Mock Query:', sql, params);
  
  if (sql.includes('SELECT') && sql.includes('email = ?')) {
    const users = mockUsers.filter(user => user.email === params[0]);
    return users;
  }
  
  if (sql.includes('INSERT') && sql.includes('User')) {
    return { insertId: mockUsers.length + 1 };
  }
  
  return [];
};

module.exports = { query };
