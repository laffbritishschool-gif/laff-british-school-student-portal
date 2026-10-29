# Laff British Montessori School — Student Portal

A responsive student portal for Laff British Montessori School, using registration-number login and school-issued passwords.

## Included pages
- Dashboard
- Student Login
- My Profile
- Results
- Attendance
- Timetable
- Announcements / Notifications
- Fees & Payments
- Digital Student ID Card

Assignments are intentionally excluded for now.

## Design
- Official school crest/logo
- Blue and yellow school branding
- Responsive desktop/mobile layout
- Collapsible sidebar on desktop and mobile
- Animated cards, hover states and notification feedback
- Authenticated student data from the school's database
- Digital ID card preview

## Production integration
The login page sends a student's registration number and school-issued password to the `student-login` server function, then stores the returned authenticated session. Student pages load records using the authenticated user's linked student record and row-level security. Student login accounts must be provisioned by an administrator; a student record by itself is not an authentication account. Privileged account creation and payment verification must remain server-side.

Never put Supabase service-role keys or other server secrets in browser code.
