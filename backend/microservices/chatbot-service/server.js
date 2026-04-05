const { startService } = require('../common/start-service');
const chatbotRoutes = require('../../src/routes/chatbot.routes');

startService({
  serviceName: 'chatbot-service',
  portEnv: 'CHATBOT_SERVICE_PORT',
  defaultPort: 5008,
  routes: [{ path: '/api/chatbot', router: chatbotRoutes }]
});
