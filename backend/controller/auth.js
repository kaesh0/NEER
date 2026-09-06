// Auth & Persona Controller
const userStore = require('../model/userStore');

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// Location from the Register/Login picker: { name, lat, lng }. Kept only when
// it looks complete — a half-formed location is worse than none.
function cleanLocation(location) {
  if (!location || !location.name || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
    return undefined;
  }
  return {
    name: String(location.name).trim(),
    lat: Number(location.lat),
    lng: Number(location.lng),
  };
}

exports.login = (req, res) => {
  const { emailOrMobile, password, persona } = req.body;
  const location = cleanLocation(req.body.location);

  if (!emailOrMobile) {
    return res.status(400).json({ error: 'EMAIL_OR_MOBILE_REQUIRED', message: 'Email or mobile number is required.' });
  }

  const existing = userStore.findByEmailOrMobile(emailOrMobile);

  let targetPersona = persona;
  if (!targetPersona && existing?.role) {
    targetPersona = existing.role;
  }
  if (!targetPersona) {
    targetPersona = 'fisherman';
  }

  // Normalise marine / maritime_operator
  if (targetPersona === 'maritime_operator') {
    targetPersona = 'marine';
  }

  let user;
  if (existing) {
    // If user selected a persona during login, update it
    user = userStore.updatePersona(existing.id, targetPersona);
    // A location chosen on the Login page updates the saved home location.
    if (location) {
      user = userStore.updateLocation(existing.id, location);
    }
  } else {
    // Register on the fly if new
    user = userStore.saveUser({
      name: emailOrMobile.includes('@') ? emailOrMobile.split('@')[0] : emailOrMobile,
      email: emailOrMobile.includes('@') ? emailOrMobile : '',
      mobile: !emailOrMobile.includes('@') ? emailOrMobile : '',
      password: password || '',
      role: targetPersona,
      location,
    });
  }

  return res.status(200).json({
    status: 'success',
    user: sanitizeUser(user),
    persona: user.role,
  });
};

exports.register = (req, res) => {
  const { name, email, mobile, password, role, persona } = req.body;
  const location = cleanLocation(req.body.location);

  const chosenRole = role || persona || 'fisherman';
  const normalizedRole = chosenRole === 'maritime_operator' ? 'marine' : chosenRole;

  if (!name) {
    return res.status(400).json({ error: 'NAME_REQUIRED', message: 'Full name is required.' });
  }

  const user = userStore.saveUser({
    name,
    email: email || '',
    mobile: mobile || '',
    password: password || '',
    role: normalizedRole,
    location,
  });

  return res.status(201).json({
    status: 'success',
    user: sanitizeUser(user),
    persona: user.role,
  });
};

exports.updatePersona = (req, res) => {
  const { identifier, id, persona } = req.body;

  if (!persona) {
    return res.status(400).json({ error: 'PERSONA_REQUIRED', message: 'Persona is required.' });
  }

  const normalized = persona === 'maritime_operator' ? 'marine' : persona;
  const user = userStore.updatePersona(id || identifier, normalized);

  if (!user) {
    return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
  }

  return res.status(200).json({
    status: 'success',
    user: sanitizeUser(user),
    persona: user.role,
  });
};

exports.getMe = (req, res) => {
  const identifier = req.query.identifier || req.query.id;

  if (!identifier) {
    return res.status(400).json({ error: 'IDENTIFIER_REQUIRED', message: 'User identifier or ID required.' });
  }

  const user = userStore.findById(identifier) || userStore.findByEmailOrMobile(identifier);
  if (!user) {
    return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found.' });
  }

  return res.status(200).json({
    status: 'success',
    user: sanitizeUser(user),
    persona: user.role,
  });
};
