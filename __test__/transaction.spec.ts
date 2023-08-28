import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import request from 'supertest';
import { app } from '../src/app';

describe('Transactions Route', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    execSync('npm run knexRollback --all');
    execSync('npm run knexLatest');
  });

  it('Should be able to create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        text: 'New transaction',
        amount: 5000,
        type: 'credit',
      })
      .expect(201);
  });

  it('Should be able to list all transactions', async () => {
    const response = await request(app.server).post('/transactions').send({
      text: 'New transaction',
      amount: 5000,
      type: 'credit',
    });

    const cookies = response.get('Set-Cookie');

    const listResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200);

    expect(listResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    ]);
  });

  it('Should be able to list a specific transaction', async () => {
    const response = await request(app.server).post('/transactions').send({
      text: 'New transaction',
      amount: 5000,
      type: 'credit',
    });

    const cookies = response.get('Set-Cookie');

    const listResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200);

    const transactionId = await listResponse.body.transactions[0].id;

    const getTransactionsResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect(getTransactionsResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      })
    );
  });

  it('Should be able to get the summary', async () => {
    const response = await request(app.server).post('/transactions').send({
      text: 'Credit transaction',
      amount: 5000,
      type: 'credit',
    });

    const cookies = response.get('Set-Cookie');

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        text: 'Debit transaction',
        amount: 2000,
        type: 'debit',
      });

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200);

    expect(summaryResponse.body.transactions).toEqual({
      amount: 3000,
    });
  });
});
