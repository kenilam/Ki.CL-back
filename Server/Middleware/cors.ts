import cors from 'cors';

const origins = process.env.CORS_ORIGINS?.split(',') || [];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, Postman, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }

    if (origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
});
