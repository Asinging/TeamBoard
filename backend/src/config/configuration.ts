export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  database: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/teamboard',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'teamboard-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  admin: {
    name: process.env.ADMIN_NAME ?? 'Super Admin',
    email: process.env.ADMIN_EMAIL ?? 'admin@teamboard.dev',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@1234',
  },
});
