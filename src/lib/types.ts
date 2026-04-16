import type { LinkType } from "flowbite-svelte";

export type UserRole = {
  id: number;
  name: string;
  allowedPermissions: string[];
  createdAt: string;
  updatedAt: string;
};

export enum WorkHoursStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum PeriodStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
  CLOSED = "CLOSED",
}

export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export type GlobalSetting = {
  defaultPrice: string;
  studentsCode: string;
  scolarshipCode: string;
  tithCode: string;
};

export type MailingList = {
  id?: number;
  name: string;
  email: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Period = {
  id: number;
  name: string;
  start: Date;
  end: Date;
  status: PeriodStatus;
  createdAt: Date;
  updatedAt: Date;
  workHours: WorkHours[];
  scholarshipPayroll: ScholarshipPayroll[];
};

export type Role = {
  id: number;
  name: string;
  allowedPermissions: string[];
  createdAt: Date;
  updatedAt: Date;
  users: User[];
};

export type Pricing = {
  id: number;
  price: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  departments: Department[];
};

export type Department = {
  id?: number;
  name: string;
  code: string;
  pricingId?: number;
  headId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  pricing?: Pricing;
  head?: User;
  users?: User[];
  students?: StudentOnDepartment[];
  hours?: WorkHours[];
  scholarshipPayroll?: ScholarshipPayroll[];
};

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  uuid: string;
  roleId: number;
  departmentId?: number;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  department?: Department;
  workHours: WorkHours[];
  scholarshipPayroll: ScholarshipPayroll[];
};

export type StudentOnDepartment = {
  id: number;
  studentId: number;
  departmentId: number;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  student: Student;
  department: Department;
};

export type Student = {
  id: number;
  name: string;
  email: string;
  phone: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
  departments: StudentOnDepartment[];
  workHours: WorkHours[];
  ScholarshipPayroll: ScholarshipPayroll[];
};

export type WorkHours = {
  id: number;
  name: string;
  start: Date;
  end: Date;
  amount: number | null;
  price: number | null;
  total: number | null;
  status: WorkHoursStatus;
  registedBy: number;
  studentId: number;
  departmentId: number;
  appliedHourId?: number;
  periodId: number;
  createdAt: Date;
  updatedAt: Date;
  period: Period;
  applier: User;
  student: Student;
  department: Department;
  becaPayroll?: ScholarshipPayroll;
};

export type ScholarshipPayroll = {
  id: number;
  hours: number;
  amount: number;
  subtotal: number;
  tithe: number;
  total: number;
  payable: number;
  recivable: number;
  studentId: number;
  departmentId: number;
  periodId: number;
  appliedBy: number;
  createdAt: Date;
  updatedAt: Date;
  period: Period;
  applier: User;
  student: Student;
  department: Department;
  workHours: WorkHours[];
};

export type ApiPagination<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  next_page?: number;
  prev_page?: number;
};

export type FormatterFunction<T> = (value: T) => string;

export type TableHeader = {
  field: string;
  name: string;
  formatter?: FormatterFunction<any>;
};

export type TablePagination = {
  page: number;
  next_page?: number;
  prev_page?: number;
  pages?: LinkType[];
};
export type TableData<T> = T[];
