'use strict';

const express = require('express');
const path = require('path');
const incidentRoutes = require('./routes/incidents');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Serves dashboard.html and any other static assets from this directory.
app.use(express.static(path.join(__dirname)));

app.use('/api', incidentRoutes);

app.listen(PORT, () => {
  console.log(`Stadium Command Center running on port ${PORT}`);
});
