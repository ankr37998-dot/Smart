# Smart Attendance System: Project Requirements

## 1. Document Purpose

Yeh document Smart Attendance System ka current, code-grounded requirement specification hai. Iska purpose yeh explain karna hai ki system kaun use karta hai, kaun-se workflows support hote hain, data kaise move karta hai, aur application ko run/deploy karne ke liye kya chahiye.

Document implementation se observed behavior par based hai. Jahan behavior incomplete, optional, ya environment-dependent hai, use **constraint/gap** ke roop me mark kiya gaya hai.

## 2. System Overview

Smart ek college attendance management platform hai jo:

- admin ko users, departments, sections, courses, classes aur timetables manage karne deta hai;
- faculty ko class session start karke live QR attendance collect karne deta hai;
- student ko face verification, live QR token aur classroom geofence ke through attendance mark karne deta hai;
- student aur faculty ko attendance, timetable aur reports dikhata hai;
- admin ko analytics, CSV export aur semester promotion tools deta hai;
- attendance data se shortage-risk prediction ke liye Python ML service use karta hai.

## 3. Actors and Permissions

### 3.1 Admin

Admin ko poore academic setup aur administrative data par control hota hai.

Required capabilities:

- login karna;
- faculty aur student accounts create, update, filter aur delete karna;
- student ko do steps me create karna: identity create karna, phir academic details assign karna;
- unassigned students dekhna;
- departments, sections aur courses manage karna;
- classes create aur list karna;
- class-based timetable aur faculty schedule manage karna;
- students ka promotion ya graduation process chalana;
- face registrations dekhna, reset karna, enable/disable karna aur logs dekhna;
- attendance analytics report dekhna aur CSV export karna;
- ML training status dekhna aur attendance shortage model retrain karna.

### 3.2 Faculty

Faculty apni assigned classes aur unke attendance sessions manage karta hai.

Required capabilities:

- login karna;
- apni classes, timetable aur schedule dekhna;
- current/upcoming class identify karna;
- class ke liye attendance session start karna;
- QR token generate karke students ko provide karna;
- active session end karna;
- live attendance/student list dekhna;
- attendance save karna;
- QR problem ke case me add-only manual attendance mark karna;
- date-wise class attendance report dekhna;
- faculty analytics aur profile dekhna.

### 3.3 Student

Student apni academic placement, timetable aur attendance status dekhkar attendance mark karta hai.

Required capabilities:

- login karna;
- apni profile, classes aur timetable dekhna;
- face register/update karna;
- face verification complete karna;
- active class ka QR scan ya token submit karna;
- browser location permission dena;
- valid classroom boundary ke andar attendance mark karna;
- apni daily aur subject-wise attendance dekhna;
- overall attendance aur lowest-attendance subject dekhna;
- shortage-risk prediction request karna.

## 4. Functional Requirements

### FR-001: Authentication and Role Authorization

- System email/password login support kare.
- Password database me hash form me store ho.
- Login response JWT token aur user profile return kare.
- User role `admin`, `faculty`, ya `student` ho.
- Frontend role ke basis par admin, faculty, ya student dashboard par redirect kare.
- Protected API request me valid bearer token required ho.
- Har protected route apna allowed role enforce kare.
- Duplicate email reject ho.
- Invalid credentials ke liye generic unauthorized response mile.
- Server startup par configured default admin account create ho, agar pehle se admin na ho.

### FR-002: User and Academic Master Data Management

- Admin faculty/student accounts create kar sake.
- Student ke liye name, email, password aur optional roll number supported ho.
- Student ka roll number department code, admission year aur serial number se auto-generate ho sake.
- Student identity creation aur academic assignment alag steps me available ho.
- Academic assignment me department, semester aur section set ho.
- Admin user name, email, password aur academic details update kar sake.
- Admin admin account delete na kar sake.
- Admin department, section aur course create/update/delete/list kar sake.
- Course department se associate ho aur class course, faculty, department, semester aur section se associate ho.
- Student status `active`, `graduated`, ya `inactive` support ho.

### FR-003: Class, Timetable and Faculty Schedule

- Admin class create aur list kar sake.
- Admin class-based timetable slots add/delete kar sake.
- Admin faculty-based schedule slots add/delete/save kar sake.
- Student ko uske department, semester aur section ke matching classes/timetable milen.
- Faculty ko assigned class aur saved faculty schedule milen.
- Faculty schedule me day aur slot ke basis par course/class details store hon.
- Faculty dashboard current day ke slots ko active session status ke saath dikha sake.
- Existing class data aur saved faculty schedule ke beech backwards-compatible read behavior preserve ho.

### FR-004: Attendance Session Lifecycle

