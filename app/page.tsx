"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { validateUserInput } from "@/lib/validation";
import type { User } from "@/lib/users";

type FormErrors = Partial<Record<"name" | "email" | "phone", string>>;
type ActionMenuPosition = {
  left: number;
  top: number;
};

const ACTION_MENU_WIDTH = 144;
const ACTION_MENU_HEIGHT = 124;
const ACTION_MENU_GAP = 8;
const VIEWPORT_PADDING = 8;

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const userCountLabel = useMemo(() => {
    return users.length === 1 ? "1 user" : `${users.length} users`;
  }, [users.length]);
  const hasEmailError = Boolean(errors.email);
  const hasPhoneError = Boolean(errors.phone);

  async function fetchUsers() {
    const response = await fetch("/api/users");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Could not load users.");
    }

    return data.users as User[];
  }

  async function loadUsers() {
    setIsLoading(true);
    setStatusMessage("");

    try {
      setUsers(await fetchUsers());
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not load users.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetchUsers()
      .then((loadedUsers) => {
        if (isMounted) {
          setUsers(loadedUsers);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setStatusMessage(
            error instanceof Error ? error.message : "Could not load users.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (openActionMenuId === null) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setOpenActionMenuId(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", closeActionMenu);
    window.addEventListener("scroll", closeActionMenu, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", closeActionMenu);
      window.removeEventListener("scroll", closeActionMenu, true);
    };
  }, [openActionMenuId]);

  function closeActionMenu() {
    setOpenActionMenuId(null);
    setActionMenuPosition(null);
  }

  function toggleActionMenu(
    userId: number,
    trigger: HTMLButtonElement,
  ) {
    if (openActionMenuId === userId) {
      closeActionMenu();
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const preferredLeft = triggerRect.right + ACTION_MENU_GAP;
    const left = Math.min(
      preferredLeft,
      window.innerWidth - ACTION_MENU_WIDTH - VIEWPORT_PADDING,
    );
    const top = Math.min(
      Math.max(
        triggerRect.top + triggerRect.height / 2 - ACTION_MENU_HEIGHT / 2,
        VIEWPORT_PADDING,
      ),
      window.innerHeight - ACTION_MENU_HEIGHT - VIEWPORT_PADDING,
    );

    setActionMenuPosition({ left, top });
    setOpenActionMenuId(userId);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateUserInput({ name, email, phone });
    if (!validation.ok) {
      setErrors(validation.errors);
      setStatusMessage("");
      return;
    }

    setErrors({});
    setStatusMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.value),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
          return;
        }

        throw new Error(data.error ?? "Could not add user.");
      }

      setUsers((currentUsers) => [data.user, ...currentUsers]);
      setSelectedUser(data.user);
      setName("");
      setEmail("");
      setPhone("");
      setStatusMessage(`${data.user.name} was added.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not add user.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!userToDelete) {
      return;
    }

    setDeletingId(userToDelete.id);
    setStatusMessage("");

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete user.");
      }

      setUsers((currentUsers) =>
        currentUsers.filter((user) => user.id !== userToDelete.id),
      );
      setSelectedUser((currentUser) =>
        currentUser?.id === userToDelete.id ? null : currentUser,
      );
      setUserToDelete(null);
      setStatusMessage(`${data.user.name} was deleted.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not delete user.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone);
    setEditErrors({});
    setStatusMessage("");
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    const validation = validateUserInput({
      name: editName,
      email: editEmail,
      phone: editPhone,
    });

    if (!validation.ok) {
      setEditErrors(validation.errors);
      setStatusMessage("");
      return;
    }

    setEditErrors({});
    setStatusMessage("");
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.value),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setEditErrors(data.errors);
          return;
        }

        throw new Error(data.error ?? "Could not update user.");
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === data.user.id ? data.user : user,
        ),
      );
      setSelectedUser((currentUser) =>
        currentUser?.id === data.user.id ? data.user : currentUser,
      );
      setEditingUser(null);
      setStatusMessage(`${data.user.name} was updated.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not update user.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function handlePhoneChange(value: string) {
    setPhone(value.replace(/\D/g, "").slice(0, 10));
  }

  function handleEditPhoneChange(value: string) {
    setEditPhone(value.replace(/\D/g, "").slice(0, 10));
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-5 py-8 text-slate-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-teal-700">
              User Management
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Users
            </h1>
          </div>
          <div className="text-sm font-medium text-slate-600">
            {userCountLabel}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Add User
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Store a user in PostgreSQL with a unique email address.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 rounded-md border border-slate-300 px-3 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                placeholder="Ada Lovelace"
                disabled={isSubmitting}
                suppressHydrationWarning
              />
              {errors.name ? (
                <span className="text-sm font-normal text-red-600">
                  {errors.name}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`h-11 rounded-md border px-3 text-base text-slate-950 outline-none transition focus:ring-2 ${
                  hasEmailError
                    ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                    : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"
                }`}
                placeholder="ada@example.com"
                disabled={isSubmitting}
                aria-invalid={hasEmailError}
                aria-describedby={hasEmailError ? "email-error" : undefined}
                suppressHydrationWarning
              />
              {errors.email ? (
                <span
                  id="email-error"
                  className="border-l-2 border-red-500 pl-2 text-sm font-normal text-red-600"
                >
                  {errors.email}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Phone Number
              <input
                value={phone}
                onChange={(event) => handlePhoneChange(event.target.value)}
                inputMode="numeric"
                maxLength={10}
                className={`h-11 rounded-md border px-3 text-base text-slate-950 outline-none transition focus:ring-2 ${
                  hasPhoneError
                    ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                    : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"
                }`}
                placeholder="9876543210"
                disabled={isSubmitting}
                aria-invalid={hasPhoneError}
                aria-describedby={hasPhoneError ? "phone-error" : undefined}
                suppressHydrationWarning
              />
              {errors.phone ? (
                <span
                  id="phone-error"
                  className="border-l-2 border-red-500 pl-2 text-sm font-normal text-red-600"
                >
                  {errors.phone}
                </span>
              ) : null}
            </label>

            <button
              type="submit"
              className="h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmitting}
              suppressHydrationWarning
            >
              {isSubmitting ? "Adding..." : "Add user"}
            </button>

            {statusMessage ? (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {statusMessage}
              </p>
            ) : null}
          </form>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-950">
                All Users
              </h2>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                suppressHydrationWarning
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] table-fixed border-collapse text-left">
                <thead className="bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="w-[22%] px-5 py-3 font-semibold">Name</th>
                    <th className="w-[36%] px-5 py-3 font-semibold">Email</th>
                    <th className="w-[20%] px-5 py-3 font-semibold">Phone</th>
                    <th className="w-[22%] px-5 py-3 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-sm text-slate-600"
                      >
                        Loading users...
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-sm text-slate-600"
                      >
                        No users yet.
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading
                    ? users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-5 py-4 font-medium text-slate-950">
                            {user.name}
                          </td>
                          <td className="break-all px-5 py-4 text-slate-700">
                            {user.email}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                            {user.phone || "Not provided"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div
                              ref={
                                openActionMenuId === user.id
                                  ? actionMenuRef
                                  : null
                              }
                              className="relative inline-flex justify-end"
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 border-slate-300 text-slate-700 hover:border-teal-500 hover:text-teal-700"
                                aria-label={`Open actions for ${user.name}`}
                                aria-expanded={openActionMenuId === user.id}
                                aria-haspopup="menu"
                                onClick={(event) =>
                                  toggleActionMenu(user.id, event.currentTarget)
                                }
                                suppressHydrationWarning
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>

                              {openActionMenuId === user.id &&
                              actionMenuPosition ? (
                                <div
                                  role="menu"
                                  aria-label={`Actions for ${user.name}`}
                                  style={{
                                    left: actionMenuPosition.left,
                                    top: actionMenuPosition.top,
                                  }}
                                  className="fixed z-50 grid w-36 gap-1 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      closeActionMenu();
                                    }}
                                    className="flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                                    suppressHydrationWarning
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      startEdit(user);
                                      closeActionMenu();
                                    }}
                                    className="flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                    suppressHydrationWarning
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setUserToDelete(user);
                                      closeActionMenu();
                                    }}
                                    className="flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                                    disabled={deletingId === user.id}
                                    suppressHydrationWarning
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {deletingId === user.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>

      {selectedUser ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/35"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-drawer-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close user details"
            onClick={() => setSelectedUser(null)}
            suppressHydrationWarning
          />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                  User
                </p>
                <h2
                  id="user-drawer-title"
                  className="mt-1 text-xl font-semibold text-slate-950"
                >
                  {selectedUser.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                suppressHydrationWarning
              >
                Close
              </button>
            </div>

            <dl className="grid gap-5 px-6 py-6 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Name</dt>
                <dd className="mt-1 text-base text-slate-950">
                  {selectedUser.name}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Email</dt>
                <dd className="mt-1 break-all text-base text-slate-950">
                  {selectedUser.email}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Phone Number</dt>
                <dd className="mt-1 text-base text-slate-950">
                  {selectedUser.phone || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Created</dt>
                <dd className="mt-1 text-base text-slate-950">
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "full",
                    timeStyle: "medium",
                  }).format(new Date(selectedUser.createdAt))}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">User ID</dt>
                <dd className="mt-1 text-base text-slate-950">
                  {selectedUser.id}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      ) : null}

      {editingUser ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/35"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close edit user"
            onClick={() => setEditingUser(null)}
            disabled={isUpdating}
            suppressHydrationWarning
          />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Edit User
                </p>
                <h2
                  id="edit-user-title"
                  className="mt-1 text-xl font-semibold text-slate-950"
                >
                  Fix user details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={isUpdating}
                suppressHydrationWarning
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleEditSubmit}
              className="flex flex-col gap-5 px-6 py-6"
            >
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Name
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-11 rounded-md border border-slate-300 px-3 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  disabled={isUpdating}
                  suppressHydrationWarning
                />
                {editErrors.name ? (
                  <span className="text-sm font-normal text-red-600">
                    {editErrors.name}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Email
                <input
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="h-11 rounded-md border border-slate-300 px-3 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  disabled={isUpdating}
                  suppressHydrationWarning
                />
                {editErrors.email ? (
                  <span className="border-l-2 border-red-500 pl-2 text-sm font-normal text-red-600">
                    {editErrors.email}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Phone Number
                <input
                  value={editPhone}
                  onChange={(event) =>
                    handleEditPhoneChange(event.target.value)
                  }
                  inputMode="numeric"
                  maxLength={10}
                  className="h-11 rounded-md border border-slate-300 px-3 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  disabled={isUpdating}
                  suppressHydrationWarning
                />
                {editErrors.phone ? (
                  <span className="border-l-2 border-red-500 pl-2 text-sm font-normal text-red-600">
                    {editErrors.phone}
                  </span>
                ) : null}
              </label>

              <div className="mt-2 flex gap-3">
                <Button
                  type="submit"
                  className="h-11 flex-1 bg-blue-700 text-white hover:bg-blue-800"
                  disabled={isUpdating}
                  suppressHydrationWarning
                >
                  {isUpdating ? "Saving..." : "Save changes"}
                </Button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={isUpdating}
                  suppressHydrationWarning
                >
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => {
          if (!open && deletingId === null) {
            setUserToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {userToDelete?.name ?? "this user"}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deletingId !== null}
              onClick={() => void confirmDelete()}
            >
              {deletingId !== null ? "Deleting..." : "Confirm delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
