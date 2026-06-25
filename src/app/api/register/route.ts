import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = registerSchema.parse(await request.json());
    const passwordHash = await hashPassword(parsed.password);

    const user = await db.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        role: "CUSTOMER",
        customer: {
          create: {
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone,
          },
        },
      },
    });

    return Response.json({ ok: true, userId: user.id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ ok: false, error: "An account with this email already exists." }, { status: 409 });
    }

    if (error instanceof z.ZodError) {
      return Response.json({ ok: false, error: error.issues[0]?.message ?? "Invalid registration details." }, { status: 400 });
    }

    return Response.json({ ok: false, error: "Registration failed." }, { status: 500 });
  }
}
