// Set NODE_ENV to 'test' before importing app
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import database connection function directly from config
const { connectToDatabase } = require('../src/config/database');

// Import the app after setting environment variables
const { app } = require('../src/app');

const testReview = {
  userId: 'testuser',
  contentId: 'testcontent',
  username: 'TestUser',
  review: 'Great movie!',
  spoilerContains: false,
  mediaType: 'movie',
};

let mongoServer;
let server;

beforeAll(async () => {
  // Create MongoDB memory server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Connect to test database
  await connectToDatabase(uri);
  
  // Create server
  server = app.listen(0);
});

afterAll(async () => {
  // Close the server to prevent Jest hanging
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Review Service', () => {
  test('GET /test should confirm service is running', async () => {
    const res = await request(server).get('/test');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Review service is running');
  });

  test('POST /add should add a review', async () => {
    const res = await request(server)
      .post('/add')
      .send(testReview);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Review added');
  });

  test('GET /:mediaType/:contentId should return reviews', async () => {
    // Add a review first
    await request(server).post('/add').send(testReview);
    // Now fetch reviews
    const res = await request(server).get(`/${testReview.mediaType}/${testReview.contentId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('review', testReview.review);
  });

  test('POST /delete should delete a review', async () => {
    const res = await request(server)
      .post('/delete')
      .send({ contentId: testReview.contentId, userId: testReview.userId });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Review deleted');
  });
});
