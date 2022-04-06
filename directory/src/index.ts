import Fastify, { FastifyInstance } from 'fastify';
import { root } from './routes/root';
import { apps, app, search } from './routes/apps';
import { intents } from './routes/intents';
import { contexts } from './routes/contexts';
import { DirectoryPort } from './config';

const server: FastifyInstance = Fastify({
  logger: true,
});

server.register(root);

server.register(apps);

server.register(app);

server.register(search);

server.register(intents);

server.register(contexts);

const start = async () => {
  try {
    await server.listen(DirectoryPort);

    // const address = server.server.address()
    //  const port = typeof address === 'string' ? address : address.port
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
