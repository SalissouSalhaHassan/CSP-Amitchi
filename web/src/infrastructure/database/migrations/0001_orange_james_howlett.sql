CREATE TABLE "academic_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"period_type" varchar(50) NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"session_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grading_appreciations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"base_score" double precision DEFAULT 0,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "grading_appreciations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "school_remarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(50) NOT NULL,
	"content" varchar(100) NOT NULL,
	"score" double precision DEFAULT 0,
	"is_checked" boolean DEFAULT false,
	"section_id" integer,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"subject_id" integer,
	"class_id" integer,
	"session_id" integer,
	"term" varchar(50) NOT NULL,
	"class_work_score" double precision DEFAULT 0,
	"exam_score" double precision DEFAULT 0,
	"total_score" double precision DEFAULT 0,
	"coefficient" integer DEFAULT 1,
	"weighted_score" double precision DEFAULT 0,
	"devoir1" double precision,
	"devoir2" double precision,
	"devoir3" double precision,
	"devoir4" double precision,
	"devoir5" double precision,
	"moyenne_devoirs" double precision DEFAULT 0,
	"absences" integer DEFAULT 0,
	"observation" text,
	"appreciation" varchar(100),
	"rank" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_term_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"class_id" integer,
	"session_id" integer,
	"term" varchar(50) NOT NULL,
	"conduite" double precision DEFAULT 0,
	"travail" varchar(100),
	"tableau_honneur" boolean DEFAULT false,
	"assiduite" varchar(100),
	"observation" text,
	"average" double precision DEFAULT 0,
	"rank" varchar(20),
	"decision" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teacher_constraints" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"off_days" text,
	"max_periods_per_day" integer DEFAULT 5,
	"force_consecutive" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_name" varchar(100) NOT NULL,
	"year_established" varchar(10),
	"registration_no" varchar(50),
	"branch_alias" varchar(50),
	"inst_type" varchar(50) DEFAULT 'School',
	"inst_category" varchar(50),
	"email" varchar(100),
	"alt_email" varchar(100),
	"contact_no" varchar(50),
	"office_no" varchar(50),
	"timezone" varchar(50),
	"address" text,
	"adm_prefix" varchar(10),
	"adm_padding" varchar(10),
	"smtp_url" varchar(100),
	"smtp_port" varchar(10),
	"smtp_email" varchar(100),
	"smtp_password" varchar(100),
	"logo_path" varchar(255),
	"working_days" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "photo_path" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD COLUMN "credits" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD COLUMN "semester" varchar(50);--> statement-breakpoint
ALTER TABLE "school_sections" ADD COLUMN "series" varchar(50);--> statement-breakpoint
ALTER TABLE "school_sections" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "school_sections" ADD COLUMN "num_terms" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "school_sections" ADD COLUMN "min_passing_grade" double precision DEFAULT 10;--> statement-breakpoint
ALTER TABLE "school_sections" ADD COLUMN "redoublement_threshold" double precision DEFAULT 8;--> statement-breakpoint
ALTER TABLE "school_sections" ADD COLUMN "exclusion_threshold" double precision DEFAULT 5;--> statement-breakpoint
ALTER TABLE "school_sections" ADD COLUMN "term_labels" varchar(255);--> statement-breakpoint
ALTER TABLE "school_sessions" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "school_sessions" ADD COLUMN "end_date" timestamp;--> statement-breakpoint
ALTER TABLE "school_sessions" ADD COLUMN "status" varchar(20) DEFAULT 'Actif';--> statement-breakpoint
ALTER TABLE "fee_payments" ADD COLUMN "reduction" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD COLUMN "month_concerned" varchar(50);--> statement-breakpoint
ALTER TABLE "student_fees" ADD COLUMN "total_reduction" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "frais_transport" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "frais_cantine" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "frais_assurance" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "bourse" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "frequence_paiement" varchar(100);--> statement-breakpoint
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_session_id_school_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."school_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_remarks" ADD CONSTRAINT "school_remarks_section_id_school_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."school_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_results" ADD CONSTRAINT "student_results_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_results" ADD CONSTRAINT "student_results_subject_id_school_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."school_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_results" ADD CONSTRAINT "student_results_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_results" ADD CONSTRAINT "student_results_session_id_school_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."school_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_term_summaries" ADD CONSTRAINT "student_term_summaries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_term_summaries" ADD CONSTRAINT "student_term_summaries_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_term_summaries" ADD CONSTRAINT "student_term_summaries_session_id_school_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."school_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_constraints" ADD CONSTRAINT "teacher_constraints_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_student_idx" ON "student_attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_class_idx" ON "student_attendance" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "student_attendance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "attendance_subject_idx" ON "student_attendance" USING btree ("subject_id");