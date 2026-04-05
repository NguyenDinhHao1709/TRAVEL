require('dotenv').config();
const { createServiceApp } = require('./create-service-app');

const startService = ({
  serviceName,
  portEnv,
  defaultPort,
  routes = []
}) => {
  const app = createServiceApp();
  const port = Number(process.env[portEnv] || defaultPort);

  app.get('/api/health', (req, res) => {
    res.json({ service: serviceName, status: 'ok' });
  });

  for (const route of routes) {
    app.use(route.path, route.router);
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });

  app.listen(port, () => {
    console.log(`${serviceName} running at http://localhost:${port}`);
  });
};

module.exports = {
  startService
};