- Authorized faculty class ke liye attendance session start kar sake.
- Session ke saath class, creator/faculty, creation time, expiry time, active state, QR token aur location store ho.
- Faculty automatic/current-class flow se session start kar sake.
- Active session ke liye QR token available ho.
- Faculty session end kar sake.
- Expired ya inactive session me attendance accept na ho.
- Faculty apne assigned class ke sessions hi access/manage kar sake.
- Faculty session ke enrolled students ki list dekh sake.

### FR-005: Secure Student Attendance Marking

Attendance tabhi successful ho jab yeh sab conditions satisfy hon:

1. Student authenticated ho.
2. Student ka face pehle successfully verify hua ho.
3. Face verification token valid, student-bound aur unexpired ho.
4. QR token valid, active aur unexpired session ka ho.
5. Latitude, longitude aur accuracy available aur numeric hon.
6. Location accuracy accepted limit ke andar ho; current implementation me accuracy `20` se zyada reject hoti hai.
7. Session ke classroom coordinates available hon.
8. Student session ke configured radius ke andar ho; default radius current implementation me `30` meters hai.
9. Duplicate attendance business rule ke according reject/avoid ho.

Failure par user ko specific error mile, jaise face verification required/expired, invalid QR, location permission required, low accuracy, ya classroom se bahar.

### FR-006: Face Registration and Verification

- Student apna face image/base64 payload submit karke registration kar sake.
- Face registration sirf authenticated student apne account ke liye kar sake.
- Face recognition local Python worker ke through process ho.
- Worker se descriptor milne par descriptor MongoDB me persist ho.
- Student existing face registration update kar sake, jab tak admin ne registration disable na kiya ho.
- Verification success par short-lived face verification token issue ho.
- Admin registered/unregistered students dekh sake.
- Admin kisi student ka face reset ya registration disable/enable kar sake.
- Face registration actions ka audit log store ho.
- External face service use nahi ki jaye; configured local worker unavailable ho to clear service error return ho.

### FR-007: Faculty Attendance Operations

- Faculty active session ke students aur present/absent state dekh sake.
- Faculty attendance save kar sake.
- QR failure ke fallback ke roop me manual attendance add-only operation available ho.
- Faculty class/date ke basis par attendance report dekh sake.
- Report me enrolled students, name, roll number aur status aaye.
- Jinke liye record nahi hai, report me default status `absent` dikhaya jaye.
- Faculty sirf apne assigned class ka report dekh sake.

### FR-008: Student Attendance and Dashboard

- Student dashboard overall attendance percentage dikhaye.
- Dashboard subject/class-wise total, present aur percentage dikhaye.
- Lowest attendance subject identify ho.
- Total enrolled classes, attended classes aur remaining classes dikhaye jayen.
- Student attendance date-wise/subject-wise view kar sake.
- Today attendance aur active sessions dekh sake.
- Overall attendance `75%` se kam ho to low-attendance email attempt ki jaye.
- Email failure dashboard response ko fail na kare; error log ho.

### FR-009: Analytics and Export

- Admin aggregated attendance analytics report request kar sake.
- Admin report ko CSV me export kar sake.
- Faculty apni accessible classes ka attendance analytics dekh sake.
- Analytics me department, semester, section, course, date range ya role-based filters support hone chahiye jahan API expose kare.
- Export me sensitive fields, jaise password hash ya face descriptor, kabhi include na hon.

### FR-010: Semester Promotion and Graduation

- Admin promotion se pehle preview dekh sake.
- Admin eligible students ko next academic semester/placement me promote kar sake.
- Admin students ko graduate kar sake.
- Promotion/graduation operation ke baad student academic state aur status consistent rahe.
- Destructive/bulk operation se pehle affected count aur confirmation UI available ho.

### FR-011: Attendance Shortage ML

- Flask ML service attendance percentage aur absent days accept kare.
- `attendance_percentage` `0` se `100` ke beech ho.
- `absent_days` zero ya greater ho.
- Model loaded na ho to prediction `503` return kare.
- Prediction response me binary risk, label (`low`/`high`), high-risk probability, attendance percentage aur absent days aaye.
- Express backend authenticated `/api/ml/predict-shortage` endpoint ke through ML service ko proxy kare.
- Admin ML training status dekh sake.
- Admin force ya auto mode me model retrain trigger kar sake.
- Training MongoDB attendance data se ho.
- Auto-retrain tabhi recommend/run ho jab configured new-record threshold reach ho.
- Model aur training metadata disk par persist hon.
- Training secret configured ho to `/train` endpoint header se protect ho.

### FR-012: Health, Static Frontend and Realtime Transport

- `/api/health` basic API health response de.
- Express frontend static files serve kare.
- Socket.IO authenticated clients ko connect karne de.
- Socket client class room join/leave kar sake.
- WebSocket/polling transport support ho.
- CORS configured frontend origins tak restricted ho.

