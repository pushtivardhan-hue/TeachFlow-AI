import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.JWT_SECRET || "dev_secret";

export function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw, hash) {
  try {
    return bcrypt.compareSync(pw, hash || "");
  } catch {
    return false;
  }
}

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function sanitizeUser(u) {
  if (!u) return null;
  const { _id, passwordHash, ...rest } = u;
  return rest;
}
