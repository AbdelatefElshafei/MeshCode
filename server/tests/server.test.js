const request = require('supertest');

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

jest.mock('axios');

const app = require('../index');

describe('Server API Endpoints', () => {
    beforeEach(() => {
        mockQuery.mockReset();
        mockRelease.mockReset();
        mockConnect.mockClear();
    });

    it('GET /problems should return a list of problems', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ c: 1 }] }) 
            .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Problem' }] });


        mockQuery.mockResolvedValue({ rows: [] }); 
        
        
        mockQuery.mockImplementation((sql, params) => {
            if (sql.includes('SELECT id, title, description')) {
                return Promise.resolve({ 
                    rows: [
                        { id: 1, title: 'Test Problem', description: 'Desc', gradient: 'grad', starter_code: 'code' }
                    ] 
                });
            }
            if (sql.includes('SELECT COUNT(*)')) {
                return Promise.resolve({ rows: [{ c: 5 }] }); 
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
        
        const res = await request(app).get('/workers/count');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('count');
        expect(typeof res.body.count).toBe('number');
    });
});
