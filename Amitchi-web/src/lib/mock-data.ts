export const MOCK_STUDENTS = [
  {
    id: 1,
    numAdmission: "2024001",
    nomEtudiant: "Mohamed Amine",
    sexe: "Garçon",
    classe: "1ère AS",
    section: "Sciences",
    statut: "Actif",
    dateNaissance: "2010-05-15",
  },
  {
    id: 2,
    numAdmission: "2024002",
    nomEtudiant: "Fatima Zahra",
    sexe: "Fille",
    classe: "2ème AS",
    section: "Lettres",
    statut: "Actif",
    dateNaissance: "2009-11-20",
  },
  {
    id: 3,
    numAdmission: "2024003",
    nomEtudiant: "Yassine Brahimi",
    sexe: "Garçon",
    classe: "3ème AS",
    section: "Mathématiques",
    statut: "Inactif",
    dateNaissance: "2008-03-10",
  }
];

export const MOCK_EMPLOYEES = [
  {
    id: 1,
    empId: "EMP-001",
    nom: "Ahmed Mansouri",
    poste: "Enseignant",
    departement: "Mathématiques",
    statut: "Actif",
    mobile: "0550123456",
  },
  {
    id: 2,
    empId: "EMP-002",
    nom: "Saliha Touati",
    poste: "Secrétaire",
    departement: "Administration",
    statut: "Actif",
    mobile: "0661987654",
  }
];

export const MOCK_CLASSES = [
  { id: 1, className: "1ère AS Sciences 1", section: "Tronc Commun", createdAt: new Date() },
  { id: 2, className: "2ème AS Gestion", section: "Gestion & Economie", createdAt: new Date() },
  { id: 3, className: "3ème AS Math", section: "Mathématiques", createdAt: new Date() },
];

export const MOCK_FINANCE = {
  revenues: [
    { id: 1, title: "Frais Scolarité Janvier", amount: 45000, dateReceived: new Date() },
    { id: 2, title: "Vente Uniformes", amount: 12000, dateReceived: new Date() },
  ],
  expenses: [
    { id: 1, reference: "LOY-001", amount: 25000, dateExpense: new Date() },
    { id: 2, reference: "EAU-2024", amount: 3500, dateExpense: new Date() },
  ]
};
