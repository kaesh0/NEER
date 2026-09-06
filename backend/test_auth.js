const assert = require('node:assert/strict');
const authController = require('./controller/auth');
const userStore = require('./model/userStore');

function createMockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('Testing Backend Auth Controller & Model...');

  // Test 1: Register new user
  {
    const req = {
      body: {
        name: 'Anita Devi',
        email: 'anita@test.com',
        mobile: '9998887777',
        role: 'authority'
      }
    };
    const res = createMockRes();
    authController.register(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.persona, 'authority');
    assert.equal(res.body.user.name, 'Anita Devi');
    console.log('✓ PASS: Registration stores user and role in backend');
  }

  // Test 2: Login with persona selection
  {
    const req = {
      body: {
        emailOrMobile: 'anita@test.com',
        password: 'anypassword',
        persona: 'marine' // User chooses marine upon login
      }
    };
    const res = createMockRes();
    authController.login(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.persona, 'marine');
    assert.equal(res.body.user.role, 'marine');
    console.log('✓ PASS: Login updates and persists selected persona in backend');
  }

  // Test 3: Retrieve me
  {
    const req = {
      query: { identifier: 'anita@test.com' }
    };
    const res = createMockRes();
    authController.getMe(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.persona, 'marine');
    console.log('✓ PASS: GetMe returns persisted user and persona');
  }

  // Test 4: Update persona
  {
    const req = {
      body: {
        identifier: 'anita@test.com',
        persona: 'fisherman'
      }
    };
    const res = createMockRes();
    authController.updatePersona(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.persona, 'fisherman');
    console.log('✓ PASS: UpdatePersona successfully updates user preference');
  }

  // Test 5: Verify persistent lookup from userStore
  {
    const user = userStore.findByEmailOrMobile('anita@test.com');
    assert.equal(user.role, 'fisherman');
    console.log('✓ PASS: userStore persistently holds updated persona');
  }

  console.log('\n========================================');
  console.log('ALL 5/5 BACKEND AUTH TESTS PASSED!');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
