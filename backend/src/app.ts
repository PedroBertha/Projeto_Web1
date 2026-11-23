import express from 'express';
import helmet from 'helmet';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

// Verifica o processo HTTP; ainda nao verifica conexao com o banco.
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// As rotas dos modulos serao registradas antes do tratamento de 404.
app.use((_req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada.'));
});

app.use(errorHandler);
