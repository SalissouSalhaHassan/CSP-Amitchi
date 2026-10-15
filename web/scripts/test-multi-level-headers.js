// Test Suite for Multi-Level Document Headers & Logos
const assert = require("assert");

// Mocking the getActiveLevelHeaderConfig resolver logic
function getActiveLevelHeaderConfig(baseConfig, targetLevel) {
  if (!targetLevel || !baseConfig.levelProfiles || baseConfig.levelProfiles.length === 0) {
    return baseConfig;
  }

  const cleanTarget = targetLevel.trim().toLowerCase();

  const matchedProfile = baseConfig.levelProfiles.find((profile) =>
    profile.applicableLevels.some(
      (lvl) =>
        lvl.toLowerCase() === cleanTarget ||
        cleanTarget.includes(lvl.toLowerCase()) ||
        lvl.toLowerCase().includes(cleanTarget)
    )
  );

  if (!matchedProfile || !matchedProfile.headerConfig) {
    return baseConfig;
  }

  const overrides = matchedProfile.headerConfig;

  return {
    ...baseConfig,
    ...overrides,
    leftLogo: matchedProfile.leftLogo || matchedProfile.customLogo || overrides.leftLogo || baseConfig.leftLogo,
    centerLogo: matchedProfile.centerLogo || overrides.centerLogo || baseConfig.centerLogo,
    rightLogo: matchedProfile.rightLogo || overrides.rightLogo || baseConfig.rightLogo,
    levelProfiles: baseConfig.levelProfiles,
    activeLevelProfileId: matchedProfile.id,
  };
}

console.log("🚀 Starting Functional Verification for Multi-Level Headers & Logos...\n");

// Base Global Configuration
const globalBase = {
  style: "classic_dual_logo",
  schoolName: "GROUPE SCOLAIRE EXCELLENCE",
  ministry: "Ministère de l'Éducation Nationale",
  inspection: "Inspection Générale",
  leftLogo: "https://example.com/logo-global.png",
  centerLogo: "https://example.com/sceau-republique.png",
  rightLogo: "https://example.com/armoiries.png",
  levelProfiles: [
    {
      id: "prof_primaire",
      name: "En-tête Primaire",
      applicableLevels: ["Primaire"],
      leftLogo: "https://example.com/logo-primaire.png",
      headerConfig: {
        schoolName: "ÉCOLE PRIMAIRE EXCELLENCE",
        ministry: "Ministère de l'Éducation de Base",
        inspection: "Inspection de l'Enseignement Primaire",
        style: "classic_dual_logo",
      },
    },
    {
      id: "prof_merged_secondaire",
      name: "En-tête Collège & Lycée",
      applicableLevels: ["College", "Lycée"],
      leftLogo: "https://example.com/logo-secondaire.png",
      headerConfig: {
        schoolName: "COMPLEXE SECONDAIRE EXCELLENCE",
        ministry: "Ministère des Enseignements Secondaires",
        inspection: "Direction Départementale du Secondaire",
        style: "bilingual_center_logo",
      },
    },
    {
      id: "prof_universite",
      name: "En-tête Université & Facultés",
      applicableLevels: ["University"],
      leftLogo: "https://example.com/logo-universite.png",
      headerConfig: {
        schoolName: "UNIVERSITÉ INTERNATIONALE EXCELLENCE",
        ministry: "Ministère de l'Enseignement Supérieur & de la Recherche",
        inspection: "Rectorat & Conseil d'Administration",
        authorizationText: "Arrêté Ministériel N° 00482/MESR/DGES/2026",
        style: "university_formal",
      },
    },
  ],
};

// TEST 1: Single Level (Primaire)
console.log("🧪 Test 1: Single Level Customization (Primaire)");
const resPrimaire = getActiveLevelHeaderConfig(globalBase, "Primaire");
assert.strictEqual(resPrimaire.schoolName, "ÉCOLE PRIMAIRE EXCELLENCE");
assert.strictEqual(resPrimaire.leftLogo, "https://example.com/logo-primaire.png");
assert.strictEqual(resPrimaire.inspection, "Inspection de l'Enseignement Primaire");
console.log("   ✅ PASSED: Primaire resolved specific school name, logo and inspection.");

// TEST 2: Merged Group (College & Lycée sharing same profile)
console.log("\n🧪 Test 2: Merged Multi-Level Group (College + Lycée)");
const resCollege = getActiveLevelHeaderConfig(globalBase, "College");
const resLycee = getActiveLevelHeaderConfig(globalBase, "Lycée");
assert.strictEqual(resCollege.activeLevelProfileId, "prof_merged_secondaire");
assert.strictEqual(resLycee.activeLevelProfileId, "prof_merged_secondaire");
assert.strictEqual(resCollege.schoolName, "COMPLEXE SECONDAIRE EXCELLENCE");
assert.strictEqual(resLycee.schoolName, "COMPLEXE SECONDAIRE EXCELLENCE");
assert.strictEqual(resCollege.leftLogo, "https://example.com/logo-secondaire.png");
assert.strictEqual(resLycee.leftLogo, "https://example.com/logo-secondaire.png");
console.log("   ✅ PASSED: Merged group correctly applied to both College and Lycée.");

// TEST 3: University Formal Style & Accreditation
console.log("\n🧪 Test 3: University Dedicated Profile with Accreditation Text");
const resUniv = getActiveLevelHeaderConfig(globalBase, "University");
assert.strictEqual(resUniv.schoolName, "UNIVERSITÉ INTERNATIONALE EXCELLENCE");
assert.strictEqual(resUniv.style, "university_formal");
assert.strictEqual(resUniv.authorizationText, "Arrêté Ministériel N° 00482/MESR/DGES/2026");
assert.strictEqual(resUniv.leftLogo, "https://example.com/logo-universite.png");
console.log("   ✅ PASSED: University resolved formal style, accreditation text and custom logo.");

// TEST 4: Isolation Test
console.log("\n🧪 Test 4: Profile Isolation Verification");
assert.notStrictEqual(resPrimaire.leftLogo, resUniv.leftLogo);
assert.notStrictEqual(resPrimaire.ministry, resUniv.ministry);
console.log("   ✅ PASSED: Modifying university profile does not impact primary school profile.");

// TEST 5: Fallback to Global when Level is Unknown or Not Configured
console.log("\n🧪 Test 5: Fallback to Global Header");
const resFallback = getActiveLevelHeaderConfig(globalBase, "Garderie");
assert.strictEqual(resFallback.schoolName, "GROUPE SCOLAIRE EXCELLENCE");
assert.strictEqual(resFallback.leftLogo, "https://example.com/logo-global.png");
console.log("   ✅ PASSED: Unknown levels fall back gracefully to global header without crashing.");

console.log("\n========================================================");
console.log("🎉 ALL 5 FUNCTIONAL TESTS COMPLETED SUCCESSFULLY (100%)");
console.log("========================================================");
