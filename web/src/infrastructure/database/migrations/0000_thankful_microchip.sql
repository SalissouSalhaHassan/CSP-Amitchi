CREATE TABLE "class_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer,
	"subject_id" integer,
	"employee_id" integer,
	"coefficient" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "exam_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer,
	"student_id" integer,
	"marks_obtained" double precision,
	"remarks" text,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_name" varchar(200) NOT NULL,
	"class_id" integer,
	"subject_id" integer,
	"exam_date" timestamp,
	"max_marks" double precision DEFAULT 20,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_name" varchar(100) NOT NULL,
	"section_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_name" varchar(100) NOT NULL,
	"educational_level" varchar(50) DEFAULT 'Lycée',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_name" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "school_sessions_session_name_unique" UNIQUE("session_name")
);
--> statement-breakpoint
CREATE TABLE "school_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_name" varchar(100) NOT NULL,
	"subject_code" varchar(50),
	"category" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "section_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer,
	"subject_id" integer,
	"term" varchar(50),
	"default_coef" integer DEFAULT 1,
	"credits" double precision DEFAULT 0,
	"is_eliminatory" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"class_id" integer,
	"subject_id" integer,
	"employee_id" integer,
	"date" timestamp DEFAULT now(),
	"status" varchar(50) DEFAULT 'Présent' NOT NULL,
	"remark" text,
	"recorded_by" varchar(255) DEFAULT 'Admin'
);
--> statement-breakpoint
CREATE TABLE "login_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"username" varchar(50),
	"action" varchar(20),
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" serial NOT NULL,
	"module_name" varchar(50),
	"can_view" boolean DEFAULT true,
	"can_edit" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_name" varchar(50) NOT NULL,
	"description" varchar(200),
	CONSTRAINT "roles_role_name_unique" UNIQUE("role_name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"utilisateur" varchar(50) NOT NULL,
	"nom_prenom" varchar(100),
	"mot_de_passe" text NOT NULL,
	"admin" boolean DEFAULT false,
	"langue" varchar(2) DEFAULT 'FR',
	"role_id" serial NOT NULL,
	"emplacement" varchar(100),
	"depots" text,
	"educational_level" varchar(50) DEFAULT 'Primaire',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_utilisateur_unique" UNIQUE("utilisateur")
);
--> statement-breakpoint
CREATE TABLE "canteen_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"price" double precision NOT NULL,
	"category" varchar(50),
	"stock" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canteen_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"amount" double precision NOT NULL,
	"items_desc" text,
	"transaction_date" timestamp DEFAULT now(),
	"recorded_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "student_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"balance" double precision DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "student_wallets_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "discipline_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"date" timestamp DEFAULT now(),
	"incident_type" varchar(255) NOT NULL,
	"severity" varchar(50) DEFAULT 'Mineur' NOT NULL,
	"description" text,
	"proposed_action" varchar(255),
	"status" varchar(50) DEFAULT 'En attente' NOT NULL,
	"created_by" varchar(255) DEFAULT 'Admin'
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(200),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(50) NOT NULL,
	"category_id" integer,
	"amount" double precision NOT NULL,
	"date_expense" timestamp NOT NULL,
	"payment_mode" varchar(50),
	"status" varchar(20) DEFAULT 'Non Payé',
	"description" text,
	"attachment_path" varchar(255),
	"recorded_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "expenses_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"fee_id" integer,
	"amount" double precision NOT NULL,
	"date_paid" timestamp DEFAULT now(),
	"payment_mode" varchar(50) DEFAULT 'Espèces',
	"reference" varchar(100),
	"recorded_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "pos_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"total_amount" double precision NOT NULL,
	"payment_method" varchar(50),
	"status" varchar(20) DEFAULT 'Completed',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pos_sales_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "revenue_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(200),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "revenue_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "revenues" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(50) NOT NULL,
	"category_id" integer,
	"title" varchar(200),
	"amount" double precision NOT NULL,
	"date_received" timestamp NOT NULL,
	"payment_mode" varchar(50),
	"status" varchar(20) DEFAULT 'Reçu',
	"description" text,
	"recorded_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "revenues_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "student_fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"session_id" integer,
	"total_expected" double precision NOT NULL,
	"total_paid" double precision DEFAULT 0,
	"balance" double precision NOT NULL,
	"status" varchar(20) DEFAULT 'Impayé',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admission_enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"child_name" varchar(255),
	"class_requested" varchar(100),
	"source" varchar(100),
	"date" timestamp DEFAULT now(),
	"follow_up_date" varchar(50),
	"status" varchar(50) DEFAULT 'En Attente'
);
--> statement-breakpoint
CREATE TABLE "postal_dispatch" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_type" varchar(20) NOT NULL,
	"reference_no" varchar(100),
	"sender_receiver" varchar(255) NOT NULL,
	"address" text,
	"date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"purpose" varchar(255) NOT NULL,
	"meeting_with" varchar(255),
	"time_in" varchar(10) NOT NULL,
	"time_out" varchar(10),
	"date" timestamp DEFAULT now(),
	"note" text
);
--> statement-breakpoint
CREATE TABLE "homework" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"class_id" integer,
	"subject_id" integer,
	"date_assigned" timestamp DEFAULT now(),
	"date_due" timestamp NOT NULL,
	"attachment_path" varchar(500),
	"created_by" varchar(255) DEFAULT 'Admin'
);
--> statement-breakpoint
CREATE TABLE "hostel_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"room_id" integer,
	"join_date" timestamp DEFAULT now(),
	"leave_date" timestamp,
	"status" varchar(20) DEFAULT 'Occupé'
);
--> statement-breakpoint
CREATE TABLE "hostel_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_number" varchar(50) NOT NULL,
	"building_name" varchar(255) NOT NULL,
	"room_type" varchar(50) DEFAULT 'Mixte',
	"capacity" integer NOT NULL,
	"occupied_beds" integer DEFAULT 0,
	"cost" double precision DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" serial NOT NULL,
	"date" timestamp DEFAULT now(),
	"period_number" integer,
	"status" varchar(20),
	"heure_entree" varchar(20),
	"heure_sortie" varchar(20),
	"remarques" text
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" varchar(50) NOT NULL,
	"nom" varchar(100) NOT NULL,
	"poste" varchar(100),
	"departement" varchar(100),
	"mobile" varchar(20),
	"email" varchar(100),
	"date_embauche" varchar(20),
	"salaire_base" double precision DEFAULT 0,
	"sexe" varchar(20),
	"date_naissance" varchar(20),
	"cnic" varchar(50),
	"adresse" text,
	"banque_nom" varchar(100),
	"banque_compte" varchar(100),
	"statut" varchar(20) DEFAULT 'Actif',
	"photo_path" varchar(255),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_emp_id_unique" UNIQUE("emp_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer,
	"employee_id" integer,
	"assigned_qty" integer NOT NULL,
	"assigned_date" timestamp DEFAULT now(),
	"return_date" timestamp,
	"status" varchar(50) DEFAULT 'En possession'
);
--> statement-breakpoint
CREATE TABLE "inventory_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "inventory_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"category_id" integer,
	"quantity" integer DEFAULT 0,
	"unit_price" double precision DEFAULT 0,
	"condition" varchar(50) DEFAULT 'Neuf',
	"location" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "library_books" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(255),
	"isbn" varchar(100),
	"category" varchar(100),
	"total_quantity" integer DEFAULT 1 NOT NULL,
	"available_quantity" integer DEFAULT 1 NOT NULL,
	"shelf_location" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "library_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer,
	"student_id" integer,
	"employee_id" integer,
	"issue_date" timestamp DEFAULT now(),
	"due_date" timestamp NOT NULL,
	"return_date" timestamp,
	"status" varchar(50) DEFAULT 'En cours' NOT NULL,
	"fine_amount" numeric(15, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "lms_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"module" varchar(255),
	"class_id" integer,
	"subject_id" integer,
	"content" text,
	"file_path" text,
	"video_url" text,
	"recorded_by" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lms_virtual_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"class_id" integer,
	"subject_id" integer,
	"session_date" timestamp NOT NULL,
	"duration" integer DEFAULT 45,
	"meeting_url" text NOT NULL,
	"meeting_password" varchar(50),
	"status" varchar(20) DEFAULT 'À venir',
	"recorded_by" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"msg_type" varchar(20) NOT NULL,
	"target_audience" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(50) DEFAULT 'Envoyé',
	"sent_by" varchar(100),
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"msg_type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"metadata" jsonb,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"num_admission" varchar(50) NOT NULL,
	"nom_etudiant" varchar(100) NOT NULL,
	"nom_arabe" varchar(100),
	"sexe" varchar(50),
	"religion" varchar(50),
	"date_naissance" varchar(100),
	"lieu_naissance" varchar(100),
	"cnic" varchar(255),
	"groupe_sanguin" varchar(10),
	"session" varchar(50),
	"educational_level" varchar(100),
	"classe" varchar(100),
	"section" varchar(100),
	"categorie" varchar(50),
	"nom_pere" varchar(100),
	"cnic_pere" varchar(255),
	"mobile" varchar(255),
	"whatsapp" varchar(255),
	"father_qualification" varchar(200),
	"phone_fixe" varchar(100),
	"has_siblings" varchar(50),
	"frais_mensuels" double precision DEFAULT 0,
	"ancien_solde" double precision DEFAULT 0,
	"frais_inscription" double precision DEFAULT 0,
	"statut" varchar(20) DEFAULT 'Actif',
	"behavior_score" double precision DEFAULT 0,
	"photo_path" varchar(255),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "students_num_admission_unique" UNIQUE("num_admission")
);
--> statement-breakpoint
CREATE TABLE "timetable_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_name" varchar(20) NOT NULL,
	"period_number" integer NOT NULL,
	"class_id" integer,
	"subject_id" integer,
	"employee_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timetable_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer,
	"days" jsonb DEFAULT '["Lundi","Mardi","Mercredi","Jeudi","Vendredi"]'::jsonb,
	"periods" integer DEFAULT 6,
	"day_start" varchar(5) DEFAULT '08:00',
	"period_dur" integer DEFAULT 60,
	"recess" integer DEFAULT 3,
	"recess_dur" integer DEFAULT 30,
	"daily_periods" jsonb DEFAULT '{}'::jsonb,
	"hide_saturday" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "timetable_settings_class_id_unique" UNIQUE("class_id")
);
--> statement-breakpoint
CREATE TABLE "transport_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_name" varchar(255) NOT NULL,
	"vehicle_number" varchar(50) NOT NULL,
	"driver_name" varchar(255) NOT NULL,
	"driver_phone" varchar(50),
	"monthly_fee" double precision NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transport_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"route_id" integer,
	"pickup_point" varchar(255),
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"status" varchar(20) DEFAULT 'Actif'
);
--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_school_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."school_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_school_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."school_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_classes" ADD CONSTRAINT "school_classes_section_id_school_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."school_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_subjects" ADD CONSTRAINT "section_subjects_section_id_school_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."school_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_subjects" ADD CONSTRAINT "section_subjects_subject_id_school_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."school_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_subject_id_school_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."school_subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_logs" ADD CONSTRAINT "login_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_transactions" ADD CONSTRAINT "canteen_transactions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_wallets" ADD CONSTRAINT "student_wallets_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_fee_id_student_fees_id_fk" FOREIGN KEY ("fee_id") REFERENCES "public"."student_fees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_category_id_revenue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."revenue_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_session_id_school_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."school_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_subject_id_school_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."school_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_allocations" ADD CONSTRAINT "hostel_allocations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_allocations" ADD CONSTRAINT "hostel_allocations_room_id_hostel_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."hostel_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_attendance" ADD CONSTRAINT "employee_attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_assignments" ADD CONSTRAINT "inventory_assignments_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_assignments" ADD CONSTRAINT "inventory_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_issues" ADD CONSTRAINT "library_issues_book_id_library_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."library_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_issues" ADD CONSTRAINT "library_issues_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_issues" ADD CONSTRAINT "library_issues_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_lessons" ADD CONSTRAINT "lms_lessons_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_lessons" ADD CONSTRAINT "lms_lessons_subject_id_school_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."school_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_virtual_classes" ADD CONSTRAINT "lms_virtual_classes_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_virtual_classes" ADD CONSTRAINT "lms_virtual_classes_subject_id_school_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."school_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_subject_id_school_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."school_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_settings" ADD CONSTRAINT "timetable_settings_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_subscriptions" ADD CONSTRAINT "transport_subscriptions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_subscriptions" ADD CONSTRAINT "transport_subscriptions_route_id_transport_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."transport_routes"("id") ON DELETE cascade ON UPDATE no action;