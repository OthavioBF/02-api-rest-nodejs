import { FastifyInstance } from 'fastify';
import { knex } from 'knex';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { checkSessionId } from '../middleware/check-session-id';

export async function transactionsRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [checkSessionId],
    },
    async (req, res) => {
      const { sessionId } = req.cookies;

      const transactions = await knex('transactions')
        .where('session_id', sessionId)
        .select();

      return transactions;
    }
  );

  app.get(
    '/:id',
    {
      preHandler: [checkSessionId],
    },
    async (request, res) => {
      const { sessionId } = request.cookies;

      const getTransactionParam = z.object({
        id: z.string().uuid(),
      });

      const { id } = getTransactionParam.parse(request.params);

      const transaction = await knex('transactions')
        .where({
          session_id: sessionId,
          id,
        })
        .first();

      return { transaction };
    }
  );

  app.get(
    'summary',
    {
      preHandler: [checkSessionId],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies;

      const summary = await knex('transactions')
        .where({ session_id: sessionId })
        .sum('amount', { as: 'amount' })
        .first();

      return { summary };
    }
  );

  app.post('/', async (req, res) => {
    const transactionBodySchema = z.object({
      text: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    });

    const { text, amount, type } = transactionBodySchema.parse(req.body);

    let sessionId = req.cookies.sessionId;

    if (!sessionId) {
      sessionId = randomUUID();

      res.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
    }

    await knex('transactions')
      .insert({
        id: randomUUID(),
        text,
        amount: type === 'credit' ? amount : amount * -1,
        session_id: sessionId,
      })
      .returning('*');

    return res.status(201).send();
  });
}
