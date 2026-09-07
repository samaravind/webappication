export type UserInput = {
  name: string;
  email: string;
  phone: string;
};

export type ValidationResult =
  | { ok: true; value: UserInput }
  | { ok: false; errors: Partial<Record<keyof UserInput, string>> };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d+$/;

export function validateUserInput(input: Partial<UserInput>): ValidationResult {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const phone = input.phone?.trim() ?? "";
  const errors: Partial<Record<keyof UserInput, string>> = {};

  if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (email.length === 0) {
    errors.email = "Email is required.";
  } else if (!email.includes("@")) {
    errors.email = "Invalid email format. Email must include @.";
  } else if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (phone.length === 0) {
    errors.phone = "Phone number is required.";
  } else if (!phonePattern.test(phone)) {
    errors.phone = "Phone number must contain numbers only.";
  } else if (phone.length !== 10) {
    errors.phone = "Phone number must be exactly 10 digits.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { name, email, phone } };
}
