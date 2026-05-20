import "../config/env.js";
import { auth } from "../modules/auth/auth.js";
import { prisma } from "../modules/auth/services/db.service.js";
import { ENV } from "../config/env.js";

async function main() {
  const email = `test-user-${Date.now()}@example.com`;
  const password = "SuperPassword123!";

  console.log("Creating user via Better Auth...");
  const userRes = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: "Test Better Auth User",
    },
  });
  console.log("User created:", userRes);

  console.log("Signing in via Better Auth...");
  const loginRes = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });
  console.log("Login result:", loginRes);

  // Query sessions and accounts table for this user
  const dbSessions = await prisma.session.findMany({
    where: { userId: loginRes.user.id },
  });
  console.log("Database Session Records:", dbSessions);

  const dbAccounts = await prisma.account.findMany({
    where: { userId: loginRes.user.id },
  });
  console.log("Database Account Records:", dbAccounts);

  // Call auth.api.getSession with different headers
  const tokenCookie = `better-auth.session_token=${loginRes.token}`;
  console.log("Testing auth.api.getSession with Cookie:", tokenCookie);

  const headersObj = new Headers();
  headersObj.set("Cookie", tokenCookie);

  const sessionRes = await auth.api.getSession({
    headers: headersObj,
  });
  console.log("Session result with Headers object:", sessionRes);

  const sessionResPlain = await auth.api.getSession({
    headers: {
      Cookie: tokenCookie,
    },
  });
  console.log("Session result with plain object cookies:", sessionResPlain);

  const sessionResBearer = await auth.api.getSession({
    headers: {
      Authorization: `Bearer ${loginRes.token}`,
    },
  });
  console.log("Session result with Bearer token:", sessionResBearer);

  // Direct auth.handler test
  console.log("Testing direct auth.handler...");
  const testReq = new Request(`${ENV.BETTER_AUTH_URL}/api/auth/get-session`, {
    headers: {
      Cookie: tokenCookie,
    },
  });
  const handlerRes = await auth.handler(testReq);
  console.log("auth.handler Response Status:", handlerRes.status);
  try {
    console.log("auth.handler Response Body:", await handlerRes.json());
  } catch (err: any) {
    console.log("auth.handler Response Text:", await handlerRes.text());
  }

  // Test sign-in via auth.handler to inspect cookies
  console.log("Testing sign-in via auth.handler...");
  const signInReq = new Request(
    `${ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );
  const signInRes = await auth.handler(signInReq);
  console.log("SignIn Response Status:", signInRes.status);
  console.log("SignIn Response Headers:", [...signInRes.headers.entries()]);
}

main().catch(console.error);
