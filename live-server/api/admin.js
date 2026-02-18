const express = require('express');
const router = express.Router();
const os = require('os');

// In-memory stores for demo (replace with DB in production)
let featureFlags = [];
let deploys = [];
let apiKeys = [];
let plugins = [];
let webhooks = [];
let broadcasts = [];

// Middleware: Require admin (stub, replace with real auth)
function requireAdmin(req, res, next) {
  // Example: check for Bearer token
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' });
  // TODO: Validate token
  next();
}

router.use(requireAdmin);

// --- System Tab ---
// 1. Performance Metrics
router.get('/api/admin/performance', (req, res) => {
  res.json({
    cpu: os.loadavg()[0],
    memory: process.memoryUsage().heapUsed,
    uptime: process.uptime(),
    reqPerMin: Math.floor(Math.random() * 100), // Stub
    success: true
  });
});

// 2. Feature Flags
router.get('/api/admin/feature-flags', (req, res) => res.json(featureFlags));
router.post('/api/admin/feature-flags', (req, res) => {
  const { key, enabled, description } = req.body;
  const idx = featureFlags.findIndex(f => f.key === key);
  if (idx >= 0) featureFlags[idx] = { key, enabled, description };
  else featureFlags.push({ key, enabled, description });
  res.json({ success: true });
});
router.delete('/api/admin/feature-flags/:key', (req, res) => {
  featureFlags = featureFlags.filter(f => f.key !== req.params.key);
  res.json({ success: true });
});

// 3. Deploy/Rollback
router.get('/api/admin/deploys', (req, res) => res.json(deploys));
router.post('/api/admin/deploy', (req, res) => {
  const id = Date.now().toString();
  deploys.push({ id, status: 'deploying', startedAt: new Date().toISOString() });
  res.json({ success: true, id });
});
router.post('/api/admin/rollback', (req, res) => {
  const { deployId } = req.body;
  // Mark as rolled back (stub)
  deploys = deploys.map(d => d.id === deployId ? { ...d, status: 'rolled-back', finishedAt: new Date().toISOString() } : d);
  res.json({ success: true });
});

// 4. API Key Management
router.get('/api/admin/api-keys', (req, res) => res.json(apiKeys));
router.post('/api/admin/api-keys', (req, res) => {
  const key = Math.random().toString(36).slice(2);
  apiKeys.push({ key, createdAt: new Date().toISOString(), revoked: false });
  res.json({ success: true, key });
});
router.delete('/api/admin/api-keys/:key', (req, res) => {
  apiKeys = apiKeys.map(k => k.key === req.params.key ? { ...k, revoked: true } : k);
  res.json({ success: true });
});

// --- Extensibility Tab ---
// 1. Plugin Management
router.get('/api/admin/plugins', (req, res) => res.json(plugins));
router.post('/api/admin/plugins/install', (req, res) => {
  const { name } = req.body;
  plugins.push({ name, enabled: false, version: '1.0.0' });
  res.json({ success: true });
});
router.post('/api/admin/plugins/enable', (req, res) => {
  const { name } = req.body;
  plugins = plugins.map(p => p.name === name ? { ...p, enabled: true } : p);
  res.json({ success: true });
});
router.post('/api/admin/plugins/disable', (req, res) => {
  const { name } = req.body;
  plugins = plugins.map(p => p.name === name ? { ...p, enabled: false } : p);
  res.json({ success: true });
});
router.delete('/api/admin/plugins/:name', (req, res) => {
  plugins = plugins.filter(p => p.name !== req.params.name);
  res.json({ success: true });
});

// 2. Webhook/Automation Triggers
router.get('/api/admin/webhooks', (req, res) => res.json(webhooks));
router.post('/api/admin/webhooks', (req, res) => {
  const { url, event } = req.body;
  const id = Date.now().toString();
  webhooks.push({ id, url, event, enabled: true });
  res.json({ success: true, id });
});
router.post('/api/admin/webhooks/enable', (req, res) => {
  const { id } = req.body;
  webhooks = webhooks.map(w => w.id === id ? { ...w, enabled: true } : w);
  res.json({ success: true });
});
router.post('/api/admin/webhooks/disable', (req, res) => {
  const { id } = req.body;
  webhooks = webhooks.map(w => w.id === id ? { ...w, enabled: false } : w);
  res.json({ success: true });
});
router.delete('/api/admin/webhooks/:id', (req, res) => {
  webhooks = webhooks.filter(w => w.id !== req.params.id);
  res.json({ success: true });
});

// --- Broadcast Tab ---
// 1. Scheduling
router.post('/api/admin/broadcast/schedule', (req, res) => {
  const { message, sendAt } = req.body;
  broadcasts.push({ message, sendAt, id: Date.now().toString() });
  res.json({ success: true });
});
// 2. Targeting
router.post('/api/admin/broadcast/target', (req, res) => {
  const { message, segment } = req.body;
  broadcasts.push({ message, segment, id: Date.now().toString() });
  res.json({ success: true });
});

module.exports = router;
