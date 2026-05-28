import "../config/env.js";
import { ENV } from "../config/env.js";
import { auth } from "../modules/auth/auth.js";
import { prisma } from "../modules/auth/services/db.service.js";
import { writeFile } from "node:fs/promises";

async function main() {
  const accountsToCreate = [
    {
      name: "Sinh vien Mot",
      email: "student1@fpt.edu.vn",
      password: "StudentPassword123!",
      role: "STUDENT",
    },
    {
      name: "Sinh vien Hai",
      email: "student2@fpt.edu.vn",
      password: "StudentPassword123!",
      role: "STUDENT",
    },
    {
      name: "Giang vien Mot",
      email: "lecturer1@fpt.edu.vn",
      password: "LecturerPassword123!",
      role: "LECTURER",
    },
    {
      name: "Giang vien Hai",
      email: "lecturer2@fpt.edu.vn",
      password: "LecturerPassword123!",
      role: "LECTURER",
    },
    {
      name: "Quan tri vien",
      email: "admin@fpt.edu.vn",
      password: "AdminPassword123!",
      role: "ADMIN",
    },
  ];

  const results: any[] = [];

  for (const acc of accountsToCreate) {
    console.log(`\n--------------------------------------------`);
    console.log(`Processing account: ${acc.email} (${acc.role})...`);

    // Clean up existing user if any, to ensure a fresh, repeatable state
    const existing = await prisma.user.findUnique({
      where: { email: acc.email },
    });
    
    if (existing) {
      console.log(`User ${acc.email} already exists. Deleting to ensure clean registration...`);
      try {
        await prisma.session.deleteMany({
          where: { userId: existing.id },
        });
        await prisma.account.deleteMany({
          where: { userId: existing.id },
        });
        await prisma.user.delete({
          where: { email: acc.email },
        });
        console.log(`Deleted user ${acc.email}`);
      } catch (delErr: any) {
        console.warn(`Warning deleting existing user:`, delErr.message);
      }
    }

    // Call API to Sign Up
    console.log(`Calling Better Auth signUpEmail API for ${acc.email}...`);
    const signupRes = await auth.api.signUpEmail({
      body: {
        email: acc.email,
        password: acc.password,
        name: acc.name,
      },
    });

    if (!signupRes) {
      throw new Error(`Failed to sign up ${acc.email}: signup API returned empty response`);
    }

    console.log(`✅ Successfully signed up via API. User ID: ${signupRes.user.id}`);

    // Update role using Prisma
    console.log(`Assigning role ${acc.role} in database...`);
    const updatedUser = await prisma.user.update({
      where: { email: acc.email },
      data: { role: acc.role },
    });
    console.log(`✅ Role successfully set to ${updatedUser.role}`);

    // Call API to Sign In to verify the credentials actually work
    console.log(`Verifying login via signInEmail API...`);
    const signInReq = new Request(`${ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: acc.email,
        password: acc.password,
      }),
    });
    const signinRes = await auth.handler(signInReq);
    const signinBody = await signinRes.text();

    if (signinRes.status !== 200) {
      throw new Error(`Failed to sign in ${acc.email}: ${signinBody}`);
    }

    const parsedSigninBody = JSON.parse(signinBody) as { user?: { id?: string } };
    console.log(`✅ Login verification successful! User ID in session: ${parsedSigninBody.user?.id || "unknown"}`);

    results.push({
      name: acc.name,
      email: acc.email,
      password: acc.password,
      role: acc.role,
      userId: updatedUser.id,
    });
  }

  // Write JSON to the root directory
  const rootPath = "e:\\FPT\\Semester_7\\SWD392\\chatbot-rag-fptu\\credentials.json";
  const jsonContent = JSON.stringify({ accounts: results }, null, 2);
  await writeFile(rootPath, jsonContent, "utf-8");
  console.log(`\n============================================`);
  console.log(`✅ All accounts successfully created and verified!`);
  console.log(`📝 Login credentials written to: ${rootPath}`);
}

main()
  .catch((err) => {
    console.error("Fatal Error running script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
