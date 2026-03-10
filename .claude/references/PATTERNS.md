# Code Patterns

## Adding a New API Endpoint

1. Create route handler in `run/api/[feature].js`:
```javascript
router.get('/:id', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };
    try {
        if (!data.required_field)
            return managedError(new Error('Missing parameter'), req, res);
        const result = await db.getWorkspaceData(data.workspace.id, data.id, data.page, data.itemsPerPage);
        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});
```
2. Add data access function (optional) in `run/lib/firebase.js`
3. Register route in `run/api/index.js`: `router.use('/feature', require('./feature'));`
4. Add frontend method in `src/plugins/server.js`: `getFeature(id) { return this.get(`/feature/${id}`); }`
5. Create tests in `run/tests/api/[feature].test.js`

## Adding a New Model

1. Create model in `run/models/[Feature].js`:
```javascript
module.exports = (sequelize, DataTypes) => {
    class Feature extends Model {
        static associate(models) {
            Feature.belongsTo(models.Workspace);
        }
    }
    Feature.init({ /* fields */ }, { sequelize, modelName: 'Feature' });
    return Feature;
};
```
2. Create migration: `run/migrations/YYYYMMDDHHMMSS-create-feature.js`
3. Model auto-exports via `run/models/index.js`
4. Add CRUD functions in `run/lib/firebase.js`
5. Create mock in `run/tests/mocks/models/[Feature].js`

## Adding a New Background Job

1. Create job handler in `run/jobs/[jobName].js`:
```javascript
module.exports = async job => {
    const { workspaceId, data } = job.data;
    // Process job
};
```
2. Register in `run/jobs/index.js`: `jobName: require('./jobName')`
3. Enqueue: `await enqueue('jobName', `jobName-${id}`, { workspaceId, data });`

## Adding a Frontend Component

1. Create component in `src/components/[Feature].vue`
2. Use stores: `import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';`
3. Add route (if page) in `src/plugins/router.js`
4. Create test in `tests/unit/components/[Feature].spec.js`

## Writing API Tests

```javascript
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/models');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);
const db = require('../../lib/firebase');

describe('GET /feature/:id', () => {
    it('returns feature data', async () => {
        jest.spyOn(db, 'getFeature').mockResolvedValueOnce({ id: 1, name: 'test' });
        const res = await request.get('/api/feature/1')
            .send({ data: { workspace: { id: 1 } } });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('test');
    });
});
```

## Error Handling

```javascript
const { managedError, unmanagedError, managedWorkerError } = require('../lib/errors');

managedError(new Error('User message'), req, res);       // API: Expected/validation errors (400)
unmanagedError(error, req, next);                         // API: Unexpected exceptions (500, Sentry)
managedWorkerError(error, jobName, jobData, workerName);  // Jobs: Worker errors
```
