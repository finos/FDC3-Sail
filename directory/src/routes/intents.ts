import { intentData } from '../data/intents';

export const intents = async (fastify) => {
  fastify.get('/intents', async () => {
    return intentData;
  });
};
