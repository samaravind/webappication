import { createUser, listUsers } from "@/lib/users";
import { validateUserInput } from "@/lib/validation";
import { getDatabaseErrorMessage, isUniqueViolation } from "@/lib/db";

export const runtime = "nodejs";

function apiError(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  try {
    const users = await listUsers();
    return Response.json({ users });
  } catch (error) {
    return apiError(getDatabaseErrorMessage(error));
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
    };
    const validation = validateUserInput(body);

    if (!validation.ok) {
      return Response.json({ errors: validation.errors }, { status: 400 });
    }

    const user = await createUser(validation.value);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json(
        { errors: { email: "That email address is already in use." } },
        { status: 409 },
      );
    }

    return apiError(getDatabaseErrorMessage(error));
  }
}
