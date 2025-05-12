const request = require('supertest');
const mongoose = require('mongoose');
const { app, connectToDatabase } = require('../index');
const { MongoMemoryServer } = require('mongodb-memory-server');

const testReview = {
  userId: 'testuser',
  contentId: 'testcontent',
  username: 'TestUser',
  review: 'Great movie!',
  spoilerContains: false,
  mediaType: 'movie',
};

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await connectToDatabase(uri);
});

afterAll(async () => {
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
    const res = await request(app).get('/test');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Review service is running');
  });

  test('POST /add should add a review', async () => {
    const res = await request(app)
      .post('/add')
      .send(testReview);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Review added');
  });

  test('GET /:mediaType/:contentId should return reviews', async () => {
    // Add a review first
    await request(app).post('/add').send(testReview);
    // Now fetch reviews
    const res = await request(app).get(`/${testReview.mediaType}/${testReview.contentId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('review', testReview.review);
  });

  test('POST /delete should delete a review', async () => {
    const res = await request(app)
      .post('/delete')
      .send({ contentId: testReview.contentId, userId: testReview.userId });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Review deleted');
  });
});
