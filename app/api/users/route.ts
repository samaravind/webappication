import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALPHA_NAME_REGEX = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(name: string) {
  if (!name) {
    return 'Name is required.';
  }

  if (!ALPHA_NAME_REGEX.test(name)) {
    return 'Name can contain only alphabets and spaces.';
  }

  return '';
}

function validateEmail(email: string) {
  if (!email) {
    return 'Email is required.';
  }

  if (!EMAIL_REGEX.test(email)) {
    return 'Enter a valid email address.';
  }

  return '';
}

function validateNewUserInput(input: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
}) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';

  const nameError = validateName(name);
  if (nameError) {
    return { error: nameError };
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }

  if (!phone) {
    return { error: 'Phone number is required.' };
  }

  if (!/^\d{10}$/.test(phone)) {
    return { error: 'Phone number must be exactly 10 digits' };
  }

  return { user: { name, email, phone } };
}

function validateUserUpdateInput(input: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
}) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';

  const nameError = validateName(name);
  if (nameError) {
    return { error: nameError };
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }

  if (!phone) {
    return { error: 'Phone number is required.' };
  }

  if (!/^\d{10}$/.test(phone)) {
    return { error: 'Phone number must be exactly 10 digits' };
  }

  return { user: { name, email, phone } };
}

function getApiErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Database request failed';
  }

  if (error.message.includes('DATABASE_URL')) {
    return 'DATABASE_URL is not configured. Add it to .env.local and restart the dev server.';
  }

  if (error.message.includes('password authentication failed')) {
    return 'PostgreSQL password is wrong in DATABASE_URL. Update .env.local with the password you set during PostgreSQL installation, then restart the dev server.';
  }

  if (error.message.includes('database "user_management" does not exist')) {
    return 'Database user_management does not exist. Create it in pgAdmin, then try again.';
  }

  return error.message;
}

function isDuplicateEmailError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

export async function GET() {
  try {
    const { listUsers } = await import('@/lib/users');
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error loading users:', error);
    return NextResponse.json(
      { error: getApiErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { createUser } = await import('@/lib/users');
    const body = await request.json();
    const validation = validateNewUserInput(body);

    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const user = await createUser(validation.user);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);

    if (isDuplicateEmailError(error)) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: getApiErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { updateUser } = await import('@/lib/users');
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = validateUserUpdateInput(body);

    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const user = await updateUser(id, validation.user);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);

    if (isDuplicateEmailError(error)) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: getApiErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { deleteUser } = await import('@/lib/users');
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    const deleted = await deleteUser(id);

    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: getApiErrorMessage(error) },
      { status: 500 },
    );
  }
}
