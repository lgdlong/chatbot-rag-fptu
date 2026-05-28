import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type RootCredential = {
  name: string;
  email: string;
  password: string;
  role: "STUDENT" | "LECTURER" | "ADMIN";
  userId: string;
};

type RootCredentialsFile = {
  accounts: RootCredential[];
};

const devLoginEmails = ["student1@fpt.edu.vn", "lecturer1@fpt.edu.vn", "admin@fpt.edu.vn"] as const;

export async function GET() {
  try {
    const credentialsPath = path.resolve(process.cwd(), "../credentials.json");
    const raw = await readFile(credentialsPath, "utf-8");
    const parsed = JSON.parse(raw) as RootCredentialsFile;

    const accounts = parsed.accounts
      .filter((account) => devLoginEmails.includes(account.email as (typeof devLoginEmails)[number]))
      .map((account) => ({
        role: account.role.toLowerCase() as "student" | "lecturer" | "admin",
        name: account.name,
        email: account.email,
        password: account.password,
      }));

    return NextResponse.json({ accounts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { accounts: [], error: error instanceof Error ? error.message : "Failed to read dev login accounts" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
