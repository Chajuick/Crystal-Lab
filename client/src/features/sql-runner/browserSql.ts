import alasql from "alasql";
import type { SqlRunResult, Warehouse } from "@/shared/types/domain";

const TABLES: Array<keyof Warehouse> = [
  "customers",
  "sessions",
  "orders",
  "carts",
  "message_logs",
  "product_catalog",
  "customer_category_interest",
  "campaign_history",
  "coupon_eligibility",
  "wishlist_events",
];

function cloneRows<T>(rows: T[]): T[] {
  return JSON.parse(JSON.stringify(rows));
}

function registerTables(warehouse: Warehouse) {
  TABLES.forEach((tableName) => {
    alasql(`DROP TABLE IF EXISTS ${tableName}`);
    alasql(`CREATE TABLE ${tableName}`);
    alasql.tables[tableName].data = cloneRows(warehouse[tableName] as unknown as Array<Record<string, unknown>>);
  });
}

export function formatSql(sql: string) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\bFROM\b/gi, "\nFROM")
    .replace(/\bLEFT JOIN\b/gi, "\nLEFT JOIN")
    .replace(/\bINNER JOIN\b/gi, "\nINNER JOIN")
    .replace(/\bWHERE\b/gi, "\nWHERE")
    .replace(/\bAND\b/gi, "\n  AND")
    .replace(/\bGROUP BY\b/gi, "\nGROUP BY")
    .replace(/\bORDER BY\b/gi, "\nORDER BY")
    .replace(/\bLIMIT\b/gi, "\nLIMIT")
    .trim();
}

export function runSql(sql: string, warehouse: Warehouse): SqlRunResult {
  try {
    registerTables(warehouse);
    const result = alasql(sql);
    const rows = Array.isArray(result) ? result : [];
    const columns = rows[0] ? Object.keys(rows[0]) : [];

    return {
      ok: true,
      rows,
      rowCount: rows.length,
      columns,
    };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      rowCount: 0,
      columns: [],
      error: error instanceof Error ? error.message : "SQL 실행 중 알 수 없는 오류가 발생했습니다.",
    };
  }
}