## 5. Main End-to-End Workflows

### 5.1 Initial Setup Workflow

1. Server environment variables load karta hai.
2. Node backend MongoDB se connect karta hai.
3. Default admin missing ho to create hota hai.
4. Admin departments, sections, courses aur faculty accounts create karta hai.
5. Admin classes aur timetable/faculty schedules configure karta hai.
6. Admin students create karta hai aur unhe academic details assign karta hai.

### 5.2 Faculty Attendance Workflow

1. Faculty login karta hai.
2. Faculty apni current/upcoming class select karta hai.
3. Faculty attendance session start karta hai.
4. System QR token, expiry aur classroom location bind karta hai.
5. Students QR scan karte hain.
6. Faculty live student attendance dekhkar session monitor karta hai.
7. Faculty session end/save karta hai.
8. Later faculty date-wise report dekh sakta hai.

### 5.3 Student Attendance Workflow

1. Student login karta hai.
2. Student pehli baar face register karta hai.
3. Attendance screen par student face verification complete karta hai.
4. Successful verification ke baad short-lived token se QR step unlock hota hai.
5. Student active faculty QR scan/submit karta hai.
6. Browser geolocation permission aur current coordinates submit hote hain.
7. Backend face token, QR session, expiry, accuracy aur geofence validate karta hai.
8. Valid hone par attendance record present ke roop me save hota hai.
9. Dashboard/report updated attendance dikhata hai.

### 5.4 Shortage Risk Workflow

1. Student/faculty/admin prediction request karta hai.
2. Express input validate karke Flask `/predict` ko forward karta hai.
3. Flask loaded Logistic Regression model se prediction karta hai.
4. Response low/high label aur probability ke saath return hota hai.
5. Admin optionally MongoDB se model retrain karta hai.

## 6. API Requirements

Base URL: `/api`

