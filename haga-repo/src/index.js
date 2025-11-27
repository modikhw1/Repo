const express = require('express');
const path = require('path');

const app = express();

// Parse JSON bodies (if needed later)
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// Simple health check
app.get('/api/health', (req, res) => {
	res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
	console.log(`Server running on http://${HOST}:${PORT}`);
});

module.exports = app;
