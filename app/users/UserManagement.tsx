'use client';

import { UserButton } from '@clerk/nextjs';
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  Eye,
  FileDown,
  FileUp,
  Info,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type Notice = {
  tone: 'info' | 'error' | 'success';
  message: string;
};

const emptyForm = {
  name: '',
  email: '',
  phone: '',
};

type FormErrors = Partial<Record<keyof typeof emptyForm, string>>;
type ActionMenuPosition = {
  top: number;
  right: number;
};
type ImportedUser = Omit<User, 'id'>;

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const TOAST_DURATION_MS = 3000;
const ALPHA_NAME_REGEX = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMPORT_FILE_EXTENSIONS = ['csv', 'xls', 'xlsx'] as const;

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

function validateUserForm(form: typeof emptyForm) {
  const errors: FormErrors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();

  const nameError = validateName(name);
  if (nameError) {
    errors.name = nameError;
  }

  const emailError = validateEmail(email);
  if (emailError) {
    errors.email = emailError;
  }

  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else if (!/^\d{10}$/.test(phone)) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  return errors;
}

function validateEditUserForm(form: typeof emptyForm) {
  const errors: FormErrors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();

  const nameError = validateName(name);
  if (nameError) {
    errors.name = nameError;
  }

  const emailError = validateEmail(email);
  if (emailError) {
    errors.email = emailError;
  }

  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else if (!/^\d{10}$/.test(phone)) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  return errors;
}

function hasFormErrors(errors: FormErrors) {
  return Object.values(errors).some(Boolean);
}

function getImportFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function isImportFileTypeAllowed(fileName: string) {
  return IMPORT_FILE_EXTENSIONS.includes(
    getImportFileExtension(fileName) as (typeof IMPORT_FILE_EXTENSIONS)[number],
  );
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());
  return values;
}

function parseCsv(text: string) {
  const rows = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());

  return rows.slice(1).map((row) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = row[index] ?? '';
      return record;
    }, {}),
  );
}

function getImportedField(
  row: Record<string, unknown>,
  fieldNames: string[],
) {
  const matchedKey = Object.keys(row).find((key) =>
    fieldNames.includes(key.trim().toLowerCase()),
  );

  const value = matchedKey ? row[matchedKey] : '';
  return String(value ?? '').trim();
}

function normalizeImportedRows(rows: Record<string, unknown>[]) {
  return rows
    .map<ImportedUser>((row) => ({
      name: getImportedField(row, ['name', 'employee name', 'full name']),
      email: getImportedField(row, ['email', 'email address', 'mail']),
      phone: getImportedField(row, [
        'phone',
        'phone number',
        'mobile',
        'mobile number',
        'contact',
        'contact number',
      ]).replace(/\D/g, ''),
    }))
    .filter((user) => user.name || user.email || user.phone);
}

function escapeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600" id={id}>
      {message}
    </p>
  );
}

