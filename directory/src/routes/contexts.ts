import { contextData } from '../data/contexts';

export const contexts = async (fastify) => {
  fastify.get('/contexts', async () => {
    return contextData;
  });
};
