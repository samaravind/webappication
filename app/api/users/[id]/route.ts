import { deleteUser, updateUser } from "@/lib/users";
import { getDatabaseErrorMessage, isUniqueViolation } from "@/lib/db";
import { validateUserInput } from "@/lib/validation";

export const runtime = "nodejs";

async function getUserId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId < 1) {
    return null;
  }

  return userId;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId(params);

  if (!userId) {
    return Response.json({ error: "Invalid user id." }, { status: 400 });
  }

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

    const updatedUser = await updateUser(userId, validation.value);

    if (!updatedUser) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({ user: updatedUser });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json(
        { errors: { email: "That email address is already in use." } },
        { status: 409 },
      );
    }

    return Response.json(
      { error: getDatabaseErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId(params);

  if (!userId) {
    return Response.json({ error: "Invalid user id." }, { status: 400 });
  }

  try {
    const deletedUser = await deleteUser(userId);

    if (!deletedUser) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({ user: deletedUser });
  } catch (error) {
    return Response.json(
      { error: getDatabaseErrorMessage(error) },
      { status: 500 },
    );
  }
}
