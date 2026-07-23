# DATABASE DOCUMENTATION — SCMS v1.2.0

## Entity Relationship Summary

```
   User (1) ─── (0..1) Student
   User (1) ─── (0..1) Faculty
   User (1) ─── (0..1) UserSettings

   Faculty (1) ─── (0..*) Course (assigned)
   Student (1) ─── (0..*) Enrollment ─── (*) Course
   Student (1) ─── (0..*) Attendance ─── (*) Course
   Student (1) ─── (0..*) Marks      ─── (*) Course
```

---

## Model Specifications

### 1. `User` (`users`)
- `id` (Integer, Primary Key)
- `email` (String(120), Unique, Indexed)
- `password_hash` (String(256))
- `role` (Enum: `admin`, `faculty`, `student`)
- `is_active` (Boolean, default `True`)

### 2. `Student` (`students`)
- `id` (Integer, Primary Key)
- `user_id` (Integer, Foreign Key `users.id` on delete CASCADE, Unique)
- `roll_no` (String(30), Unique, Indexed)
- `full_name` (String(100))
- `dept` (String(50))
- `year` (Integer)
- `section` (String(10))
- `phone` (String(20), Optional)

### 3. `Faculty` (`faculty`)
- `id` (Integer, Primary Key)
- `user_id` (Integer, Foreign Key `users.id` on delete CASCADE, Unique)
- `emp_id` (String(30), Unique, Indexed)
- `full_name` (String(100))
- `dept` (String(50))
- `designation` (String(50))
- `phone` (String(20), Optional)

### 4. `Course` (`courses`)
- `id` (Integer, Primary Key)
- `code` (String(20), Unique, Indexed)
- `name` (String(100))
- `dept` (String(50))
- `semester` (Integer)
- `faculty_id` (Integer, Foreign Key `faculty.id` on delete SET NULL, Optional)

### 5. `Attendance` (`attendance`)
- `id` (Integer, Primary Key)
- `student_id` (Integer, Foreign Key `students.id` on delete CASCADE)
- `course_id` (Integer, Foreign Key `courses.id` on delete CASCADE)
- `date` (Date)
- `status` (Enum: `present`, `absent`, `late`)
- `marked_by` (Integer, Foreign Key `faculty.id` on delete SET NULL)
- **Constraints:** Unique `(student_id, course_id, date)`

### 6. `Marks` (`marks`)
- `id` (Integer, Primary Key)
- `student_id` (Integer, Foreign Key `students.id` on delete CASCADE)
- `course_id` (Integer, Foreign Key `courses.id` on delete CASCADE)
- `internal_1` (Integer, max 20)
- `internal_2` (Integer, max 20)
- `semester_final` (Integer, max 50)
- `practical` (Integer, max 25)
- `academic_year` (String(9))
- **Constraints:** Unique `(student_id, course_id, academic_year)`