function validateFieldValue(
  form: typeof emptyForm,
  field: keyof typeof form,
  value: string,
) {
  const normalizedValue = value.trim();

  if (field === 'name') {
    return validateName(normalizedValue);
  }

  if (field === 'email') {
    return validateEmail(normalizedValue);
  }

  if (!normalizedValue && field === 'phone') {
    return 'Phone number is required.';
  }

  if (field === 'phone' && normalizedValue && !/^\d{10}$/.test(normalizedValue)) {
    return 'Phone number must be exactly 10 digits.';
  }

  return '';
}

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) {
    return 'Cannot reach the backend API. Restart the Next.js dev server and check that it is running on this same localhost port.';
  }

  return error instanceof Error ? error.message : fallback;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [openActionUserId, setOpenActionUserId] = useState<string | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice((current) => (current === notice ? null : current));
    }, TOAST_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.phone].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [query, users]);

  const isInitialLoading = refreshing && users.length === 0;
  const hasSearch = query.trim().length > 0;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const visiblePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (visiblePage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(
    pageStartIndex,
    pageStartIndex + usersPerPage,
  );
  const visibleStart = filteredUsers.length === 0 ? 0 : pageStartIndex + 1;
  const visibleEnd = Math.min(pageStartIndex + usersPerPage, filteredUsers.length);

  const loadUsers = async () => {
    try {
      setLoadError('');
      const response = await fetch('/api/users', { cache: 'no-store' });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Could not load users.');
      }

      return (await response.json()) as User[];
    } catch (error) {
      const message = getRequestErrorMessage(error, 'Could not load users.');
      setLoadError(message);
      setNotice({ tone: 'error', message });
      return [];
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadInitialUsers() {
      const data = await loadUsers();

      if (!cancelled) {
        setUsers(data);
        setRefreshing(false);
      }
    }

    void loadInitialUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    const normalizedValue =
      field === 'phone'
        ? value.replace(/\D/g, '').slice(0, 10)
        : field === 'name'
          ? value.replace(/\d/g, '')
          : value;
    setForm((current) => {
      const nextForm = {
        ...current,
        [field]: normalizedValue,
      };
      setFormErrors((errorsState) => ({
        ...errorsState,
        [field]: validateFieldValue(nextForm, field, normalizedValue),
      }));
      return nextForm;
    });
  };

  const updateEditField = (field: keyof typeof editForm, value: string) => {
    const normalizedValue =
      field === 'phone'
        ? value.replace(/\D/g, '').slice(0, 10)
        : field === 'name'
          ? value.replace(/\d/g, '')
          : value;
    setEditForm((current) => {
      const nextForm = {
        ...current,
        [field]: normalizedValue,
      };
      setEditFormErrors((errorsState) => ({
        ...errorsState,
        [field]: validateFieldValue(nextForm, field, normalizedValue),
      }));
      return nextForm;
    });
  };

  const closeActionMenu = () => {
    setOpenActionUserId(null);
    setActionMenuPosition(null);
  };

  const closeAddDrawer = () => {
    if (loading) {
      return;
    }

    setShowAddUserForm(false);
    setForm(emptyForm);
    setFormErrors({});
  };

  const openEditDrawer = (user: User) => {
    setSelectedUser(null);
    setShowAddUserForm(false);
    setEditingUser(user);
    setActiveRowId(user.id);
    closeActionMenu();
    setEditFormErrors({});
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
    });
  };

  const toggleActionMenu = (
    user: User,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    if (openActionUserId === user.id) {
      closeActionMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 144;
    const hasRoomBelow = window.innerHeight - rect.bottom > menuHeight;

    setActionMenuPosition({
      top: hasRoomBelow ? rect.bottom + 8 : Math.max(16, rect.top - menuHeight - 8),
      right: Math.max(16, window.innerWidth - rect.right),
    });
    setOpenActionUserId(user.id);
  };

  const copyDetail = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ tone: 'success', message: `${label} copied to clipboard.` });
    } catch {
      setNotice({ tone: 'error', message: `Could not copy ${label.toLowerCase()}.` });
    }
  };

  const handleImportUsers = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!isImportFileTypeAllowed(file.name)) {
      setNotice({
        tone: 'error',
        message: 'Only .csv, .xls, and .xlsx files are allowed.',
      });
      return;
    }

    setLoading(true);
    setNotice({ tone: 'info', message: `Importing users from ${file.name}...` });

    try {
      const fileExtension = getImportFileExtension(file.name);
      let rawRows: Record<string, unknown>[] = [];

      if (fileExtension === 'csv') {
        rawRows = parseCsv(await file.text());
      } else {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];

        if (firstSheetName) {
          rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            workbook.Sheets[firstSheetName],
            { defval: '' },
          );
        }
      }

      const importedUsers = normalizeImportedRows(rawRows);

      if (importedUsers.length === 0) {
        throw new Error('No users found. Include columns for name, email, and phone.');
      }

      const invalidRowIndex = importedUsers.findIndex((user) =>
        hasFormErrors(validateUserForm(user)),
      );

      if (invalidRowIndex >= 0) {
        throw new Error(
          `Row ${invalidRowIndex + 2} is invalid. Name, email, and 10-digit phone are required.`,
        );
      }

      const imported: User[] = [];

      for (const importedUser of importedUsers) {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedUser),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to import users.');
        }

        imported.push(data as User);
      }

      const freshUsers = await loadUsers();
      setUsers(freshUsers);
      setCurrentPage(1);
      setNotice({
        tone: 'success',
        message: `${imported.length} ${imported.length === 1 ? 'user' : 'users'} imported successfully.`,
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getRequestErrorMessage(error, 'Failed to import users.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = () => {
    if (filteredUsers.length === 0) {
      setNotice({ tone: 'error', message: 'No users available to export.' });
      return;
    }

    const headers = ['Name', 'Email', 'Phone'];
    const rows = filteredUsers.map((user) => [user.name, user.email, user.phone]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `users-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice({
      tone: 'success',
      message: `${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'} exported to CSV.`,
    });
  };

  const handleAddUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateUserForm(form);
    setFormErrors(validationErrors);

    if (hasFormErrors(validationErrors)) {
      setNotice({ tone: 'error', message: 'Please fix the highlighted fields.' });
      return;
    }

    setLoading(true);
    setNotice({ tone: 'info', message: 'Adding user...' });

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user.');
      }

      setUsers((current) => [data as User, ...current]);
      setForm(emptyForm);
      setFormErrors({});
      setShowAddUserForm(false);
      setNotice({ tone: 'success', message: 'User added successfully.' });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getRequestErrorMessage(error, 'Failed to add user.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    const validationErrors = validateEditUserForm(editForm);
    setEditFormErrors(validationErrors);

    if (hasFormErrors(validationErrors)) {
      setNotice({ tone: 'error', message: 'Please fix the highlighted fields.' });
      return;
    }

    setEditLoading(true);
    setNotice({ tone: 'info', message: 'Updating user...' });

    try {
      const response = await fetch(`/api/users?id=${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user.');
      }

      const updatedUser = data as User;
      setUsers((current) =>
        current.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );
      setSelectedUser((current) =>
        current?.id === updatedUser.id ? updatedUser : current,
      );
      setEditingUser(null);
      setEditForm(emptyForm);
      setEditFormErrors({});
      setNotice({ tone: 'success', message: 'User updated successfully.' });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getRequestErrorMessage(error, 'Failed to update user.'),
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) {
      return;
    }

    const id = userToDelete.id;
    setNotice({ tone: 'info', message: 'Deleting user...' });

    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user.');
      }

      setUsers((current) => current.filter((user) => user.id !== id));
      setSelectedUser((current) => (current?.id === id ? null : current));
      setEditingUser((current) => (current?.id === id ? null : current));
      closeActionMenu();
      setUserToDelete(null);
      setNotice({ tone: 'success', message: 'User deleted successfully.' });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getRequestErrorMessage(error, 'Failed to delete user.'),
      });
    }
  };

  const noticeClasses = {
    info: 'border-sky-200 bg-sky-50 text-sky-800 ring-sky-100',
    error: 'border-red-200 bg-red-50 text-red-700 ring-red-100',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100',
  };
  const NoticeIcon = notice?.tone === 'error'
    ? CircleAlert
    : notice?.tone === 'success'
      ? CircleCheck
      : Info;

  const inputBase =
    'h-12 w-full rounded-md border bg-white/95 px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:ring-3';
  const fieldShell =
    'rounded-lg border border-slate-200 bg-white/80 p-3 shadow-sm shadow-slate-200/40 transition hover:border-slate-300 hover:bg-white focus-within:border-teal-300 focus-within:bg-white focus-within:shadow-md focus-within:shadow-teal-900/5';
  const labelBase =
    'mb-2 flex items-center gap-2 text-sm font-bold text-slate-800';
  const metricCard =
    'group relative overflow-hidden rounded-lg border border-white/70 bg-white/85 px-4 py-3 shadow-sm shadow-slate-200/70 ring-1 ring-slate-950/5 transition before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)] hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-900/5';
  return (
    <div className="relative isolate min-h-dvh min-w-0 overflow-x-clip bg-[#f5f7fb] text-slate-950 transition-colors before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] before:bg-[size:42px_42px] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[linear-gradient(135deg,rgba(20,184,166,0.10),transparent_38%,rgba(245,158,11,0.10))] dark:bg-slate-950 dark:text-slate-100 dark:before:bg-[linear-gradient(rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.10)_1px,transparent_1px)] dark:after:bg-[linear-gradient(135deg,rgba(20,184,166,0.08),transparent_38%,rgba(56,189,248,0.08))] [--header-height:4rem] [--sidebar-width:16rem] 2xl:[--sidebar-width:18rem]">
      <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center border-b border-slate-200/80 bg-white/95 text-slate-900 shadow-[0_4px_20px_rgba(15,118,110,0.05)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)]" />
        <div className="flex h-full min-w-0 flex-1 items-center gap-3 bg-[linear-gradient(110deg,#f0fdfa,rgba(255,255,255,0))] px-3 dark:bg-[linear-gradient(110deg,rgba(20,184,166,0.12),rgba(15,23,42,0))] sm:px-6 lg:w-[var(--sidebar-width)] lg:flex-none lg:border-r lg:border-slate-200/80 lg:dark:border-slate-800">
        <Link className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700" href="/">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200/70 bg-[linear-gradient(135deg,#ccfbf1,#e0f2fe)] text-teal-800 shadow-sm shadow-teal-900/5">
            <Users className="h-5 w-5" />
          </span>
          <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">
            Dashboard
          </p>
          <p className="truncate text-sm font-black dark:text-slate-100 sm:text-base">User Studio</p>
          </div>
        </Link>
        </div>
        <div className="hidden min-w-0 flex-1 items-center gap-3 px-6 text-sm lg:flex lg:px-8">
          <span className="text-slate-500 dark:text-slate-400">Workspace</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">/</span>
          <span className="truncate font-semibold text-slate-800 dark:text-slate-100">User Management</span>
        </div>
        <div className="mr-3 flex shrink-0 items-center gap-3 sm:mr-6 lg:mr-8">
          <div className="rounded-full border border-slate-200 bg-white p-1 shadow-sm shadow-slate-200/70 ring-1 ring-slate-950/5">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9',
                  userButtonPopoverCard: 'rounded-lg shadow-2xl',
                },
              }}
            />
          </div>
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center gap-3 border-t border-teal-100 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-4px_24px_rgba(15,118,110,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
      >
        <Link
          aria-current="page"
          aria-label="User Management"
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-teal-200 bg-[linear-gradient(135deg,#ccfbf1,#e0f2fe)] text-teal-800 shadow-sm shadow-teal-900/5 transition hover:border-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          href="/"
          title="User Management"
        >
          <Users className="h-5 w-5" />
          <span className="sr-only">User Management</span>
        </Link>
      </nav>

      <aside aria-label="Sidebar" className="fixed bottom-0 left-0 top-[var(--header-height)] z-20 hidden w-[var(--sidebar-width)] flex-col overflow-y-auto border-r border-slate-200/80 bg-[#f8fcfc] px-5 py-6 text-slate-800 shadow-[4px_0_24px_rgba(15,118,110,0.03)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(153,246,228,0.3),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(186,230,253,0.3),transparent_55%)]" />
        <div className="relative flex min-h-full flex-col">
        <p className="px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Workspace
        </p>

        <nav aria-label="Sidebar navigation" className="mt-3 space-y-2">
          <Link
            aria-current="page"
            className="relative flex w-full items-center gap-3 rounded-xl border border-teal-200/80 bg-[linear-gradient(110deg,#ccfbf1,#eaf7ff)] px-4 py-3 text-sm font-bold text-teal-900 shadow-sm shadow-teal-900/5 transition before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full before:bg-teal-600 hover:border-teal-400 hover:shadow-md hover:shadow-teal-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            href="/"
          >
            <Users className="h-4 w-4" />
            User Management
          </Link>
        </nav>
        </div>
      </aside>

      <main className="relative z-10 min-w-0 px-3 pb-24 pt-4 sm:px-6 sm:pb-24 sm:pt-6 lg:ml-[var(--sidebar-width)] lg:px-8 lg:py-6 2xl:px-10 min-[2200px]:px-16">
        <section className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4 sm:gap-6 2xl:max-w-[1680px] min-[2200px]:max-w-[1920px] min-[2200px]:gap-8">
        <header className="min-w-0 overflow-hidden rounded-lg border border-white/80 bg-white/90 px-4 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:ring-white/10 sm:px-6 2xl:px-8 2xl:py-7">
          <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                <Activity className="h-4 w-4" />
                User Management
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 dark:text-slate-100 sm:text-4xl">
                Users
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Manage user records with a focused form, instant search, quick row
                actions, and smooth drawers for detail work.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:min-w-[220px]">
              <div className={metricCard}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
                  <Users className="h-4 w-4 text-teal-700 transition group-hover:scale-110" />
                  Total
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-950">{users.length}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 sm:gap-6 min-[2200px]:gap-8">
          <section className="min-w-0 overflow-hidden rounded-lg border border-white/80 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:ring-white/10">
            <div className="border-b border-slate-200/80 bg-white/90 px-5 py-4 dark:border-slate-800 dark:bg-slate-900 2xl:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black text-slate-950 dark:text-slate-100">User Directory</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Browse, search, and manage saved users.</p>
                </div>
                <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-80 sm:gap-3 sm:justify-end">
                  <input
                    accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(event) => void handleImportUsers(event)}
                    ref={importInputRef}
                    type="file"
                  />
                  <button
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    disabled={loading}
                    onClick={() => importInputRef.current?.click()}
                    type="button"
                  >
                    <FileUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Import</span>
                    <span className="sr-only sm:hidden">Import users</span>
                  </button>
                  <button
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    disabled={filteredUsers.length === 0}
                    onClick={handleExportUsers}
                    type="button"
                  >
                    <FileDown className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                    <span className="sr-only sm:hidden">Export users</span>
                  </button>
                  <label className="relative block min-w-0 flex-1 sm:max-w-72 2xl:max-w-96">
                    <span className="sr-only">Search users</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-9 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search name, email, phone"
                      type="search"
                      value={query}
                    />
                    {hasSearch ? (
                      <button
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => setQuery('')}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </label>
                  <button
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[linear-gradient(90deg,#0f766e,#0891b2)] px-4 text-sm font-bold text-white shadow-lg shadow-teal-900/20 ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-900/25 disabled:cursor-default disabled:translate-y-0 disabled:bg-slate-400 disabled:bg-none disabled:shadow-none"
                    disabled={showAddUserForm}
                    onClick={() => {
                      setSelectedUser(null);
                      setEditingUser(null);
                      closeActionMenu();
                      setShowAddUserForm(true);
                    }}
                    type="button"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {showAddUserForm ? 'Form open' : 'Add user'}
                    </span>
                    <span className="sr-only sm:hidden">
                      {showAddUserForm ? 'Add user form is open' : 'Add user'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {loadError ? (
              <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
                {loadError}
              </div>
            ) : null}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm 2xl:min-w-[960px]">
                <thead className="border-y border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-normal text-slate-500">
                  <tr>
                    <th className="w-12 px-5 py-3">
                      <span className="block h-4 w-4 rounded border border-slate-200 bg-white" />
                    </th>
                    <th className="px-3 py-3 2xl:px-4">Full Name</th>
                    <th className="px-3 py-3 2xl:px-4">Email</th>
                    <th className="px-3 py-3 2xl:px-4">Phone</th>
                    <th className="w-24 px-5 py-3 text-right 2xl:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isInitialLoading || filteredUsers.length === 0 ? (
                    <tr>
                      <td className="px-5 py-16 text-center text-sm text-slate-500" colSpan={5}>
                        {isInitialLoading
                          ? 'Loading users...'
                          : hasSearch
                            ? 'No users match your search.'
                            : 'No users yet.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr
                        className={`cursor-pointer transition hover:bg-teal-50/70 ${
                          activeRowId === user.id ? 'bg-teal-50 shadow-[inset_4px_0_0_#0f766e]' : 'odd:bg-white even:bg-slate-50/45'
                        }`}
                        key={user.id}
                        onClick={() => {
                          setActiveRowId(user.id);
                          setEditingUser(null);
                          setSelectedUser(user);
                        }}
                      >
                        <td className="w-12 px-5 py-4">
                          <span className="block h-4 w-4 rounded border border-slate-200 bg-white" />
                        </td>
                        <td className="px-3 py-4 2xl:px-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ccfbf1,#dbeafe)] text-sm font-black text-slate-800 shadow-sm ring-1 ring-white">
                              {user.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-bold text-slate-950">{user.name}</span>
                            </span>
                          </div>
                        </td>
                        <td className="break-all px-3 py-4 font-medium text-slate-700 2xl:px-4">
                          <span className="inline-flex items-center gap-2">
                            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                            {user.email}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 font-medium text-slate-700 2xl:px-4">
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {user.phone}
                          </span>
                        </td>
                        <td className="w-24 px-5 py-4 text-right 2xl:px-6">
                          <button
                            aria-expanded={openActionUserId === user.id}
                            aria-haspopup="menu"
                            aria-label={`Open actions for ${user.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white hover:text-teal-800 hover:shadow-md"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleActionMenu(user, event);
                            }}
                            type="button"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 bg-white md:hidden">
              {isInitialLoading ? (
                <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-base font-bold text-slate-800">
                    {hasSearch ? 'No matching users' : 'No users yet'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {hasSearch ? 'Try a different search.' : 'Add the first user from the form.'}
                  </p>
                </div>
              ) : (
                paginatedUsers.map((user) => (
                  <article
                    className={`cursor-pointer px-5 py-5 transition hover:bg-teal-50/70 ${
                      activeRowId === user.id ? 'bg-teal-50 shadow-[inset_4px_0_0_#0f766e]' : 'bg-white'
                    }`}
                    key={user.id}
                    onClick={() => {
                      setActiveRowId(user.id);
                      setEditingUser(null);
                      setSelectedUser(user);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,#ccfbf1,#dbeafe)] text-sm font-black text-slate-800 shadow-sm">
                            {user.name.slice(0, 1).toUpperCase()}
                          </span>
                          <h3 className="truncate text-base font-bold text-slate-950">
                            {user.name}
                          </h3>
                        </div>
                        <p className="mt-3 flex items-start gap-2 break-all text-sm font-medium text-slate-600">
                          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          {user.email}
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {user.phone}
                        </p>
                      </div>
                      <button
                        aria-expanded={openActionUserId === user.id}
                        aria-haspopup="menu"
                        aria-label={`Open actions for ${user.name}`}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-800 hover:shadow-md"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleActionMenu(user, event);
                        }}
                        type="button"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            {!isInitialLoading && filteredUsers.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center 2xl:px-6">
                <label className="flex shrink-0 items-center gap-2 font-semibold text-slate-700">
                  <span>Results per page</span>
                  <select
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition hover:border-teal-300 focus:border-teal-700 focus:ring-3 focus:ring-teal-100"
                    onChange={(event) => {
                      setUsersPerPage(
                        Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number],
                      );
                      setCurrentPage(1);
                    }}
                    value={usersPerPage}
                  >
                    {PAGE_SIZE_OPTIONS.map((pageSize) => (
                      <option key={pageSize} value={pageSize}>
                        {pageSize}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex min-w-0 w-full flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <p className="whitespace-nowrap font-semibold">
                    Showing {visibleStart}-{visibleEnd} of {filteredUsers.length}
                  </p>
                  <nav
                    aria-label="User table pagination"
                    className="flex items-center justify-end gap-2"
                  >
                    <button
                      aria-label="Previous page"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
                      disabled={visiblePage === 1}
                      onClick={() => setCurrentPage(Math.max(1, visiblePage - 1))}
                      type="button"
                    >
                      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-800"
                    >
                      Page {visiblePage}
                    </span>
                    <button
                      aria-label="Next page"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
                      disabled={visiblePage === totalPages}
                      onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
                      type="button"
                    >
                      <ChevronRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </nav>
                </div>
              </div>
            ) : null}
          </section>
        </div>
        </section>
      </main>

      <div
        aria-atomic="true"
        className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-end p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-4"
        role="status"
      >
        {notice ? (
          <div className={`flex w-fit max-w-md items-center gap-3 rounded-lg border px-5 py-4 text-sm font-semibold shadow-2xl ring-1 ${noticeClasses[notice.tone]}`}>
            <NoticeIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <p className="min-w-0 break-words">{notice.message}</p>
          </div>
        ) : null}
      </div>

      {openActionUserId && actionMenuPosition ? (
        <>
          <button
            aria-label="Close actions menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={closeActionMenu}
            type="button"
          />
          <div
            className="fixed z-50 w-44 rounded-md border border-white/80 bg-white/95 p-1.5 text-left shadow-2xl shadow-slate-950/15 backdrop-blur"
            role="menu"
            style={{
              top: actionMenuPosition.top,
              right: actionMenuPosition.right,
            }}
          >
            {users
              .filter((user) => user.id === openActionUserId)
              .map((user) => (
                <div key={user.id}>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => {
                      setEditingUser(null);
                      setActiveRowId(user.id);
                      setSelectedUser(user);
                      closeActionMenu();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Eye className="h-4 w-4 text-teal-700" />
                    View
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => openEditDrawer(user)}
                    role="menuitem"
                    type="button"
                  >
                    <Pencil className="h-4 w-4 text-blue-700" />
                    Edit
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    onClick={() => {
                      setUserToDelete(user);
                      closeActionMenu();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              ))}
          </div>
        </>
      ) : null}

      {showAddUserForm ? (
        <div
          aria-labelledby="add-user-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm"
          role="dialog"
        >
          <button
            aria-label="Close add user drawer"
            className="absolute inset-0 cursor-default"
            disabled={loading}
            onClick={closeAddDrawer}
            type="button"
          />
          <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 bg-[linear-gradient(135deg,#ecfeff,#ffffff)] px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                  Add User
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950" id="add-user-title">
                  Create new user
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fill in the details and save it to PostgreSQL.
                </p>
              </div>
              <button
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={loading}
                onClick={closeAddDrawer}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleAddUser}>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
                <div className={fieldShell}>
                  <label className={labelBase} htmlFor="name">
                    <Users className="h-4 w-4 text-teal-700" />
                    Name
                  </label>
                  <input
                    aria-describedby={formErrors.name ? 'name-error' : undefined}
                    aria-invalid={Boolean(formErrors.name)}
                    className={`${inputBase} ${
                      formErrors.name
                        ? 'border-red-500 focus:border-red-600 focus:ring-red-100'
                        : 'border-slate-300 focus:border-teal-700 focus:ring-teal-100'
                    }`}
                    id="name"
                    name="name"
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="Ada Lovelace"
                    required
                    type="text"
                    value={form.name}
                  />
                  <FieldError id="name-error" message={formErrors.name} />
                </div>

                <div className={fieldShell}>
                  <label className={labelBase} htmlFor="email">
                    <Mail className="h-4 w-4 text-sky-700" />
                    Email
                  </label>
                  <input
                    aria-describedby={formErrors.email ? 'email-error' : undefined}
                    aria-invalid={Boolean(formErrors.email)}
                    className={`${inputBase} ${
                      formErrors.email
                        ? 'border-red-500 focus:border-red-600 focus:ring-red-100'
                        : 'border-slate-300 focus:border-teal-700 focus:ring-teal-100'
                    }`}
                    id="email"
                    name="email"
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="ada@example.com"
                    required
                    type="email"
                    value={form.email}
                  />
                  <FieldError id="email-error" message={formErrors.email} />
                </div>

                <div className={fieldShell}>
                  <label className={labelBase} htmlFor="phone">
                    <Phone className="h-4 w-4 text-emerald-700" />
                    Phone Number
                  </label>
                  <input
                    aria-describedby={formErrors.phone ? 'phone-error' : undefined}
                    aria-invalid={Boolean(formErrors.phone)}
                    className={`${inputBase} ${
                      formErrors.phone
                        ? 'border-red-500 focus:border-red-600 focus:ring-red-100'
                        : 'border-slate-300 focus:border-teal-700 focus:ring-teal-100'
                    }`}
                    id="phone"
                    inputMode="numeric"
                    maxLength={10}
                    name="phone"
                    onChange={(event) => updateField('phone', event.target.value)}
                    pattern="\d{10}"
                    placeholder="9876543210"
                    required
                    title="Phone number must be exactly 10 digits"
                    type="tel"
                    value={form.phone}
                  />
                  <FieldError id="phone-error" message={formErrors.phone} />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
                  disabled={loading}
                  onClick={closeAddDrawer}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[linear-gradient(90deg,#0f766e,#0891b2)] px-5 text-sm font-bold text-white shadow-lg shadow-teal-900/20 ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-900/25 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:bg-none disabled:shadow-none"
                  disabled={loading}
                  type="submit"
                >
                  <UserPlus className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save user'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {selectedUser ? (
        <div
          aria-labelledby="view-user-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm"
          role="dialog"
        >
          <button
            aria-label="Close view drawer"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedUser(null)}
            type="button"
          />
          <aside className="relative h-full w-full max-w-md bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 bg-[linear-gradient(135deg,#ecfeff,#ffffff)] px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                  View User
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950" id="view-user-title">
                  {selectedUser.name}
                </h2>
              </div>
              <button
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                onClick={() => setSelectedUser(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="space-y-5 px-6 py-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <dt className="text-xs font-bold uppercase tracking-normal text-slate-500">Name</dt>
                <dd className="mt-1 text-base font-bold text-slate-950">{selectedUser.name}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <dt className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-normal text-slate-500">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <button
                    aria-label="Copy email"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-teal-800"
                    onClick={() => void copyDetail('Email', selectedUser.email)}
                    type="button"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                  </button>
                </dt>
                <dd className="mt-1 break-all text-base text-slate-950">{selectedUser.email}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <dt className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-normal text-slate-500">
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </span>
                  <button
                    aria-label="Copy phone"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-teal-800"
                    onClick={() => void copyDetail('Phone', selectedUser.phone)}
                    type="button"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                  </button>
                </dt>
                <dd className="mt-1 text-base text-slate-950">{selectedUser.phone}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <dt className="text-xs font-bold uppercase tracking-normal text-slate-500">User ID</dt>
                <dd className="mt-1 break-all font-mono text-sm text-slate-700">{selectedUser.id}</dd>
              </div>
            </dl>
          </aside>
        </div>
      ) : null}

      {editingUser ? (
        <div
          aria-labelledby="edit-user-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm"
          role="dialog"
        >
          <button
            aria-label="Close edit drawer"
            className="absolute inset-0 cursor-default"
            onClick={() => setEditingUser(null)}
            type="button"
          />
          <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 bg-[linear-gradient(135deg,#eff6ff,#ffffff)] px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                  Edit User
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950" id="edit-user-title">
                  {editingUser.name}
                </h2>
              </div>
              <button
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={editLoading}
                onClick={() => setEditingUser(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="space-y-5 px-6 py-6" onSubmit={handleEditUser}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="edit-name">
                  Name
                </label>
                <input
                  aria-describedby={editFormErrors.name ? 'edit-name-error' : undefined}
                  aria-invalid={Boolean(editFormErrors.name)}
                  className={`${inputBase} ${
                    editFormErrors.name
                      ? 'border-red-500 focus:border-red-600 focus:ring-red-100'
                      : 'border-slate-300 focus:border-blue-700 focus:ring-blue-100'
                  }`}
                  id="edit-name"
                  name="name"
                  onChange={(event) => updateEditField('name', event.target.value)}
                  required
                  type="text"
                  value={editForm.name}
                />
                <FieldError id="edit-name-error" message={editFormErrors.name} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="edit-email">
                  Email
                </label>
                <input
                  aria-describedby={editFormErrors.email ? 'edit-email-error' : undefined}
                  aria-invalid={Boolean(editFormErrors.email)}
                  className={`${inputBase} ${
                    editFormErrors.email
                      ? 'border-red-500 focus:border-red-600 focus:ring-red-100'
                      : 'border-slate-300 focus:border-blue-700 focus:ring-blue-100'
                  }`}
                  id="edit-email"
                  name="email"
                  onChange={(event) => updateEditField('email', event.target.value)}
                  required
                  type="email"
                  value={editForm.email}
                />
                <FieldError id="edit-email-error" message={editFormErrors.email} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="edit-phone">
                  Phone Number
                </label>
                <input
                  aria-describedby={editFormErrors.phone ? 'edit-phone-error' : undefined}
                  aria-invalid={Boolean(editFormErrors.phone)}
                  className={`${inputBase} ${
                    editFormErrors.phone
                      ? 'border-red-500 focus:border-red-600 focus:ring-red-100'
                      : 'border-slate-300 focus:border-blue-700 focus:ring-blue-100'
                  }`}
                  id="edit-phone"
                  inputMode="numeric"
                  maxLength={10}
                  name="phone"
                  onChange={(event) => updateEditField('phone', event.target.value)}
                  pattern="\d{10}"
                  required
                  title="Phone number must be exactly 10 digits"
                  type="tel"
                  value={editForm.phone}
                />
                <FieldError id="edit-phone-error" message={editFormErrors.phone} />
              </div>
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[linear-gradient(90deg,#1d4ed8,#0f766e)] px-4 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/25 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:bg-none disabled:shadow-none"
                disabled={editLoading}
                type="submit"
              >
                <Pencil className="h-4 w-4" />
                {editLoading ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      {userToDelete ? (
        <div
          aria-labelledby="delete-user-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-white/80 bg-white p-6 shadow-2xl shadow-slate-950/20">
            <h2 className="text-xl font-black text-slate-950" id="delete-user-title">
              Delete user?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will permanently delete{' '}
              <span className="font-semibold text-slate-950">
                {userToDelete.name}
              </span>
              . This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setUserToDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-11 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
                onClick={() => void handleDeleteUser()}
                type="button"
              >
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
