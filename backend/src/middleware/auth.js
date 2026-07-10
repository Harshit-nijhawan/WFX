import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'wfx_erp_jwt_secret_key_987654';

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired session token.' });
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email
      };
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized: Session token is missing.' });
  }
};
