import 'dotenv/config'; // load .env before anything reads process.env
import express from 'express';
import cors from 'cors';

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Public: lets Railway (and you) check the server is up
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Any error thrown in a route ends up here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});