### Public/Authentication

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`

### Admin

- `GET/POST /admin/users`
- `PUT /admin/users/:id`
- `POST /admin/users/delete`
- `POST /admin/students/create-basic`
- `POST /admin/students/assign-academic`
- `GET /admin/students/unassigned`
- `GET/POST /admin/classes`
- `GET/POST/PUT/DELETE /admin/departments`
- `GET/POST/PUT/DELETE /admin/sections`
- `GET/POST/PUT/DELETE /admin/courses`
- `GET /admin/timetable`
- `POST /admin/timetable/slot`
- `POST /admin/timetable/slot/delete`
- `GET /admin/faculty-schedule`
- `POST /admin/faculty-schedule/slot`
- `POST /admin/faculty-schedule/slot/delete`
- `POST /admin/faculty-schedule/save`
- `GET /admin/promote/preview`
- `POST /admin/promote`
- `POST /admin/graduate`
- `GET /admin/analytics/report`
- `GET /admin/analytics/export`
- `GET /admin/face-registrations`
- `DELETE /admin/face-registrations/:studentId`
- `PATCH /admin/face-registrations/:studentId/disable`
- `GET /admin/face-registrations/logs`
- `GET /admin/ml/training-status`
- `POST /admin/ml/retrain`

### Faculty

- `GET /faculty/classes`
- `GET /faculty/timetable`
- `GET /faculty/my-schedule`
- `GET /faculty/current-class`
- `POST /faculty/start-session`
- `POST /faculty/auto-session`
- `POST /faculty/end-session/:sessionId`
- `POST /faculty/save-attendance`
- `GET /faculty/class/:classId/sessions`
- `GET /faculty/class/:classId/attendance-report`
- `GET /faculty/class/:classId/students`
- `POST /faculty/manual-attendance`
- `GET /faculty/session/:sessionId/students`

### Student

- `GET /student/classes`
- `GET /student/dashboard`
- `POST /student/mark-attendance`
- `GET /student/profile`
- `GET /student/timetable`
- `GET /student/attendance`
- `GET /student/active-sessions`
- `GET /student/today-attendance`

### ML/Face

- `POST /ml/register-face`
- `POST /ml/verify-face`
- `POST /ml/recognize-face`
- `GET /ml/face-service/health`
- `POST /ml/predict-shortage`

## 7. Core Data Requirements

The system currently uses MongoDB/Mongoose models for:

- `User`: identity, role, academic placement, roll number, lifecycle status and face metadata;
- `Department`: academic department master data;
- `Section`: section master data;
- `Course`: course code/name and department association;
- `Class`: course offering with faculty, department, semester and section;
- `TimeTable`: class-based timetable slots;
- `FacultySchedule`: faculty day-wise schedule;
- `AttendanceSession`: active/expired session, QR token, expiry and geofence location;
- `AttendanceRecord`: student attendance against a session;
- `FaceVerification`: temporary verification proof/token;
- `FaceRegistrationLog`: face registration/update/reset audit events.

Sensitive data requirements:

- Password plaintext store na ho.
- Password hash API response me expose na ho.
- Face descriptor normal user response/export me expose na ho.
- JWT secret, MongoDB URI, ML secret aur mail credentials source control me commit na hon.
- Logs me password, token, raw face image ya face descriptor print na ho.

## 8. Non-Functional Requirements

### Security

- JWT authentication aur role-based authorization mandatory hai.
- Faculty ko sirf apne classes/sessions access karne chahiye.
- Student ko sirf apna profile, face aur attendance access karna chahiye.
- QR aur face verification tokens short-lived aur one-use/consumable hone chahiye.
- Input validation server side mandatory hai.
- CORS allowlist environment se configure honi chahiye.
- ML training endpoint secret se protect hona chahiye.

### Reliability

- Expired sessions aur invalid location data deterministically reject hon.
- ML service unavailable hone par main attendance APIs silently corrupt na hon.
- Low-attendance email failure attendance dashboard ko block na kare.
- Face worker failure par actionable error return ho.
- Startup MongoDB connection failure par process clear error ke saath stop ho.

### Performance

- Dashboard/report queries filtered aur indexed fields par based hon.
- Attendance session me duplicate records prevent karne ke liye uniqueness strategy honi chahiye.
- ML prediction timeout configured ho.
- Training request ke liye prediction se longer timeout allowed ho.

### Usability

- Role ke hisaab se alag dashboard ho.
- Attendance marking flow me face verification ke bina QR step locked dikhe.
- Expired QR, missing location aur outside geofence errors clearly visible hon.
- Bulk promotion/graduation se pehle preview/confirmation ho.

### Deployment

- Backend Node.js 20 runtime par run ho.
- Docker image me Node, Python, face worker dependencies aur ML dependencies install hon.
- Service `0.0.0.0` par listen kare.
- Production frontend/backend URL environment variables se configure ho.
- MongoDB Atlas ya compatible MongoDB connection available ho.

## 9. Environment and External Dependencies

Required or expected configuration:

- MongoDB connection URI/database name;
- JWT secret and server port;
- frontend URL and allowed CORS origins;
- default admin name/email/password;
- local face Python binary/worker configuration;
- mail SMTP configuration for low-attendance notifications;
- ML prediction URL and optional ML training secret;
- ML model path, shortage threshold and auto-retrain threshold.

Main runtime dependencies:

- Node.js and npm;
- Express, Mongoose, JWT, bcryptjs, Socket.IO, Axios and Nodemailer;
- Python 3;
- face-recognition/dlib worker dependencies;
- Flask, pandas, scikit-learn and joblib for shortage prediction;
- MongoDB.

## 10. Acceptance Criteria

- Admin, faculty aur student valid login ke baad correct dashboard par pahunchte hain.
- Unauthorized role kisi doosre role ke endpoint ko access nahi kar sakta.
- Admin academic setup create karke student ko class placement de sakta hai.
- Faculty valid assigned class ka active QR session create/end kar sakta hai.
- Student face verification ke bina attendance mark nahi kar sakta.
- Invalid/expired QR, poor accuracy aur out-of-radius location reject hoti hai.
- Valid face + QR + location ke baad attendance record exactly ek baar create hota hai.
- Faculty class/date report me present aur absent students correctly milte hain.
- Student dashboard subject-wise aur overall percentages correctly calculate karta hai.
- Admin analytics report aur CSV export kar sakta hai.
- Face registration reset/disable action audit log banata hai.
- ML service valid input par risk response aur invalid input par validation error deta hai.
- Admin training status dekh aur retraining trigger kar sakta hai.
- Docker deployment ke baad health endpoint aur frontend load hote hain.

## 11. Current Constraints and Gaps to Confirm

Yeh points implementation me environment ya follow-up decision par depend karte hain:

- Frontend static pages hain; separate frontend build pipeline nahi hai.
- ML shortage predictor alag Flask process/service ke roop me expected hai, jabki Dockerfile uski dependencies copy karta hai. Production me Flask process separately start karna hai ya separate service rakhni hai, yeh deployment decision explicitly define karna hoga.
- Face recognition local worker par depend karta hai aur dlib build ke liye heavy system dependencies chahiye.
- Default admin credentials deployment secrets se aane chahiye.
- Attendance duplicate prevention, retention period, timezone aur academic year policy ko formalize karna baaki hai.
- Face descriptors aur biometric data ke consent, retention, deletion aur privacy policy ko institution level par approve karna hoga.
- Low-attendance email threshold currently `75%` behavior se tied hai; institution policy se confirm karna hoga.
- ML prediction ko advisory signal maana jaye; final academic action ke liye faculty/admin review required hona chahiye.
