// Persistent User & Persona Store
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'mocks', 'users_db.json');

function loadUsers() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading users DB:', err.message);
  }
  return [
    {
      id: 'u-default-1',
      name: 'Ramesh Kumar',
      email: 'ramesh@example.com',
      mobile: '9876543210',
      password: 'password123',
      role: 'fisherman'
    }
  ];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving users DB:', err.message);
  }
}

let usersCache = loadUsers();

const userStore = {
  findByEmailOrMobile(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    return usersCache.find(
      (u) => (u.email && u.email.toLowerCase() === clean) || (u.mobile && u.mobile === clean)
    ) || null;
  },

  findById(id) {
    return usersCache.find((u) => u.id === id) || null;
  },

  saveUser(userData) {
    const existingIndex = usersCache.findIndex(
      (u) => (userData.email && u.email?.toLowerCase() === userData.email.toLowerCase()) ||
             (userData.mobile && u.mobile === userData.mobile)
    );

    const user = {
      id: userData.id || `u-${Date.now()}`,
      name: userData.name || 'User',
      email: userData.email || '',
      mobile: userData.mobile || '',
      password: userData.password || '',
      role: userData.role || userData.persona || 'fisherman',
      location: userData.location || null,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      usersCache[existingIndex] = { ...usersCache[existingIndex], ...user };
    } else {
      usersCache.push(user);
    }

    saveUsers(usersCache);
    return user;
  },

  updatePersona(identifierOrId, persona) {
    const user = usersCache.find(
      (u) => u.id === identifierOrId ||
             (u.email && u.email.toLowerCase() === identifierOrId.toLowerCase()) ||
             (u.mobile && u.mobile === identifierOrId)
    );

    if (!user) return null;
    user.role = persona;
    user.updatedAt = new Date().toISOString();
    saveUsers(usersCache);
    return user;
  },

  updateLocation(identifierOrId, location) {
    const user = usersCache.find(
      (u) => u.id === identifierOrId ||
             (u.email && u.email.toLowerCase() === identifierOrId.toLowerCase()) ||
             (u.mobile && u.mobile === identifierOrId)
    );

    if (!user) return null;
    user.location = location;
    user.updatedAt = new Date().toISOString();
    saveUsers(usersCache);
    return user;
  },

  getAll() {
    return usersCache;
  }
};

module.exports = userStore;
