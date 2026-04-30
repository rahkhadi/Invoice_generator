import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("prisma/dev.db");

db.exec(`
CREATE TABLE IF NOT EXISTS Invoice (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT,
  invoiceNumber TEXT NOT NULL,
  workOrderNumber TEXT,
  workOrderId TEXT,
  workOrderType TEXT,
  contractor TEXT,
  company TEXT,
  myCompanyName TEXT,
  myCompanyGstNumber TEXT,
  myCompanyAddress TEXT,
  address TEXT,
  suite TEXT,
  classification TEXT,
  date DATETIME,
  deadline DATETIME,
  subtotal REAL NOT NULL DEFAULT 0,
  hst REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  paymentTerms TEXT,
  notes TEXT,
  rawExtractedText TEXT,
  uploadedPdfUrl TEXT,
  generatedPdfUrl TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT Invoice_userId_fkey
    FOREIGN KEY (userId) REFERENCES User(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT,
  googleId TEXT UNIQUE,
  image TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS CompanyProfile (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL UNIQUE,
  companyName TEXT,
  gstNumber TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logoUrl TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT CompanyProfile_userId_fkey
    FOREIGN KEY (userId) REFERENCES User(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS InvoiceItem (
  id TEXT PRIMARY KEY NOT NULL,
  invoiceId TEXT NOT NULL,
  area TEXT,
  description TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  uom TEXT,
  unitPrice REAL NOT NULL DEFAULT 0,
  lineTotal REAL NOT NULL DEFAULT 0,
  CONSTRAINT InvoiceItem_invoiceId_fkey
    FOREIGN KEY (invoiceId) REFERENCES Invoice(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
`);

for (const statement of [
  "ALTER TABLE Invoice ADD COLUMN userId TEXT",
  "ALTER TABLE Invoice ADD COLUMN workOrderId TEXT",
  "ALTER TABLE Invoice ADD COLUMN workOrderType TEXT",
  "ALTER TABLE Invoice ADD COLUMN myCompanyName TEXT",
  "ALTER TABLE Invoice ADD COLUMN myCompanyGstNumber TEXT",
  "ALTER TABLE Invoice ADD COLUMN myCompanyAddress TEXT"
]) {
  try {
    db.exec(statement);
  } catch (error) {
    if (!String(error).includes("duplicate column name")) throw error;
  }
}

for (const statement of [
  "ALTER TABLE User ADD COLUMN passwordHash TEXT",
  "ALTER TABLE User ADD COLUMN googleId TEXT",
  "ALTER TABLE User ADD COLUMN image TEXT"
]) {
  try {
    db.exec(statement);
  } catch (error) {
    if (!String(error).includes("duplicate column name")) throw error;
  }
}

db.close();
console.log("SQLite invoice tables are ready.");
