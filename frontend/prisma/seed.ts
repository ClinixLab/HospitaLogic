// prisma/seed.ts
import { prisma } from "@/lib/db";

const DOCTOR_HASH_1234 =
  "$2b$10$0SKpzXuX8rl8sF85JTyMFO9JgcpBHbdDPRr5eCTVj.kBt7d0cnka2";

async function main() {
  console.log("🌱 Seeding database...");

  // ---------- Department ----------
  await prisma.$executeRawUnsafe(`
    INSERT INTO Department (department_id, name, location) VALUES
    (1,'Cardiology','Building A • 2nd Floor'),
    (2,'Internal Medicine','Building A • 3rd Floor'),
    (3,'Pediatrics','Building B • 3rd Floor'),
    (4,'Orthopedics','Building C • 2nd Floor'),
    (5,'Neurology','Building A • 4th Floor'),
    (6,'Dermatology','Building B • 2nd Floor'),
    (7,'ENT','Building B • 4th Floor'),
    (8,'Ophthalmology','Building C • 3rd Floor'),
    (9,'Obstetrics & Gynecology','Building D • 2nd Floor'),
    (10,'Psychiatry','Building D • 3rd Floor'),
    (11,'General Surgery','Building C • 4th Floor'),
    (12,'Emergency Medicine','ER • Ground Floor')
    ON DUPLICATE KEY UPDATE name = VALUES(name), location = VALUES(location);
  `);

  // ---------- Specialty (1..42) ----------
  await prisma.$executeRawUnsafe(`
    INSERT INTO Specialty (specialty_id, name, description, department_id) VALUES
    (1,'Cardiologist','Heart and cardiovascular specialist',1),
    (2,'Interventional Cardiologist','Cardiac catheterization and stent procedures',1),
    (3,'Electrophysiologist','Heart rhythm disorders specialist',1),

    (4,'Internist','General adult medicine specialist',2),
    (5,'Endocrinologist','Diabetes, thyroid, hormonal disorders',2),
    (6,'Gastroenterologist','Digestive system and liver diseases',2),
    (7,'Nephrologist','Kidney diseases specialist',2),
    (8,'Pulmonologist','Lung and respiratory diseases specialist',2),
    (9,'Rheumatologist','Autoimmune and joint-related disorders',2),
    (10,'Hematologist','Blood disorders specialist',2),
    (11,'Infectious Disease Specialist','Complex infections and antibiotics',2),

    (12,'Pediatrician','Child health specialist',3),
    (13,'Pediatric Cardiologist','Child heart diseases specialist',3),
    (14,'Pediatric Endocrinologist','Child hormonal and growth disorders',3),

    (15,'Orthopedic Surgeon','Bone, joint, and musculoskeletal surgery',4),
    (16,'Sports Medicine','Sports injuries and rehabilitation',4),
    (17,'Spine Specialist','Back and spine disorders specialist',4),

    (18,'Neurologist','Brain, nerve, and stroke specialist',5),
    (19,'Epileptologist','Seizure and epilepsy specialist',5),

    (20,'Dermatologist','Skin, hair, and nail diseases specialist',6),
    (21,'Dermatologic Surgeon','Minor skin procedures and excisions',6),
    (22,'Allergy & Immunology','Allergy testing and immune disorders',6),

    (23,'Otolaryngologist (ENT)','Ear, nose, throat specialist',7),
    (24,'Audiologist','Hearing assessment and management',7),

    (25,'Ophthalmologist','Eye diseases and vision specialist',8),
    (26,'Retina Specialist','Retina diseases and diabetic retinopathy',8),

    (27,'Obstetrician','Pregnancy and childbirth specialist',9),
    (28,'Gynecologist','Women reproductive health specialist',9),
    (29,'Reproductive Endocrinologist','Fertility and IVF specialist',9),

    (30,'Psychiatrist','Mental health diagnosis and medication',10),
    (31,'Child & Adolescent Psychiatrist','Mental health for children/teens',10),

    (32,'General Surgeon','General abdominal and soft tissue surgery',11),
    (33,'Colorectal Surgeon','Colon and rectal surgery specialist',11),
    (34,'Vascular Surgeon','Blood vessel surgery specialist',11),

    (35,'Emergency Physician','Acute and emergency care specialist',12),
    (36,'Trauma Specialist','Severe injury and trauma care',12),

    (37,'Family Medicine','Primary care for all ages',2),
    (38,'Geriatric Medicine','Elderly care specialist',2),
    (39,'Pain Management','Chronic pain treatment and management',2),

    (40,'Physical Medicine & Rehab','Rehabilitation and functional recovery',4),

    (41,'Nutritionist','Diet and nutrition counseling',2),
    (42,'Sleep Medicine','Sleep apnea and sleep disorders',2)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = VALUES(description),
      department_id = VALUES(department_id);
  `);

  // ---------- Diagnosis (70) ----------
  await prisma.$executeRawUnsafe(`
    INSERT INTO Diagnosis (diagnosis_id, code, description) VALUES
    (1,'I10','Essential (primary) hypertension'),
    (2,'E11','Type 2 diabetes mellitus'),
    (3,'E78.5','Hyperlipidemia, unspecified'),
    (4,'I20.9','Angina pectoris, unspecified'),
    (5,'I21.9','Acute myocardial infarction, unspecified'),
    (6,'I50.9','Heart failure, unspecified'),
    (7,'I48.91','Atrial fibrillation, unspecified'),
    (8,'R07.9','Chest pain, unspecified'),
    (9,'J45.909','Asthma, unspecified'),
    (10,'J44.9','Chronic obstructive pulmonary disease, unspecified'),
    (11,'J06.9','Acute upper respiratory infection, unspecified'),
    (12,'J18.9','Pneumonia, unspecified organism'),
    (13,'U07.1','COVID-19, virus identified'),
    (14,'K21.9','Gastro-esophageal reflux disease without esophagitis'),
    (15,'K29.70','Gastritis, unspecified, without bleeding'),
    (16,'K52.9','Noninfective gastroenteritis and colitis, unspecified'),
    (17,'K80.20','Calculus of gallbladder without cholecystitis'),
    (18,'K76.0','Fatty (change of) liver, not elsewhere classified'),
    (19,'N18.9','Chronic kidney disease, unspecified'),
    (20,'N39.0','Urinary tract infection, site not specified'),
    (21,'R51.9','Headache, unspecified'),
    (22,'G43.909','Migraine, unspecified'),
    (23,'G40.909','Epilepsy, unspecified, not intractable'),
    (24,'I63.9','Cerebral infarction, unspecified'),
    (25,'F41.9','Anxiety disorder, unspecified'),
    (26,'F32.9','Major depressive disorder, single episode, unspecified'),
    (27,'F43.10','Post-traumatic stress disorder, unspecified'),
    (28,'M54.5','Low back pain'),
    (29,'M17.9','Osteoarthritis of knee, unspecified'),
    (30,'M10.9','Gout, unspecified'),
    (31,'M79.1','Myalgia'),
    (32,'S93.4','Sprain of ankle'),
    (33,'S52.5','Fracture of lower end of radius'),
    (34,'L20.9','Atopic dermatitis, unspecified'),
    (35,'L70.0','Acne vulgaris'),
    (36,'L03.90','Cellulitis, unspecified'),
    (37,'B35.4','Tinea corporis'),
    (38,'H10.9','Conjunctivitis, unspecified'),
    (39,'H52.4','Presbyopia'),
    (40,'H81.1','Benign paroxysmal vertigo'),
    (41,'H66.90','Otitis media, unspecified'),
    (42,'J02.9','Acute pharyngitis, unspecified'),
    (43,'J03.90','Acute tonsillitis, unspecified'),
    (44,'N92.6','Irregular menstruation, unspecified'),
    (45,'O21.9','Vomiting of pregnancy, unspecified'),
    (46,'O80','Single spontaneous delivery'),
    (47,'R10.9','Unspecified abdominal pain'),
    (48,'R11.2','Nausea with vomiting, unspecified'),
    (49,'R50.9','Fever, unspecified'),
    (50,'A09','Infectious gastroenteritis and colitis, unspecified'),
    (51,'A04.7','Enterocolitis due to Clostridium difficile'),
    (52,'B34.9','Viral infection, unspecified'),
    (53,'Z00.0','General medical examination'),
    (54,'Z01.89','Other specified special examinations'),
    (55,'E03.9','Hypothyroidism, unspecified'),
    (56,'E05.90','Hyperthyroidism, unspecified'),
    (57,'D50.9','Iron deficiency anemia, unspecified'),
    (58,'D64.9','Anemia, unspecified'),
    (59,'R42','Dizziness and giddiness'),
    (60,'R06.02','Shortness of breath'),
    (61,'K59.0','Constipation'),
    (62,'K58.9','Irritable bowel syndrome without diarrhea'),
    (63,'N20.0','Calculus of kidney'),
    (64,'R35.0','Frequency of micturition'),
    (65,'T78.40','Allergy, unspecified'),
    (66,'S09.90','Unspecified injury of head'),
    (67,'S61.0','Open wound of finger(s)'),
    (68,'T14.90','Injury, unspecified'),
    (69,'Z20.828','Contact with and suspected exposure to other viral communicable diseases'),
    (70,'R53.83','Other fatigue')
    ON DUPLICATE KEY UPDATE
      code = VALUES(code),
      description = VALUES(description);
  `);

  // ---------- Medicine (50) ----------
  await prisma.$executeRawUnsafe(`
    INSERT INTO Medicine (medicine_id, name, quantity, price) VALUES
    (1,'Paracetamol 500mg',500,2.00),
    (2,'Ibuprofen 400mg',300,3.50),
    (3,'Diclofenac 25mg',250,4.00),
    (4,'Naproxen 250mg',180,6.00),
    (5,'Aspirin 81mg',400,1.50),

    (6,'Cetirizine 10mg',350,3.00),
    (7,'Loratadine 10mg',280,3.50),
    (8,'Chlorpheniramine 4mg',300,2.00),
    (9,'Fexofenadine 180mg',200,8.00),

    (10,'Omeprazole 20mg',260,7.00),
    (11,'Pantoprazole 40mg',220,9.00),
    (12,'Famotidine 20mg',180,6.50),
    (13,'Antacid (AlOH+MgOH)',200,5.00),

    (14,'Amoxicillin 500mg',240,8.00),
    (15,'Amoxicillin/Clavulanate 875/125mg',160,18.00),
    (16,'Azithromycin 500mg',140,22.00),
    (17,'Doxycycline 100mg',180,10.00),
    (18,'Cephalexin 500mg',170,12.00),
    (19,'Ciprofloxacin 500mg',120,18.00),
    (20,'Metronidazole 400mg',200,8.50),

    (21,'Salbutamol inhaler 100mcg',80,120.00),
    (22,'Budesonide inhaler 200mcg',60,220.00),
    (23,'Dextromethorphan syrup',120,35.00),
    (24,'Guaifenesin syrup',110,38.00),

    (25,'Prednisolone 5mg',150,6.00),
    (26,'Hydrocortisone cream 1%',90,45.00),
    (27,'Mupirocin ointment 2%',70,85.00),
    (28,'Clotrimazole cream 1%',100,40.00),

    (29,'Amlodipine 5mg',220,6.50),
    (30,'Losartan 50mg',200,9.00),
    (31,'Enalapril 5mg',200,5.50),
    (32,'Hydrochlorothiazide 25mg',180,4.50),
    (33,'Metoprolol 50mg',160,7.50),

    (34,'Simvastatin 20mg',200,7.00),
    (35,'Atorvastatin 20mg',180,12.00),

    (36,'Metformin 500mg',260,4.00),
    (37,'Gliclazide MR 30mg',160,10.00),
    (38,'Insulin (regular) 10mL',40,250.00),

    (39,'Ondansetron 4mg',120,15.00),
    (40,'Domperidone 10mg',160,6.00),
    (41,'Loperamide 2mg',200,4.00),
    (42,'ORS (oral rehydration salts)',250,8.00),

    (43,'Vitamin C 500mg',300,3.00),
    (44,'Vitamin B complex',220,5.00),
    (45,'Folic acid 5mg',150,4.00),
    (46,'Ferrous fumarate',180,6.00),

    (47,'Diazepam 5mg',80,12.00),
    (48,'Sertraline 50mg',120,18.00),
    (49,'Amitriptyline 10mg',120,10.00),

    (50,'Normal saline 0.9% 1000mL',60,55.00)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      quantity = VALUES(quantity),
      price = VALUES(price);
  `);

  // =========================================================
  // ✅ DOCTOR ACCOUNTS: 1 doctor per specialty (1..42)
  //    - password: 1234 (hash above)
  //    - doctor_id = login.user_id
  //    - department_id derived from Specialty.department_id
  // =========================================================

  const specs = await prisma.specialty.findMany({
    select: { specialty_id: true, department_id: true, name: true },
    orderBy: { specialty_id: "asc" },
  });

  // สร้าง Login + Doctor ทีละ spec (ใช้ upsert ปลอดภัยกว่า raw)
  for (const s of specs) {
    const sid = s.specialty_id;
    const did = s.department_id ?? 2;

    // UUID แบบคงที่ เดาได้ (ง่ายต่อการ debug)
    // 90000000-0000-4000-8000-0000000000XX (XX = specialty_id แบบ 2 หลัก)
    const suffix = String(sid).padStart(2, "0");
    const user_id = `90000000-0000-4000-8000-0000000000${suffix}`;
    const username = `doctor_spec${suffix}`;

    await prisma.login.upsert({
      where: { user_id },
      update: { username, hashed_password: DOCTOR_HASH_1234, role: "DOCTOR" },
      create: { user_id, username, hashed_password: DOCTOR_HASH_1234, role: "DOCTOR" },
    });

    await prisma.doctor.upsert({
      where: { doctor_id: user_id },
      update: {
        name: `Dr. ${s.name} (${suffix})`,
        phone: `080-7${suffix}-00${suffix}`,
        department_id: did,
        specialty_id: sid,
      },
      create: {
        doctor_id: user_id,
        name: `Dr. ${s.name} (${suffix})`,
        phone: `080-7${suffix}-00${suffix}`,
        department_id: did,
        specialty_id: sid,
      },
    });
  }

  console.log(`✅ Seeded doctors: ${specs.length} (1 per specialty)`);
  console.log("✅ Seeding completed");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
