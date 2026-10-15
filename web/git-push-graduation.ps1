#!/usr/bin/env pwsh
# Script pour copier et pousser les fichiers de la plateforme graduation

$srcDir = "C:\tmp\edut-web-check\src\app\dashboard\academics\research-graduation"
$destDir = "C:\Users\User\Desktop\Edut\web\src\app\dashboard\academics\research-graduation"

# 1. Copier GraduationClient.tsx
Copy-Item "$srcDir\GraduationClient.tsx" -Destination "$destDir\GraduationClient.tsx" -Force
Write-Host "✅ GraduationClient.tsx copié" -ForegroundColor Green

# 2. Aller dans le projet web
Set-Location "C:\Users\User\Desktop\Edut\web"

# 3. Stage & commit
git add `
  src/infrastructure/database/schema/academics.ts `
  src/domains/academics/actions/graduation.actions.ts `
  src/app/dashboard/academics/research-graduation/page.tsx `
  src/app/dashboard/academics/research-graduation/GraduationClient.tsx `
  src/app/dashboard/sidebar.tsx

git commit -m "feat: full graduation & research management platform (6 DB tables, 10 KPIs, 7 tabs, digital library, jury evaluation, archiving)"

git push origin main

Write-Host "✅ Push GitHub terminé !" -ForegroundColor Green
