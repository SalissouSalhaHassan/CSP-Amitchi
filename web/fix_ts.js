const fs = require('fs');
const path = require('path');

const filesToFix = [
  "src/domains/front-office/components/VisitorDialog.tsx",
  "src/domains/hr/components/EmployeeDialog.tsx",
  "src/domains/inventory/components/InventoryAssignmentDialog.tsx",
  "src/domains/inventory/components/InventoryDialog.tsx",
  "src/domains/library/components/BookDialog.tsx",
  "src/domains/library/components/IssueBookDialog.tsx",
  "src/domains/library/components/ReturnBookDialog.tsx",
  "src/domains/students/components/IncidentDialog.tsx",
  "src/domains/students/components/StudentDialog.tsx"
];

filesToFix.forEach(relPath => {
  const p = path.join(__dirname, relPath);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf-8');
  
  // Replace DialogTrigger render={...} with <div onClick={() => setOpen(true)}>...</div>
  // This is a bit tricky with regex, so we'll do something safe:
  // Usually it looks like: <DialogTrigger render={trigger || (<button ...>...</button>)} />
  content = content.replace(/<DialogTrigger render=\{trigger \|\| \(([\s\S]*?)\)\} \/>/g, 
    '<div onClick={() => setOpen(true)} className="inline-block cursor-pointer">\n        {trigger || (\n$1\n        )}\n      </div>');
    
  // Fix setStudents(res.data) => setStudents(res.data as any)
  content = content.replace(/setStudents\(res\.data\)/g, 'setStudents(res.data as any)');
  content = content.replace(/setEmployees\(res\.data\)/g, 'setEmployees(res.data as any)');
  content = content.replace(/setInventoryItems\(res\.data\)/g, 'setInventoryItems(res.data as any)');
  content = content.replace(/setBooks\(res\.data\)/g, 'setBooks(res.data as any)');
  content = content.replace(/setClasses\(res\.data\)/g, 'setClasses(res.data as any)');

  // Fix wrong imports in InventoryDialog
  content = content.replace(/import \{ createInventoryItem, updateInventoryItem \} from/g, 'import { saveInventoryItem } from');
  content = content.replace(/result = await updateInventoryItem\(initialData.id, data\)/g, 'result = await saveInventoryItem(data, initialData.id)');
  content = content.replace(/result = await createInventoryItem\(data\)/g, 'result = await saveInventoryItem(data)');
  
  // Fix wrong import in InventoryAssignmentDialog
  content = content.replace(/assignInventoryItem/g, 'saveInventoryAssignment');

  fs.writeFileSync(p, content, 'utf-8');
  console.log('Fixed', relPath);
});
