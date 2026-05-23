import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  DEMO_IDS,
  VehicleStatus,
} from "@lava-rapido/shared";

const vehicleStatuses = Object.values(VehicleStatus) as [string, ...string[]];

export const vehicleStatusEnum = pgEnum(
  "vehicle_status",
  vehicleStatuses,
);

export const paymentMethodEnum = pgEnum("payment_method", [
  "dinheiro",
  "pix",
  "cartao_debito",
  "cartao_credito",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("branches_tenant_idx").on(t.tenantId)],
);

export const washTypes = pgTable(
  "wash_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("wash_types_tenant_idx").on(t.tenantId)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    document: text("document"),
    /** Placa já normalizada (sem hífen), maiúscula. */
    plate: text("plate"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("customers_tenant_idx").on(t.tenantId)],
);

export const vehicleEntries = pgTable(
  "vehicle_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    /** Placa normalizada (Mercosul), sem separador. */
    plate: text("plate").notNull(),
    washTypeId: uuid("wash_type_id")
      .notNull()
      .references(() => washTypes.id, { onDelete: "restrict" }),
    status: vehicleStatusEnum("status")
      .notNull()
      .default(VehicleStatus.RECEBIDO),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("vehicle_entries_tenant_branch_idx").on(t.tenantId, t.branchId),
    index("vehicle_entries_updated_idx").on(t.updatedAt),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    vehicleEntryId: uuid("vehicle_entry_id").references(
      () => vehicleEntries.id,
      { onDelete: "set null" },
    ),
    amountCents: integer("amount_cents").notNull(),
    method: paymentMethodEnum("method").notNull(),
    reference: text("reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("payments_tenant_branch_created_idx").on(
      t.tenantId,
      t.branchId,
      t.createdAt,
    ),
  ],
);

/** Constantes apenas para uso em migrações/seed onde precisamos de IDs fixos. */
export const SEED_IDS = DEMO_IDS;

export const tenantsRelations = relations(tenants, ({ many }) => ({
  branches: many(branches),
  washTypes: many(washTypes),
  customers: many(customers),
  vehicleEntries: many(vehicleEntries),
  payments: many(payments),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [branches.tenantId],
    references: [tenants.id],
  }),
  vehicleEntries: many(vehicleEntries),
  payments: many(payments),
}));

export const washTypesRelations = relations(washTypes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [washTypes.tenantId],
    references: [tenants.id],
  }),
  vehicleEntries: many(vehicleEntries),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  vehicleEntries: many(vehicleEntries),
}));

export const vehicleEntriesRelations = relations(
  vehicleEntries,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [vehicleEntries.tenantId],
      references: [tenants.id],
    }),
    branch: one(branches, {
      fields: [vehicleEntries.branchId],
      references: [branches.id],
    }),
    customer: one(customers, {
      fields: [vehicleEntries.customerId],
      references: [customers.id],
    }),
    washType: one(washTypes, {
      fields: [vehicleEntries.washTypeId],
      references: [washTypes.id],
    }),
    payments: many(payments),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [payments.branchId],
    references: [branches.id],
  }),
  vehicleEntry: one(vehicleEntries, {
    fields: [payments.vehicleEntryId],
    references: [vehicleEntries.id],
  }),
}));
