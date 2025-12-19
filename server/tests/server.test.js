const request = require('supertest');

// Mock pg before requiring the app
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(() => Promise.resolve({ query: mockQuery, release: mockRelease }));
const mockPool = {
    connect: mockConnect,
    query: mockQuery,
    on: jest.fn(),
};

jest.mock('pg', () => {
    return { Pool: jest.fn(() => mockPool) };
});

// Mock axios to avoid external calls
jest.mock('axios');

const app = require('../index');

describe('Server API Endpoints', () => {
    beforeEach(() => {
        mockQuery.mockReset();
        mockRelease.mockReset();
        mockConnect.mockClear();
    });

    it('GET /problems should return a list of problems', async () => {
        // Mock the database response for seed check and problems fetch
        mockQuery
            // First calls might be ensuring tables or seeding, mock them broadly or specifically
            .mockResolvedValueOnce({ rows: [{ c: 1 }] }) // seedProblemsIfEmpty check: count > 0
            .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Problem' }] }); // actual fetch

        // Wait for the server to process async initialization if any
        // In this case, initialization is fire-and-forget, but for the request it matters
        
        // However, the /problems endpoint calls seedAdditionalProblemsIfNeeded
        // which calls pool.connect().
        
        // Let's refine the mock to handle multiple calls
        mockQuery.mockResolvedValue({ rows: [] }); // Default
        
        // For the specific test case
        mockQuery.mockImplementation((sql, params) => {
            if (sql.includes('SELECT id, title, description')) {
                return Promise.resolve({ 
                    rows: [
                        { id: 1, title: 'Test Problem', description: 'Desc', gradient: 'grad', starter_code: 'code' }
                    ] 
                });
            }
            if (sql.includes('SELECT COUNT(*)')) {
                return Promise.resolve({ rows: [{ c: 5 }] }); // Pretend we have problems
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });

        const res = await request(app).get('/problems');
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('problems');
        expect(Array.isArray(res.body.problems)).toBe(true);
        expect(res.body.problems.length).toBeGreaterThan(0);
        expect(res.body.problems[0].title).toBe('Test Problem');
    });

    it('GET /workers/count should return worker count', async () => {
        // Mock getActiveWorkers behavior (it uses axios)
        // Since getActiveWorkers is internal, we can't mock it directly easily without rewiring,
        // but we can mock axios/net.
        // However, for simplicity, let's assume no workers are active if axios fails or returns nothing
        
        const res = await request(app).get('/workers/count');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('count');
        expect(typeof res.body.count).toBe('number');
    });
});
