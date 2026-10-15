const { db, readDb } = require("../src/infrastructure/database");
const { employees } = require("../src/infrastructure/database/schema/hr");
const { users } = require("../src/infrastructure/database/schema/auth");

async function check() {
  const allUsers = await readDb.select().from(users).limit(10);
  console.log("Users count:", allUsers.length);
  console.log("Sample Users:", allUsers.map(u => ({ id: u.id, username: u.utilisateur, roleId: u.roleId, employeeId: u.employeeId, nomPrenom: u.nomPrenom, email: u.email })));

  const allEmps = await readDb.select().from(employees).limit(10);
  console.log("Employees count:", allEmps.length);
  console.log("Sample Employees:", allEmps.map(e => ({ id: e.id, nom: e.nom, empId: e.empId, poste: e.poste, salaireBase: e.salaireBase, schoolId: e.schoolId })));

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
