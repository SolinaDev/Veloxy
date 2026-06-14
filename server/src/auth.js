import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const requireAuth = process.env.REQUIRE_AUTH === "true";
let adminReady = false;

function ensureAdmin() {
  if (adminReady) return;

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
    });
  }

  adminReady = true;
}

function getBearerToken(request) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function getRequestedUserId(request) {
  return (
    request.params?.userId ??
    request.body?.userId ??
    request.body?.createdBy ??
    request.query?.userId
  );
}

export async function verifyFirebaseUser(request, reply) {
  if (!requireAuth) return;

  const token = getBearerToken(request);
  if (!token) {
    return reply.code(401).send({
      error: "missing_auth_token",
    });
  }

  try {
    ensureAdmin();
    const decodedToken = await getAuth().verifyIdToken(token);
    request.user = decodedToken;

    const requestedUserId = getRequestedUserId(request);
    if (requestedUserId && requestedUserId !== decodedToken.uid) {
      return reply.code(403).send({
        error: "user_mismatch",
      });
    }
  } catch (error) {
    request.log.warn({ error }, "Invalid Firebase token");
    return reply.code(401).send({
      error: "invalid_auth_token",
    });
  }
}
